import { useEffect, useMemo, useRef, useState } from "react";
import "./videoEditor.css";
import {
  FiCopy,
  FiImage,
  FiMusic,
  FiPause,
  FiPlay,
  FiScissors,
  FiTrash2,
  FiVideo,
  FiZoomIn,
  FiZoomOut,
} from "react-icons/fi";
import type { Scene } from "../types/film";

interface VideoEditorProps {
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
}

type TrackType = "video" | "image" | "audio";

interface TimelineClip {
  scene: Scene;
  track: TrackType;
  start: number;
  duration: number;
  end: number;
}

const MIN_CLIP_SECONDS = 1;
const MAX_CLIP_SECONDS = 30;
const MIN_ZOOM = 24;
const MAX_ZOOM = 130;
const DEFAULT_ZOOM = 54;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSceneSeconds(scene: Scene) {
  const parsedSeconds = Number(String(scene.duration).replace(/[^0-9.]/g, ""));

  if (Number.isFinite(parsedSeconds) && parsedSeconds > 0) {
    return clamp(parsedSeconds, MIN_CLIP_SECONDS, MAX_CLIP_SECONDS);
  }

  return 5;
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.floor((safeSeconds % 1) * 10);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}.${milliseconds}`;
}

function formatTick(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getSceneMediaLabel(scene: Scene, track: TrackType) {
  if (track === "video") return scene.videoUrl ? "Video clip" : "Video pending";
  if (track === "audio") return scene.audioUrl ? "Audio clip" : "Audio pending";
  return scene.imageUrl ? "Image clip" : "Image pending";
}

function getTrackIcon(track: TrackType) {
  if (track === "video") return <FiVideo />;
  if (track === "audio") return <FiMusic />;
  return <FiImage />;
}

function buildClips(scenes: Scene[], track: TrackType): TimelineClip[] {
  let currentStart = 0;

  return scenes.map((scene) => {
    const duration = getSceneSeconds(scene);

    const clip = {
      scene,
      track,
      start: currentStart,
      duration,
      end: currentStart + duration,
    };

    currentStart += duration;
    return clip;
  });
}

function getSceneAtTime(scenes: Scene[], currentTime: number) {
  let cursor = 0;

  for (const scene of scenes) {
    const duration = getSceneSeconds(scene);

    if (currentTime >= cursor && currentTime < cursor + duration) {
      return scene;
    }

    cursor += duration;
  }

  return scenes[scenes.length - 1];
}

function getSceneStartTime(scenes: Scene[], sceneId: number) {
  let cursor = 0;

  for (const scene of scenes) {
    if (scene.id === sceneId) return cursor;
    cursor += getSceneSeconds(scene);
  }

  return 0;
}

function TimelineRuler({
  totalSeconds,
  zoom,
}: {
  totalSeconds: number;
  zoom: number;
}) {
  const tickStep = totalSeconds > 90 ? 10 : totalSeconds > 40 ? 5 : 1;
  const ticks = [];

  for (let second = 0; second <= Math.ceil(totalSeconds); second += tickStep) {
    ticks.push(second);
  }

  return (
    <div
      className="video-editor-ruler"
      style={{ width: Math.max(totalSeconds * zoom, 600) }}
    >
      {ticks.map((second) => (
        <div
          key={second}
          className="video-editor-ruler-tick"
          style={{ left: second * zoom }}
        >
          <span>{formatTick(second)}</span>
        </div>
      ))}
    </div>
  );
}

function TrackLabel({ track }: { track: TrackType }) {
  const title = track === "video" ? "Video" : track === "audio" ? "Audio" : "Image";

  return (
    <div className="video-editor-track-label">
      <span className="video-editor-track-icon">{getTrackIcon(track)}</span>
      <span>{title}</span>
    </div>
  );
}

function TimelineClipView({
  clip,
  zoom,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
  onTrim,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  clip: TimelineClip;
  zoom: number;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onTrim: (sceneId: number, seconds: number) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
}) {
  const [isTrimming, setIsTrimming] = useState<"left" | "right" | null>(null);
  const startXRef = useRef(0);
  const startDurationRef = useRef(clip.duration);

  function beginTrim(edge: "left" | "right", event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    setIsTrimming(edge);
    startXRef.current = event.clientX;
    startDurationRef.current = clip.duration;
  }

  useEffect(() => {
    if (!isTrimming) return;

    function handleMouseMove(event: MouseEvent) {
      const deltaPixels = event.clientX - startXRef.current;
      const deltaSeconds = deltaPixels / zoom;
      const direction = isTrimming === "right" ? 1 : -1;
      const nextDuration = clamp(
        startDurationRef.current + deltaSeconds * direction,
        MIN_CLIP_SECONDS,
        MAX_CLIP_SECONDS
      );

      onTrim(clip.scene.id, Number(nextDuration.toFixed(1)));
    }

    function handleMouseUp() {
      setIsTrimming(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [clip.scene.id, isTrimming, onTrim, zoom]);

  const hasMedia =
    clip.track === "video"
      ? Boolean(clip.scene.videoUrl)
      : clip.track === "audio"
        ? Boolean(clip.scene.audioUrl)
        : Boolean(clip.scene.imageUrl);

  return (
    <div
      className={`video-editor-clip video-editor-clip-${clip.track} ${
        selected ? "video-editor-clip-selected" : ""
      } ${!hasMedia ? "video-editor-clip-pending" : ""}`}
      style={{
        left: clip.start * zoom,
        width: Math.max(clip.duration * zoom, 82),
      }}
      draggable
      onClick={onSelect}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <div
        className="video-editor-trim-handle video-editor-trim-left"
        onMouseDown={(event) => beginTrim("left", event)}
        title="Trim start"
      />

      <div className="video-editor-clip-body">
        <div className="video-editor-clip-title-row">
          <span className="video-editor-clip-icon">{getTrackIcon(clip.track)}</span>
          <span className="video-editor-clip-title">{clip.scene.title}</span>
        </div>

        <div className="video-editor-clip-meta">
          <span>{getSceneMediaLabel(clip.scene, clip.track)}</span>
          <span>{clip.duration.toFixed(1)}s</span>
        </div>

        {clip.track === "audio" && (
          <div className="video-editor-waveform" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, index) => (
              <span
                key={index}
                style={{ height: `${22 + ((index * 17) % 42)}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="video-editor-clip-actions">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate();
            }}
          >
            <FiCopy />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <FiTrash2 />
          </button>
        </div>
      )}

      <div
        className="video-editor-trim-handle video-editor-trim-right"
        onMouseDown={(event) => beginTrim("right", event)}
        title="Trim end"
      />
    </div>
  );
}

