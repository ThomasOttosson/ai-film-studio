import json
import os
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAI
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.routes.projects import accessible_project

router = APIRouter(
    prefix="/api/ai-assistant",
    tags=["AI Assistant"],
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8_000)


class ChatProject(BaseModel):
    name: str = Field(
        default="Untitled Project",
        max_length=200,
    )
    data: dict[str, Any]


class ChatRequest(BaseModel):
    project_id: str
    message: str = Field(
        min_length=1,
        max_length=8_000,
    )
    history: list[ChatMessage] = Field(
        default_factory=list,
    )
    project: ChatProject


class ProjectChangeProposal(BaseModel):
    summary: str
    project_data: dict[str, Any]


class ChatResponse(BaseModel):
    reply: str
    proposal: ProjectChangeProposal | None = None


SYSTEM_PROMPT = """
You are the built-in AI Assistant for AI Film Studio.

Help the user improve the current film project. You may help with:
- movie ideas
- story structure
- storyboard scenes
- narration
- pacing
- scene order
- image, audio, and video prompts
- cinematic style
- camera direction
- transitions
- endings

You must return one valid JSON object with this exact top-level shape:

{
  "reply": "A concise answer shown in the chat.",
  "proposal": null
}

When the user explicitly asks you to change, rewrite, add, remove, reorder,
shorten, expand, or otherwise modify the project, return:

{
  "reply": "Explain what you propose.",
  "proposal": {
    "summary": "A short description of the proposed change.",
    "project_data": {
      "movieTitle": "...",
      "movieIdea": "...",
      "scenes": [],
      "style": "...",
      "sceneLength": 5,
      "aspectRatio": "16:9",
      "finalMovieUrl": ""
    }
  }
}

Proposal rules:
- Return the complete project_data object, not only changed fields.
- Preserve every unchanged value exactly.
- Preserve existing scene IDs.
- New scenes need a unique integer ID.
- Never invent imageUrl, audioUrl, videoUrl, or finalMovieUrl values.
- Preserve existing generated media URLs and media prompts unless the user
  explicitly requests changing a prompt.
- Only include a proposal when the user clearly requested a project change.
- For questions, explanations, analysis, or general suggestions, proposal
  must be null.
- Do not claim the change has already been applied.
- Base the answer only on the supplied project context and conversation.
- Do not wrap the JSON in Markdown code fences.
""".strip()


PROJECT_FIELDS = (
    "movieTitle",
    "movieIdea",
    "scenes",
    "style",
    "sceneLength",
    "aspectRatio",
    "finalMovieUrl",
)

SCENE_TEXT_FIELDS = (
    "title",
    "narration",
    "mood",
    "duration",
    "imagePrompt",
    "audioPrompt",
    "videoPrompt",
)

SCENE_MEDIA_FIELDS = (
    "imageUrl",
    "audioUrl",
    "videoUrl",
)


def build_project_context(
    request: ChatRequest,
) -> str:
    project_context = {
        "name": request.project.name,
        "data": request.project.data,
    }

    return json.dumps(
        project_context,
        ensure_ascii=False,
        indent=2,
        default=str,
    )


def safe_string(
    value: Any,
    fallback: str = "",
) -> str:
    if isinstance(value, str):
        return value

    if value is None:
        return fallback

    return str(value)


def safe_scene_length(
    value: Any,
    fallback: int,
) -> int:
    try:
        parsed_value = int(value)
    except (TypeError, ValueError):
        return fallback

    return max(1, min(parsed_value, 300))


def get_original_scenes(
    project_data: dict[str, Any],
) -> list[dict[str, Any]]:
    scenes = project_data.get("scenes")

    if not isinstance(scenes, list):
        return []

    return [
        scene
        for scene in scenes
        if isinstance(scene, dict)
    ]


def get_next_scene_id(
    used_ids: set[int],
) -> int:
    next_id = max(used_ids, default=0) + 1

    while next_id in used_ids:
        next_id += 1

    return next_id


def normalise_proposed_scenes(
    original_data: dict[str, Any],
    proposed_data: dict[str, Any],
) -> list[dict[str, Any]]:
    original_scenes = get_original_scenes(
        original_data
    )

    original_by_id: dict[int, dict[str, Any]] = {}

    for original_scene in original_scenes:
        scene_id = original_scene.get("id")

        if isinstance(scene_id, int):
            original_by_id[scene_id] = (
                original_scene
            )

    proposed_scenes = proposed_data.get("scenes")

    if not isinstance(proposed_scenes, list):
        return [
            dict(scene)
            for scene in original_scenes
        ]

    used_ids: set[int] = set()
    normalised_scenes: list[
        dict[str, Any]
    ] = []

    for proposed_scene in proposed_scenes:
        if not isinstance(proposed_scene, dict):
            continue

        proposed_id = proposed_scene.get("id")

        if (
            isinstance(proposed_id, int)
            and proposed_id > 0
            and proposed_id not in used_ids
        ):
            scene_id = proposed_id
        else:
            scene_id = get_next_scene_id(
                used_ids
                | set(original_by_id.keys())
            )

        used_ids.add(scene_id)

        original_scene = original_by_id.get(
            scene_id,
            {},
        )

        normalised_scene: dict[str, Any] = {
            "id": scene_id,
        }

        for field_name in SCENE_TEXT_FIELDS:
            fallback_value = safe_string(
                original_scene.get(
                    field_name,
                    "",
                )
            )

            normalised_scene[field_name] = (
                safe_string(
                    proposed_scene.get(
                        field_name,
                        fallback_value,
                    ),
                    fallback_value,
                )
            )

        # Generated media is never created or replaced by the assistant.
        for field_name in SCENE_MEDIA_FIELDS:
            original_value = original_scene.get(
                field_name
            )

            if isinstance(original_value, str):
                normalised_scene[field_name] = (
                    original_value
                )

        normalised_scenes.append(
            normalised_scene
        )

    return normalised_scenes


