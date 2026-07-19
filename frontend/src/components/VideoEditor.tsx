import { useEffect, useMemo, useState } from "react";
import {
  FiCopy,
  FiPause,
  FiPlay,
  FiPlus,
  FiScissors,
  FiTrash2,
} from "react-icons/fi";

import type { Scene } from "../types/film";
import {
  dispatchAIAction,
  type AIActionJob,
  type AIActionType,
} from "../services/aiActions";

import AIActionsPanel, {
  type AIActionRequest as PanelAIActionRequest,
} from "./AIActionsPanel";
import AIJobQueuePanel from "./AIJobQueuePanel";
import InspectorPanel, {
  type InspectorClip,
} from "./InspectorPanel";
import PreviewPlayer from "./PreviewPlayer";
import Timeline from "./Timeline";

import "./videoEditor.css";

interface VideoEditorProps {
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  projectId?: string;
}

const DEFAULT_DURATION_SECONDS = 5;
const MIN_DURATION_SECONDS = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseDuration(duration?: string): number {
  if (!duration) return DEFAULT_DURATION_SECONDS;

  const normalized = duration.trim().toLowerCase().replace(",", ".");
  const parsed = Number.parseFloat(
    normalized.replace(/[^0-9.]/g, ""),
  );

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DURATION_SECONDS;
  }

  return normalized.includes("min") ? parsed * 60 : parsed;
}

function formatDuration(seconds: number): string {
  return `${Math.max(
    MIN_DURATION_SECONDS,
    Number(seconds.toFixed(1)),
  )}s`;
}

function getTotalDuration(scenes: Scene[]): number {
  return scenes.reduce(
    (sum, scene) => sum + parseDuration(scene.duration),
    0,
  );
}

function getSceneStart(
  scenes: Scene[],
  sceneId: number,
): number {
  let cursor = 0;

  for (const scene of scenes) {
    if (scene.id === sceneId) return cursor;
    cursor += parseDuration(scene.duration);
  }

  return 0;
}

function getSceneAtTime(
  scenes: Scene[],
  currentTime: number,
): Scene | undefined {
  let cursor = 0;

  for (const scene of scenes) {
    const duration = parseDuration(scene.duration);

    if (
      currentTime >= cursor &&
      currentTime < cursor + duration
    ) {
      return scene;
    }

    cursor += duration;
  }

  return scenes.at(-1);
}

function createSceneId(scenes: Scene[]): number {
  return (
    scenes.reduce(
      (highest, scene) => Math.max(highest, scene.id),
      0,
    ) + 1
  );
}

function sceneToInspectorClip(
  scene: Scene,
  scenes: Scene[],
): InspectorClip {
  const type: InspectorClip["type"] = scene.videoUrl
    ? "video"
    : scene.imageUrl
      ? "image"
      : scene.audioUrl
        ? "audio"
        : "video";

  return {
    id: scene.id,
    name: scene.title || `Scene ${scene.id}`,
    type,
    start: getSceneStart(scenes, scene.id),
    duration: parseDuration(scene.duration),
    speed: 1,
    locked: false,
    transform: {
      x: 0,
      y: 0,
      scale: 100,
      rotation: 0,
      opacity: 100,
    },
    audio: {
      volume: 100,
      fadeIn: 0,
      fadeOut: 0,
      muted: false,
    },
    text: scene.narration,
    fontSize: 42,
    textColor: "#ffffff",
  };
}

function mapPanelAction(actionId: string): AIActionType {
  if (actionId === "restyle-shot") {
    return "change-style";
  }

  return actionId as AIActionType;
}

function readString(
  result: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = result[key];

    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value.trim();
    }
  }

  return undefined;
}

