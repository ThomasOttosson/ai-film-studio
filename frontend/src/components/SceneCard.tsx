import { FiImage } from "react-icons/fi";
import type { Scene } from "../types/film";
import VersionHistory from "./VersionHistory";

type SceneAssetType = "image" | "audio" | "video";

interface SceneCardProps {
  scene: Scene;
  onGenerateImage: (scene: Scene) => void;
  onGenerateAudio: (scene: Scene) => void;
  onGenerateVideo: (scene: Scene) => void;
  isGeneratingImage: boolean;
  isGeneratingAudio: boolean;
  isGeneratingVideo: boolean;
  projectId?: string | null;
  onRestoreAsset?: (
    sceneId: number,
    assetType: SceneAssetType,
    url: string
  ) => void;
}

function SceneCard({
  scene,
  onGenerateImage,
  onGenerateAudio,
  onGenerateVideo,
  isGeneratingImage,
  isGeneratingAudio,
  isGeneratingVideo,
  projectId,
  onRestoreAsset,
}: SceneCardProps) {
  return (
    <div className="col-md-4">
      <div className="card card-dark h-100 p-3">
        {scene.imageUrl ? (
          <img
            src={scene.imageUrl}
            alt={scene.title}
            className="scene-generated-image mb-3"
          />
        ) : (
          <div className="scene-image-placeholder mb-3">
            <FiImage size={42} />
          </div>
        )}

        <h3 className="h5 fw-bold">Scene {scene.id}: {scene.title}</h3>
        <p className="muted-text small mb-2">{scene.mood}</p>
        <p>{scene.narration}</p>

        <span className="badge text-bg-dark border mt-3">
          {scene.duration}
        </span>

        {scene.audioUrl && (
          <audio className="w-100 mt-3" controls src={scene.audioUrl}>
            Your browser does not support the audio element.
          </audio>
        )}

        {scene.videoUrl && (
          <video className="w-100 mt-3 rounded" controls src={scene.videoUrl}>
            Your browser does not support the video element.
          </video>
        )}

        <div className="d-grid gap-2 mt-3">
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => onGenerateImage(scene)}
            disabled={isGeneratingImage}
          >
            {isGeneratingImage
              ? "Generating image..."
              : scene.imageUrl
                ? "Regenerate Image"
                : "Generate Image"}
          </button>

          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => onGenerateAudio(scene)}
            disabled={isGeneratingAudio}
          >
            {isGeneratingAudio
              ? "Generating narration..."
              : scene.audioUrl
                ? "Regenerate Narration"
                : "Generate Narration (optional)"}
          </button>

          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => onGenerateVideo(scene)}
            disabled={isGeneratingVideo || !scene.imageUrl}
          >
            {isGeneratingVideo
              ? "Generating video..."
              : scene.videoUrl
                ? "Regenerate Video"
                : "Generate Video"}
          </button>
        </div>

        {projectId && onRestoreAsset && (
          <div className="mt-2">
            {scene.imageUrl && (
              <VersionHistory
                projectId={projectId}
                assetType="image"
                sceneId={scene.id}
                label="Image"
                onRestored={(version) =>
                  onRestoreAsset(scene.id, "image", version.b2_url)
                }
              />
            )}
            {scene.audioUrl && (
              <VersionHistory
                projectId={projectId}
                assetType="audio"
                sceneId={scene.id}
                label="Narration"
                onRestored={(version) =>
                  onRestoreAsset(scene.id, "audio", version.b2_url)
                }
              />
            )}
            {scene.videoUrl && (
              <VersionHistory
                projectId={projectId}
                assetType="video"
                sceneId={scene.id}
                label="Video"
                onRestored={(version) =>
                  onRestoreAsset(scene.id, "video", version.b2_url)
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SceneCard;