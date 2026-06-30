import type { Scene } from "../types/film";

interface TimelineProps {
  scenes: Scene[];
}

function Timeline({ scenes }: TimelineProps) {
  return (
    <section className="card card-dark p-4 mb-5">
      <h2 className="h4 fw-bold mb-3">Film Timeline</h2>

      <div className="d-flex gap-3 flex-wrap">
        {scenes.map((scene) => (
          <div className="timeline-item" key={scene.id}>
            Scene {scene.id}
          </div>
        ))}
      </div>
    </section>
  );
}

export default Timeline;