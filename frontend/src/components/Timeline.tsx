import type { Scene } from "../types/film";

interface TimelineProps {
  scenes: Scene[];
  onMoveSceneUp: (sceneId: number) => void;
  onMoveSceneDown: (sceneId: number) => void;
  onRemoveScene: (sceneId: number) => void;
}

function Timeline({
  scenes,
  onMoveSceneUp,
  onMoveSceneDown,
  onRemoveScene,
}: TimelineProps) {
  const totalSeconds = scenes.length * 5;

  return (
    <section className="card card-dark p-4 mb-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="h4 fw-bold mb-1">Movie Timeline</h2>
          <p className="muted-text small mb-0">
            Arrange scenes before exporting your final movie.
          </p>
        </div>

        <span className="badge text-bg-dark border">
          Total: {totalSeconds}s
        </span>
      </div>

      <div className="d-grid gap-3">
        {scenes.map((scene, index) => (
          <div
            className="timeline-editor-item d-flex align-items-center justify-content-between gap-3"
            key={scene.id}
          >
            <div>
              <p className="fw-bold mb-1">
                Scene {index + 1}: {scene.title}
              </p>
              <p className="muted-text small mb-0">
                {scene.duration || "5s"} · {scene.mood}
              </p>
            </div>

            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-light btn-sm"
                onClick={() => onMoveSceneUp(scene.id)}
                disabled={index === 0}
              >
                ↑
              </button>

              <button
                className="btn btn-outline-light btn-sm"
                onClick={() => onMoveSceneDown(scene.id)}
                disabled={index === scenes.length - 1}
              >
                ↓
              </button>

              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => onRemoveScene(scene.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Timeline;