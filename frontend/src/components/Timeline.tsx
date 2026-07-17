import { useMemo, useState } from "react";
import type { Scene } from "../types/film";

interface TimelineProps {
  scenes: Scene[];
  onMoveSceneUp: (sceneId: number) => void;
  onMoveSceneDown: (sceneId: number) => void;
  onRemoveScene: (sceneId: number) => void;
}

const MIN_ZOOM = 36;
const MAX_ZOOM = 120;
const DEFAULT_SCENE_DURATION = 5;

function parseDuration(duration?: string): number {
  if (!duration) return DEFAULT_SCENE_DURATION;

  const normalized = duration.trim().toLowerCase();
  const numericValue = Number.parseFloat(normalized.replace(",", "."));

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return DEFAULT_SCENE_DURATION;
  }

  if (normalized.includes("min")) {
    return numericValue * 60;
  }

  return numericValue;
}

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function Timeline({
  scenes,
  onMoveSceneUp,
  onMoveSceneDown,
  onRemoveScene,
}: TimelineProps) {
  const [zoom, setZoom] = useState(64);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(
    scenes[0]?.id ?? null,
  );
  const [playheadSeconds, setPlayheadSeconds] = useState(0);

  const sceneData = useMemo(() => {
    let currentStart = 0;

    return scenes.map((scene, index) => {
      const duration = parseDuration(scene.duration);
      const item = {
        scene,
        index,
        start: currentStart,
        duration,
      };

      currentStart += duration;
      return item;
    });
  }, [scenes]);

  const totalSeconds = useMemo(
    () => sceneData.reduce((total, item) => total + item.duration, 0),
    [sceneData],
  );

  const timelineWidth = Math.max(totalSeconds * zoom, 640);
  const rulerStep = zoom >= 90 ? 1 : zoom >= 55 ? 2 : 5;
  const rulerMarks = Math.ceil(totalSeconds / rulerStep) + 1;

  function handleTimelineClick(event: React.MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - bounds.left;
    const nextTime = Math.min(Math.max(clickX / zoom, 0), totalSeconds);
    setPlayheadSeconds(nextTime);
  }

  function handleZoomChange(nextZoom: number) {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)));
  }

  function selectScene(sceneId: number, start: number) {
    setSelectedSceneId(sceneId);
    setPlayheadSeconds(start);
  }

  return (
    <section className="card card-dark p-0 mb-5 overflow-hidden">
      <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 border-bottom border-secondary p-4">
        <div>
          <h2 className="h4 fw-bold mb-1">Movie Timeline</h2>
          <p className="muted-text small mb-0">
            Arrange, inspect and remove scenes before exporting your movie.
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-3">
          <span className="badge text-bg-dark border border-secondary px-3 py-2">
            {scenes.length} {scenes.length === 1 ? "scene" : "scenes"}
          </span>

          <span className="badge text-bg-dark border border-secondary px-3 py-2">
            Total {formatTime(totalSeconds)}
          </span>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={() => handleZoomChange(zoom - 10)}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out timeline"
              title="Zoom out"
            >
              −
            </button>

            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              value={zoom}
              onChange={(event) => handleZoomChange(Number(event.target.value))}
              aria-label="Timeline zoom"
              style={{ width: 110 }}
            />

            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={() => handleZoomChange(zoom + 10)}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in timeline"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </header>

      {scenes.length === 0 ? (
        <div className="text-center p-5">
          <p className="fw-semibold mb-1">The timeline is empty</p>
          <p className="muted-text small mb-0">
            Add a scene to start building your movie.
          </p>
        </div>
      ) : (
        <div className="d-flex" style={{ minHeight: 260 }}>
          <aside
            className="border-end border-secondary flex-shrink-0"
            style={{ width: 190, background: "rgba(0, 0, 0, 0.18)" }}
          >
            <div
              className="border-bottom border-secondary px-3 d-flex align-items-center"
              style={{ height: 42 }}
            >
              <span className="text-uppercase muted-text fw-semibold" style={{ fontSize: 11 }}>
                Scene track
              </span>
            </div>

            <div className="px-3 py-3">
              <p className="fw-semibold mb-1">Video 1</p>
              <p className="muted-text small mb-3">Main sequence</p>

              <div className="small muted-text">
                <div className="d-flex justify-content-between mb-2">
                  <span>Playhead</span>
                  <span>{formatTime(playheadSeconds)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Zoom</span>
                  <span>{zoom}px/s</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-grow-1 overflow-auto">
            <div style={{ width: timelineWidth, minWidth: "100%" }}>
              <div
                className="position-relative border-bottom border-secondary"
                style={{ height: 42, cursor: "pointer" }}
                onClick={handleTimelineClick}
                role="presentation"
              >
                {Array.from({ length: rulerMarks }, (_, index) => {
                  const second = index * rulerStep;
                  const left = second * zoom;

                  return (
                    <div
                      key={second}
                      className="position-absolute top-0 h-100 border-start border-secondary"
                      style={{ left }}
                    >
                      <span
                        className="position-absolute muted-text"
                        style={{ left: 6, top: 8, fontSize: 11, whiteSpace: "nowrap" }}
                      >
                        {formatTime(second)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                className="position-relative p-3"
                style={{ height: 170, cursor: "pointer" }}
                onClick={handleTimelineClick}
                role="presentation"
              >
                <div
                  className="position-absolute top-0 bottom-0"
                  style={{
                    left: playheadSeconds * zoom,
                    width: 2,
                    background: "#ef4444",
                    zIndex: 20,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    className="position-absolute"
                    style={{
                      top: -1,
                      left: -5,
                      width: 12,
                      height: 12,
                      background: "#ef4444",
                      transform: "rotate(45deg)",
                    }}
                  />
                </div>

                <div
                  className="position-relative rounded border border-secondary"
                  style={{
                    height: 104,
                    marginTop: 16,
                    background: "rgba(255, 255, 255, 0.025)",
                  }}
                >
                  {sceneData.map(({ scene, index, start, duration }) => {
                    const selected = selectedSceneId === scene.id;
                    const clipWidth = Math.max(duration * zoom - 4, 72);

                    return (
                      <article
                        key={scene.id}
                        className={`position-absolute rounded overflow-hidden border ${
                          selected ? "border-info shadow" : "border-secondary"
                        }`}
                        style={{
                          left: start * zoom + 2,
                          top: 8,
                          width: clipWidth,
                          height: 86,
                          background: selected
                            ? "linear-gradient(135deg, rgba(13, 202, 240, 0.35), rgba(13, 110, 253, 0.22))"
                            : "linear-gradient(135deg, rgba(99, 102, 241, 0.28), rgba(37, 99, 235, 0.18))",
                          cursor: "pointer",
                          zIndex: selected ? 10 : 5,
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          selectScene(scene.id, start);
                        }}
                        title={`${scene.title} · ${duration}s`}
                      >
                        <div className="h-100 d-flex flex-column justify-content-between p-2">
                          <div className="text-truncate">
                            <span className="badge text-bg-dark me-2">{index + 1}</span>
                            <span className="fw-semibold small">{scene.title}</span>
                          </div>

                          <div className="d-flex justify-content-between align-items-end gap-2">
                            <span className="muted-text text-truncate" style={{ fontSize: 11 }}>
                              {scene.mood || "No mood"}
                            </span>
                            <span className="text-nowrap" style={{ fontSize: 11 }}>
                              {duration}s
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {scenes.length > 0 && (
        <footer className="border-top border-secondary p-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <p className="muted-text small mb-0">
              Select a scene, then use the controls to change its position or remove it.
            </p>

            {sceneData.map(({ scene, index }) =>
              selectedSceneId === scene.id ? (
                <div key={scene.id} className="d-flex flex-wrap align-items-center gap-2">
                  <span className="small me-2">
                    Selected: <strong>{scene.title}</strong>
                  </span>

                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => onMoveSceneUp(scene.id)}
                    disabled={index === 0}
                  >
                    Move left
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => onMoveSceneDown(scene.id)}
                    disabled={index === scenes.length - 1}
                  >
                    Move right
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => {
                      onRemoveScene(scene.id);
                      const fallback = scenes[index + 1] ?? scenes[index - 1];
                      setSelectedSceneId(fallback?.id ?? null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : null,
            )}
          </div>
        </footer>
      )}
    </section>
  );
}

export default Timeline;