function VideoEditor({ scenes, setScenes }: VideoEditorProps) {
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(
    scenes[0]?.id ?? null
  );
  const [playheadTime, setPlayheadTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [draggedSceneId, setDraggedSceneId] = useState<number | null>(null);
  const [dropTargetSceneId, setDropTargetSceneId] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);

  const totalSeconds = useMemo(() => {
    return scenes.reduce((total, scene) => total + getSceneSeconds(scene), 0);
  }, [scenes]);

  const currentScene = useMemo(() => {
    if (scenes.length === 0) return undefined;
    return getSceneAtTime(scenes, playheadTime) ?? scenes[0];
  }, [playheadTime, scenes]);

  const selectedScene =
    scenes.find((scene) => scene.id === selectedSceneId) ?? currentScene ?? scenes[0];

  const videoClips = useMemo(() => buildClips(scenes, "video"), [scenes]);
  const imageClips = useMemo(() => buildClips(scenes, "image"), [scenes]);
  const audioClips = useMemo(() => buildClips(scenes, "audio"), [scenes]);

  useEffect(() => {
    if (!selectedSceneId && scenes[0]) {
      setSelectedSceneId(scenes[0].id);
    }
  }, [scenes, selectedSceneId]);

  useEffect(() => {
    if (playheadTime > totalSeconds) {
      setPlayheadTime(totalSeconds);
    }
  }, [playheadTime, totalSeconds]);

  useEffect(() => {
    if (!isPlaying || totalSeconds <= 0) return;

    const intervalId = window.setInterval(() => {
      setPlayheadTime((currentTime) => {
        const nextTime = currentTime + 0.1;

        if (nextTime >= totalSeconds) {
          setIsPlaying(false);
          return totalSeconds;
        }

        return Number(nextTime.toFixed(1));
      });
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, totalSeconds]);

  useEffect(() => {
    if (!currentScene) return;
    setSelectedSceneId(currentScene.id);
  }, [currentScene]);

  function updateSceneDuration(sceneId: number, seconds: number) {
    const safeSeconds = clamp(seconds, MIN_CLIP_SECONDS, MAX_CLIP_SECONDS);

    setScenes((currentScenes) =>
      currentScenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              duration: `${safeSeconds.toFixed(1)}s`,
            }
          : scene
      )
    );
  }

  function duplicateScene(sceneId: number) {
    setScenes((currentScenes) => {
      const index = currentScenes.findIndex((scene) => scene.id === sceneId);
      if (index === -1) return currentScenes;

      const highestId = currentScenes.reduce(
        (highest, scene) => Math.max(highest, scene.id),
        0
      );

      const sceneToCopy = currentScenes[index];

      const duplicatedScene: Scene = {
        ...sceneToCopy,
        id: highestId + 1,
        title: `${sceneToCopy.title} Copy`,
      };

      const updatedScenes = [...currentScenes];
      updatedScenes.splice(index + 1, 0, duplicatedScene);

      return updatedScenes;
    });
  }

  function deleteScene(sceneId: number) {
    setScenes((currentScenes) => {
      const updatedScenes = currentScenes.filter((scene) => scene.id !== sceneId);
      const fallbackScene = updatedScenes[0];

      if (selectedSceneId === sceneId) {
        setSelectedSceneId(fallbackScene?.id ?? null);
      }

      setPlayheadTime((currentTime) => clamp(currentTime, 0, totalSeconds));
      return updatedScenes;
    });
  }

  function reorderScene(sourceSceneId: number, targetSceneId: number) {
    if (sourceSceneId === targetSceneId) return;

    setScenes((currentScenes) => {
      const sourceIndex = currentScenes.findIndex((scene) => scene.id === sourceSceneId);
      const targetIndex = currentScenes.findIndex((scene) => scene.id === targetSceneId);

      if (sourceIndex === -1 || targetIndex === -1) return currentScenes;

      const updatedScenes = [...currentScenes];
      const [movedScene] = updatedScenes.splice(sourceIndex, 1);
      updatedScenes.splice(targetIndex, 0, movedScene);

      return updatedScenes;
    });
  }

  function selectScene(sceneId: number) {
    setSelectedSceneId(sceneId);
    setPlayheadTime(getSceneStartTime(scenes, sceneId));
    setIsPlaying(false);
  }

  function handleTimelineClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;

    if (target.closest(".video-editor-clip")) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const scrollLeft = event.currentTarget.scrollLeft;
    const x = event.clientX - bounds.left + scrollLeft - 132;
    const nextTime = clamp(x / zoom, 0, totalSeconds);

    setPlayheadTime(Number(nextTime.toFixed(1)));
    setIsPlaying(false);
  }

  function handleTimelineWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) return;

    event.preventDefault();

    const direction = event.deltaY > 0 ? -1 : 1;
    setZoom((currentZoom) => clamp(currentZoom + direction * 8, MIN_ZOOM, MAX_ZOOM));
  }

  function togglePlayback() {
    if (playheadTime >= totalSeconds) {
      setPlayheadTime(0);
    }

    setIsPlaying((current) => !current);
  }

  function jumpToStart() {
    setIsPlaying(false);
    setPlayheadTime(0);
  }

  function jumpToEnd() {
    setIsPlaying(false);
    setPlayheadTime(totalSeconds);
  }

  function nudgePlayhead(seconds: number) {
    setIsPlaying(false);

    setPlayheadTime((currentTime) =>
      Number(clamp(currentTime + seconds, 0, totalSeconds).toFixed(1))
    );
  }

  if (scenes.length === 0) {
    return null;
  }

  return (
    <section className="video-editor card card-dark p-4 mb-5">
      <div className="video-editor-header">
        <div>
          <span className="video-editor-kicker">AI Film Studio</span>
          <h2 className="h3 fw-bold mb-2">Video Editor</h2>
          <p className="muted-text mb-0">
            Edit your generated scenes with a playhead, multi-track timeline,
            trimming, drag and drop, zoom, preview and playback controls.
          </p>
        </div>

        <div className="video-editor-stats">
          <span>{scenes.length} scenes</span>
          <span>{formatDuration(totalSeconds)}</span>
          <span>{Math.round(zoom)} px/s</span>
        </div>
      </div>

      <div className="video-editor-grid">
        <div className="video-editor-preview-card">
          <div className="video-editor-preview-screen">
            {currentScene?.videoUrl ? (
              <video
                key={currentScene.id}
                ref={videoRef}
                src={currentScene.videoUrl}
                controls
                className="video-editor-preview-media"
              />
            ) : currentScene?.imageUrl ? (
              <img
                src={currentScene.imageUrl}
                alt={currentScene.title}
                className="video-editor-preview-media"
              />
            ) : (
              <div className="video-editor-preview-placeholder">
                <FiVideo size={46} />
                <span>No video or image generated yet</span>
              </div>
            )}
          </div>

          <div className="video-editor-preview-info">
            <div>
              <h3 className="h5 fw-bold mb-1">{currentScene?.title}</h3>
              <p className="muted-text small mb-0">{currentScene?.mood}</p>
            </div>

            <span className="video-editor-timecode">
              {formatDuration(playheadTime)}
            </span>
          </div>

          <p className="video-editor-narration">{currentScene?.narration}</p>

          {currentScene?.audioUrl && (
            <audio className="w-100" controls src={currentScene.audioUrl} />
          )}
        </div>

        <div className="video-editor-inspector">
          <h3 className="h5 fw-bold mb-3">Inspector</h3>

          {selectedScene ? (
            <>
              <label className="form-label small">Scene title</label>
              <input
                className="form-control form-control-sm mb-3"
                value={selectedScene.title}
                onChange={(event) => {
                  const nextTitle = event.target.value;

                  setScenes((currentScenes) =>
                    currentScenes.map((scene) =>
                      scene.id === selectedScene.id
                        ? { ...scene, title: nextTitle }
                        : scene
                    )
                  );
                }}
              />

              <label className="form-label small">Duration</label>
              <div className="input-group input-group-sm mb-3">
                <input
                  className="form-control"
                  type="number"
                  min={MIN_CLIP_SECONDS}
                  max={MAX_CLIP_SECONDS}
                  step="0.5"
                  value={getSceneSeconds(selectedScene)}
                  onChange={(event) =>
                    updateSceneDuration(selectedScene.id, Number(event.target.value))
                  }
                />
                <span className="input-group-text">sec</span>
              </div>

              <label className="form-label small">Mood</label>
              <input
                className="form-control form-control-sm mb-3"
                value={selectedScene.mood}
                onChange={(event) => {
                  const nextMood = event.target.value;

                  setScenes((currentScenes) =>
                    currentScenes.map((scene) =>
                      scene.id === selectedScene.id
                        ? { ...scene, mood: nextMood }
                        : scene
                    )
                  );
                }}
              />

              <div className="d-grid gap-2">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={() => duplicateScene(selectedScene.id)}
                >
                  <FiCopy className="me-2" /> Duplicate scene
                </button>

                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => deleteScene(selectedScene.id)}
                >
                  <FiTrash2 className="me-2" /> Delete scene
                </button>
              </div>

              <div className="video-editor-media-status mt-4">
                <div className={selectedScene.imageUrl ? "ready" : "pending"}>
                  <FiImage /> Image {selectedScene.imageUrl ? "ready" : "pending"}
                </div>

                <div className={selectedScene.audioUrl ? "ready" : "pending"}>
                  <FiMusic /> Audio {selectedScene.audioUrl ? "ready" : "pending"}
                </div>

                <div className={selectedScene.videoUrl ? "ready" : "pending"}>
                  <FiVideo /> Video {selectedScene.videoUrl ? "ready" : "pending"}
                </div>
              </div>
            </>
          ) : (
            <p className="muted-text small mb-0">Select a scene to edit it.</p>
          )}
        </div>
      </div>

      <div className="video-editor-toolbar">
        <div className="video-editor-playback-controls">
          <button type="button" onClick={jumpToStart}>
            0s
          </button>

          <button type="button" onClick={() => nudgePlayhead(-1)}>
            -1s
          </button>

          <button
            type="button"
            className="video-editor-play-button"
            onClick={togglePlayback}
          >
            {isPlaying ? <FiPause /> : <FiPlay />}
          </button>

          <button type="button" onClick={() => nudgePlayhead(1)}>
            +1s
          </button>

          <button type="button" onClick={jumpToEnd}>
            End
          </button>
        </div>

        <div className="video-editor-zoom-controls">
          <button
            type="button"
            onClick={() =>
              setZoom((currentZoom) => clamp(currentZoom - 8, MIN_ZOOM, MAX_ZOOM))
            }
          >
            <FiZoomOut />
          </button>

          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="Timeline zoom"
          />

          <button
            type="button"
            onClick={() =>
              setZoom((currentZoom) => clamp(currentZoom + 8, MIN_ZOOM, MAX_ZOOM))
            }
          >
            <FiZoomIn />
          </button>
        </div>
      </div>

      <div
        ref={timelineScrollRef}
        className="video-editor-timeline-shell"
        onClick={handleTimelineClick}
        onWheel={handleTimelineWheel}
      >
        <div
          className="video-editor-timeline-inner"
          style={{ width: Math.max(totalSeconds * zoom + 220, 800) }}
        >
          <div className="video-editor-ruler-row">
            <div className="video-editor-ruler-spacer">Time</div>
            <TimelineRuler totalSeconds={totalSeconds} zoom={zoom} />
          </div>

          <div
            className="video-editor-playhead"
            style={{ left: 132 + playheadTime * zoom }}
          >
            <div className="video-editor-playhead-head" />
            <div className="video-editor-playhead-line" />
          </div>

          {([
            ["video", videoClips],
            ["image", imageClips],
            ["audio", audioClips],
          ] as [TrackType, TimelineClip[]][]).map(([track, clips]) => (
            <div key={track} className="video-editor-track-row">
              <TrackLabel track={track} />

              <div
                className="video-editor-track"
                style={{ width: Math.max(totalSeconds * zoom, 600) }}
              >
                {clips.map((clip) => (
                  <TimelineClipView
                    key={`${track}-${clip.scene.id}`}
                    clip={clip}
                    zoom={zoom}
                    selected={selectedScene?.id === clip.scene.id}
                    onSelect={() => selectScene(clip.scene.id)}
                    onDuplicate={() => duplicateScene(clip.scene.id)}
                    onDelete={() => deleteScene(clip.scene.id)}
                    onTrim={updateSceneDuration}
                    onDragStart={() => setDraggedSceneId(clip.scene.id)}
                    onDragOver={() => setDropTargetSceneId(clip.scene.id)}
                    onDrop={() => {
                      if (draggedSceneId !== null) {
                        reorderScene(draggedSceneId, clip.scene.id);
                      }

                      setDraggedSceneId(null);
                      setDropTargetSceneId(null);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="video-editor-help-row">
        <span>
          <FiScissors /> Drag clip edges to trim.
        </span>
        <span>Drag clips sideways to reorder scenes.</span>
        <span>Ctrl + mouse wheel zooms the timeline.</span>
        {dropTargetSceneId && <span>Drop target: Scene {dropTargetSceneId}</span>}
      </div>
    </section>
  );
}

export default VideoEditor;