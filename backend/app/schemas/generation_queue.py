from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GenerationScene(BaseModel):
    """Validated scene data accepted by the generation queue."""

    model_config = ConfigDict(extra="forbid")

    id: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=200)
    narration: str = Field(min_length=1, max_length=10_000)
    mood: str = Field(min_length=1, max_length=100)
    duration: str | None = Field(default=None, max_length=50)

    imageUrl: str | None = Field(default=None, max_length=2_048)
    audioUrl: str | None = Field(default=None, max_length=2_048)
    videoUrl: str | None = Field(default=None, max_length=2_048)

    imagePrompt: str | None = Field(default=None, max_length=10_000)
    audioPrompt: str | None = Field(default=None, max_length=10_000)
    videoPrompt: str | None = Field(default=None, max_length=10_000)

    @field_validator("title", "narration", "mood")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        cleaned = value.strip()

        if not cleaned:
            raise ValueError("must not be blank")

        return cleaned

    @field_validator(
        "duration",
        "imageUrl",
        "audioUrl",
        "videoUrl",
        "imagePrompt",
        "audioPrompt",
        "videoPrompt",
    )
    @classmethod
    def convert_blank_optional_text_to_none(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()
        return cleaned or None


class StartGenerationQueueRequest(BaseModel):
    """Payload used to start image, audio and video generation."""

    model_config = ConfigDict(extra="forbid")

    projectId: str = Field(min_length=1, max_length=100)
    scenes: list[GenerationScene] = Field(min_length=1, max_length=30)
    style: str = Field(default="Cinematic", min_length=1, max_length=100)
    sceneLength: int = Field(default=5, ge=1, le=30)
    aspectRatio: Literal["16:9", "9:16", "1:1"] = "16:9"

    @field_validator("projectId", "style")
    @classmethod
    def strip_required_values(cls, value: str) -> str:
        cleaned = value.strip()

        if not cleaned:
            raise ValueError("must not be blank")

        return cleaned

    @field_validator("scenes")
    @classmethod
    def scene_ids_must_be_unique(
        cls,
        scenes: list[GenerationScene],
    ) -> list[GenerationScene]:
        scene_ids = [scene.id for scene in scenes]

        if len(scene_ids) != len(set(scene_ids)):
            raise ValueError("scene IDs must be unique")

        return scenes