function readNumber(
  result: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = result[key];

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function applyJobResultToScene(
  scene: Scene,
  job: AIActionJob,
): Scene {
  const result = job.result ?? {};

  const videoUrl = readString(
    result,
    "videoUrl",
    "video_url",
    "outputVideoUrl",
    "output_video_url",
  );
  const imageUrl = readString(
    result,
    "imageUrl",
    "image_url",
    "outputImageUrl",
    "output_image_url",
  );
  const audioUrl = readString(
    result,
    "audioUrl",
    "audio_url",
    "outputAudioUrl",
    "output_audio_url",
  );
  const narration = readString(
    result,
    "narration",
    "text",
    "rewrittenText",
    "rewritten_text",
  );
  const title = readString(result, "title", "sceneTitle");
  const duration = readNumber(
    result,
    "duration",
    "durationSeconds",
    "duration_seconds",
  );

  return {
    ...scene,
    ...(videoUrl ? { videoUrl } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(audioUrl ? { audioUrl } : {}),
    ...(narration ? { narration } : {}),
    ...(title ? { title } : {}),
    ...(duration && duration > 0
      ? { duration: formatDuration(duration) }
      : {}),
  };
}

export default function VideoEditor({
  scenes,
  setScenes,
  projectId,
}: VideoEditorProps) {
  const [selectedSceneId, setSelectedSceneId] = useState<
    number | null
  >(scenes[0]?.id ?? null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiSceneId, setAiSceneId] = useState<number | null>(
    null,
  );

  const totalDuration = useMemo(
    () => getTotalDuration(scenes),
    [scenes],
  );

  const selectedScene = useMemo(
    () =>
      scenes.find((scene) => scene.id === selectedSceneId),
    [scenes, selectedSceneId],
  );

  const aiScene = useMemo(
    () => scenes.find((scene) => scene.id === aiSceneId),
    [aiSceneId, scenes],
  );

  const activeScene = useMemo(
    () =>
      getSceneAtTime(scenes, currentTime) ??
      selectedScene,
    [currentTime, scenes, selectedScene],
  );

  const inspectorClip = useMemo(
    () =>
      selectedScene
        ? sceneToInspectorClip(selectedScene, scenes)
        : null,
    [scenes, selectedScene],
  );

  useEffect(() => {
    if (scenes.length === 0) {
      setSelectedSceneId(null);
      setAiSceneId(null);
      setAiPanelOpen(false);
      setCurrentTime(0);
      setIsPlaying(false);
      return;
    }

    if (
      !scenes.some(
        (scene) => scene.id === selectedSceneId,
      )
    ) {
      setSelectedSceneId(scenes[0].id);
      setCurrentTime(0);
    }

    if (
      aiSceneId !== null &&
      !scenes.some((scene) => scene.id === aiSceneId)
    ) {
      setAiSceneId(null);
      setAiPanelOpen(false);
    }
  }, [aiSceneId, scenes, selectedSceneId]);

  useEffect(() => {
    if (currentTime > totalDuration) {
      setCurrentTime(totalDuration);
    }
  }, [currentTime, totalDuration]);

  useEffect(() => {
    const sceneAtPlayhead = getSceneAtTime(
      scenes,
      currentTime,
    );

    if (
      sceneAtPlayhead &&
      sceneAtPlayhead.id !== selectedSceneId
    ) {
      setSelectedSceneId(sceneAtPlayhead.id);
    }
  }, [currentTime, scenes, selectedSceneId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTyping) return;

      if (event.code === "Space") {
        event.preventDefault();
        setIsPlaying((playing) => !playing);
        return;
      }

      if (
        (event.key === "Delete" ||
          event.key === "Backspace") &&
        selectedSceneId
      ) {
        event.preventDefault();
        removeScene(selectedSceneId);
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "d"
      ) {
        event.preventDefault();
        duplicateSelectedScene();
        return;
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        splitAtPlayhead();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
  });

  function moveScene(
    sceneId: number,
    direction: -1 | 1,
  ) {
    setScenes((currentScenes) => {
      const currentIndex = currentScenes.findIndex(
        (scene) => scene.id === sceneId,
      );
      const nextIndex = currentIndex + direction;

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= currentScenes.length
      ) {
        return currentScenes;
      }

      const nextScenes = [...currentScenes];
      [
        nextScenes[currentIndex],
        nextScenes[nextIndex],
      ] = [
        nextScenes[nextIndex],
        nextScenes[currentIndex],
      ];

      return nextScenes;
    });
  }

  function removeScene(sceneId: number) {
    setScenes((currentScenes) =>
      currentScenes.filter(
        (scene) => scene.id !== sceneId,
      ),
    );
  }

  function duplicateSelectedScene() {
    if (!selectedScene) return;

    const duplicatedId = createSceneId(scenes);
    const duplicatedScene: Scene = {
      ...selectedScene,
      id: duplicatedId,
      title: `${selectedScene.title || "Scene"} copy`,
    };

    setScenes((currentScenes) => {
      const sourceIndex = currentScenes.findIndex(
        (scene) => scene.id === selectedScene.id,
      );
      const nextScenes = [...currentScenes];

      nextScenes.splice(
        sourceIndex + 1,
        0,
        duplicatedScene,
      );

      return nextScenes;
    });

    setSelectedSceneId(duplicatedId);
    setCurrentTime(
      getSceneStart(scenes, selectedScene.id) +
        parseDuration(selectedScene.duration),
    );
  }

  function addEmptyScene() {
    const id = createSceneId(scenes);
    const newScene: Scene = {
      id,
      title: `Scene ${scenes.length + 1}`,
      narration: "",
      mood: "cinematic",
      duration: `${DEFAULT_DURATION_SECONDS}s`,
      imagePrompt: "",
      audioPrompt: "",
      videoPrompt: "",
    };

    setScenes((currentScenes) => [
      ...currentScenes,
      newScene,
    ]);
    setSelectedSceneId(id);
    setCurrentTime(totalDuration);
  }

  function splitAtPlayhead() {
    const scene = getSceneAtTime(scenes, currentTime);
    if (!scene) return;

    const sceneStart = getSceneStart(scenes, scene.id);
    const sceneDuration = parseDuration(scene.duration);
    const splitPosition = currentTime - sceneStart;

    if (
      splitPosition < MIN_DURATION_SECONDS ||
      sceneDuration - splitPosition <
        MIN_DURATION_SECONDS
    ) {
      return;
    }

    const secondId = createSceneId(scenes);
    const firstDuration = Number(
      splitPosition.toFixed(1),
    );
    const secondDuration = Number(
      (sceneDuration - splitPosition).toFixed(1),
    );

    setScenes((currentScenes) => {
      const sceneIndex = currentScenes.findIndex(
        (item) => item.id === scene.id,
      );

      if (sceneIndex < 0) {
        return currentScenes;
      }

      const firstPart: Scene = {
        ...scene,
        duration: formatDuration(firstDuration),
      };
      const secondPart: Scene = {
        ...scene,
        id: secondId,
        title: `${scene.title || "Scene"} – del 2`,
        duration: formatDuration(secondDuration),
      };

      const nextScenes = [...currentScenes];

      nextScenes.splice(
        sceneIndex,
        1,
        firstPart,
        secondPart,
      );

      return nextScenes;
    });

    setSelectedSceneId(secondId);
  }

  function updateInspectorClip(
    nextClip: InspectorClip,
  ) {
    const sceneId = Number(nextClip.id);

    if (!Number.isFinite(sceneId)) {
      return;
    }

    setScenes((currentScenes) =>
      currentScenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              title: nextClip.name,
              duration: formatDuration(
                Math.max(
                  MIN_DURATION_SECONDS,
                  nextClip.duration,
                ),
              ),
              narration:
                typeof nextClip.text === "string"
                  ? nextClip.text
                  : scene.narration,
            }
          : scene,
      ),
    );
  }

  function openAiActions(clip: InspectorClip) {
    const scene = scenes.find(
      (item) => item.id === Number(clip.id),
    );

    if (!scene) {
      return;
    }

    setAiSceneId(scene.id);
    setAiPanelOpen(true);
  }

  async function runAIAction(
    request: PanelAIActionRequest,
  ): Promise<void> {
    dispatchAIAction({
      action: mapPanelAction(request.actionId),
      clip: {
        ...request.scene,
        duration: request.scene.duration
          ? Number(String(request.scene.duration).replace(/[^0-9.]/g, "")) || undefined
          : undefined,
        id: String(request.scene.id),
        type: request.scene.videoUrl
          ? "video"
          : request.scene.imageUrl
            ? "image"
            : request.scene.audioUrl
              ? "audio"
              : "scene",
      },
      prompt: request.prompt,
      strength: request.strength / 100,
      projectId,
      metadata: {
        preserveAudio: request.preserveAudio,
      },
      onQueued: () => {
        setAiPanelOpen(false);
      },
    });
  }

  function applyAIResult(job: AIActionJob) {
    const sceneId = Number(job.clipId);

    if (!Number.isFinite(sceneId)) {
      return;
    }

    setScenes((currentScenes) =>
      currentScenes.map((scene) =>
        scene.id === sceneId
          ? applyJobResultToScene(scene, job)
          : scene,
      ),
    );

    setSelectedSceneId(sceneId);
    setCurrentTime(getSceneStart(scenes, sceneId));
  }

  return (
    <section className="video-editor-shell">
      <header className="video-editor-toolbar card card-dark p-3 mb-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h2 className="h4 fw-bold mb-1">
              Video Editor
            </h2>

            <p className="muted-text small mb-0">
              Redigera, förhandsgranska och organisera
              filmens scener.
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={() =>
                setIsPlaying((playing) => !playing)
              }
              disabled={scenes.length === 0}
            >
              {isPlaying ? <FiPause /> : <FiPlay />}{" "}
              {isPlaying ? "Pausa" : "Spela"}
            </button>

            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={splitAtPlayhead}
              disabled={!activeScene}
              title="Dela vid playhead (S)"
            >
              <FiScissors /> Dela
            </button>

            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={duplicateSelectedScene}
              disabled={!selectedScene}
              title="Duplicera (Ctrl/Cmd + D)"
            >
              <FiCopy /> Duplicera
            </button>

            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() =>
                selectedSceneId &&
                removeScene(selectedSceneId)
              }
              disabled={!selectedSceneId}
              title="Ta bort (Delete)"
            >
              <FiTrash2 /> Ta bort
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={addEmptyScene}
            >
              <FiPlus /> Ny scen
            </button>
          </div>
        </div>
      </header>

      <div className="row g-3 align-items-stretch mb-3">
        <div className="col-12 col-xl-8">
          <PreviewPlayer
            scene={activeScene}
            currentTime={currentTime}
            duration={totalDuration}
            isPlaying={isPlaying}
            onPlayingChange={setIsPlaying}
            onTimeChange={(time) =>
              setCurrentTime(
                clamp(time, 0, totalDuration),
              )
            }
          />
        </div>

        <div className="col-12 col-xl-4">
          <div className="d-flex flex-column gap-3">
            <InspectorPanel
              clip={inspectorClip}
              onChange={updateInspectorClip}
              onOpenAiActions={openAiActions}
            />

            <AIJobQueuePanel
              onApplyResult={applyAIResult}
            />
          </div>
        </div>
      </div>

      <Timeline
        scenes={scenes}
        onMoveSceneUp={(sceneId) =>
          moveScene(sceneId, -1)
        }
        onMoveSceneDown={(sceneId) =>
          moveScene(sceneId, 1)
        }
        onRemoveScene={removeScene}
      />

      <AIActionsPanel
        scene={aiScene}
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        onRunAction={runAIAction}
      />

      {scenes.length > 0 ? (
        <div className="card card-dark px-3 py-2 mt-3">
          <div className="d-flex flex-wrap justify-content-between gap-2 small muted-text">
            <span>
              Markerad:{" "}
              {selectedScene?.title || "Ingen scen"}
            </span>

            <span>
              Kortkommandon: Space spela/pausa · S dela ·
              Delete ta bort · Ctrl/Cmd+D duplicera
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}