def normalise_project_proposal(
    original_data: dict[str, Any],
    proposed_data: Any,
) -> dict[str, Any] | None:
    if not isinstance(proposed_data, dict):
        return None

    original_scene_length = safe_scene_length(
        original_data.get("sceneLength"),
        5,
    )

    normalised_data: dict[str, Any] = {
        "movieTitle": safe_string(
            proposed_data.get(
                "movieTitle",
                original_data.get(
                    "movieTitle",
                    "",
                ),
            )
        ),
        "movieIdea": safe_string(
            proposed_data.get(
                "movieIdea",
                original_data.get(
                    "movieIdea",
                    "",
                ),
            )
        ),
        "scenes": normalise_proposed_scenes(
            original_data,
            proposed_data,
        ),
        "style": safe_string(
            proposed_data.get(
                "style",
                original_data.get(
                    "style",
                    "Cinematic",
                ),
            ),
            "Cinematic",
        ),
        "sceneLength": safe_scene_length(
            proposed_data.get(
                "sceneLength",
                original_scene_length,
            ),
            original_scene_length,
        ),
        "aspectRatio": safe_string(
            proposed_data.get(
                "aspectRatio",
                original_data.get(
                    "aspectRatio",
                    "16:9",
                ),
            ),
            "16:9",
        ),
        # A text assistant must never create a final rendered movie URL.
        "finalMovieUrl": safe_string(
            original_data.get(
                "finalMovieUrl",
                "",
            )
        ),
    }

    return normalised_data


def parse_assistant_response(
    raw_content: str,
    original_data: dict[str, Any],
) -> ChatResponse:
    try:
        parsed_content = json.loads(
            raw_content
        )
    except json.JSONDecodeError as error:
        raise ValueError(
            "OpenAI returned invalid JSON."
        ) from error

    if not isinstance(parsed_content, dict):
        raise ValueError(
            "OpenAI returned an invalid response object."
        )

    reply = parsed_content.get("reply")

    if not isinstance(reply, str) or not reply.strip():
        raise ValueError(
            "OpenAI returned an empty reply."
        )

    raw_proposal = parsed_content.get(
        "proposal"
    )

    if not isinstance(raw_proposal, dict):
        return ChatResponse(
            reply=reply.strip(),
            proposal=None,
        )

    summary = raw_proposal.get("summary")

    if not isinstance(summary, str):
        summary = "Apply the proposed project changes."

    normalised_project_data = (
        normalise_project_proposal(
            original_data,
            raw_proposal.get(
                "project_data"
            ),
        )
    )

    if normalised_project_data is None:
        return ChatResponse(
            reply=reply.strip(),
            proposal=None,
        )

    return ChatResponse(
        reply=reply.strip(),
        proposal=ProjectChangeProposal(
            summary=summary.strip()
            or "Apply the proposed project changes.",
            project_data=normalised_project_data,
        ),
    )


@router.post(
    "/chat",
    response_model=ChatResponse,
)
def chat(
    request: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accessible_project(
        request.project_id,
        user,
        db,
        allowed_roles=(
            "owner",
            "editor",
            "viewer",
        ),
    )

    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Missing OPENAI_API_KEY. "
                "Check backend/.env"
            ),
        )

    messages: list[dict[str, str]] = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "system",
            "content": (
                "Current AI Film Studio "
                "project context:\n"
                f"{build_project_context(request)}"
            ),
        },
    ]

    for history_message in request.history[-10:]:
        messages.append(
            {
                "role": history_message.role,
                "content": (
                    history_message.content
                ),
            }
        )

    last_history_message = (
        request.history[-1]
        if request.history
        else None
    )

    message_already_in_history = (
        last_history_message is not None
        and last_history_message.role
        == "user"
        and last_history_message.content.strip()
        == request.message.strip()
    )

    if not message_already_in_history:
        messages.append(
            {
                "role": "user",
                "content": request.message.strip(),
            }
        )

    try:
        client = OpenAI()

        completion = (
            client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=messages,
                temperature=0.5,
                response_format={
                    "type": "json_object",
                },
            )
        )

        raw_content = (
            completion.choices[0]
            .message.content
        )

        if not raw_content:
            raise ValueError(
                "OpenAI returned an empty response."
            )

        return parse_assistant_response(
            raw_content,
            request.project.data,
        )

    except HTTPException:
        raise

    except Exception as error:
        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "The AI assistant could not "
                "generate a response: "
                f"{error!s}"
            ),
        ) from error
