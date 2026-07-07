import { FiImage } from "react-icons/fi";
import type { Scene } from "../types/film";

interface SceneCardProps {
  scene: Scene;
  onGenerateImage: (scene: Scene) => void;
  onGenerateAudio: (scene: Scene) => void;
  isGeneratingImage: boolean;
  isGeneratingAudio: boolean;
}

function SceneCard({
  scene,
  onGenerateImage,
  onGenerateAudio,
  isGeneratingImage,
  isGeneratingAudio,
}: SceneCardProps) {
  return (
    <div className="col-md-4">
      <div className="card card-dark h-100 p-3">
        {scene.imageUrl ? (
          <img src={scene.imageUrl} alt={scene.title} className="scene-generated-image mb-3" />
        ) : (
          <div className="scene-image-placeholder mb-3">
            <FiImage size={42} />
          </div>
        )}

        <h3 className="h5 fw-bold">Scene {scene.id}: {scene.title}</h3>
        <p className="muted-text small mb-2">{scene.mood}</p>
        <p>{scene.narration}</p>

        <span className="badge text-bg-dark border mt-3">{scene.duration}</span>

        {scene.audioUrl && (
          <audio className="w-100 mt-3" controls src={scene.audioUrl}>
            Your browser does not support the audio element.
          </audio>
        )}

        <div className="d-grid gap-2 mt-3">
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => onGenerateImage(scene)}
            disabled={isGeneratingImage}
          >
            {isGeneratingImage ? "Generating image..." : "Generate Image"}
          </button>

          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => onGenerateAudio(scene)}
            disabled={isGeneratingAudio}
          >
            {isGeneratingAudio ? "Generating audio..." : "Generate Audio"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SceneCard;