interface ProjectSettingsProps {
  style: string;
  sceneLength: number;
  aspectRatio: string;
  onStyleChange: (value: string) => void;
  onSceneLengthChange: (value: number) => void;
  onAspectRatioChange: (value: string) => void;
}

function ProjectSettings({
  style,
  sceneLength,
  aspectRatio,
  onStyleChange,
  onSceneLengthChange,
  onAspectRatioChange,
}: ProjectSettingsProps) {
  return (
    <section className="card card-dark p-4 mb-5">
      <h2 className="h4 fw-bold mb-3">Project Settings</h2>

      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label">Visual Style</label>
          <select
            className="form-select"
            value={style}
            onChange={(event) => onStyleChange(event.target.value)}
          >
            <option>Cinematic</option>
            <option>Anime</option>
            <option>Noir</option>
            <option>Fantasy</option>
            <option>Documentary</option>
            <option>Cyberpunk</option>
            <option>Photorealistic</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label">Scene Length</label>
          <select
            className="form-select"
            value={sceneLength}
            onChange={(event) => onSceneLengthChange(Number(event.target.value))}
          >
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label">Aspect Ratio</label>
          <select
            className="form-select"
            value={aspectRatio}
            onChange={(event) => onAspectRatioChange(event.target.value)}
          >
            <option value="16:9">16:9 Landscape</option>
            <option value="9:16">9:16 Vertical</option>
            <option value="1:1">1:1 Square</option>
          </select>
        </div>
      </div>
    </section>
  );
}

export default ProjectSettings;