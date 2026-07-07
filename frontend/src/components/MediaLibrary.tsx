import type { Scene } from "../types/film";

interface MediaLibraryProps {
  scenes: Scene[];
}

function MediaLibrary({ scenes }: MediaLibraryProps) {
  const imageAssets = scenes.filter((scene) => scene.imageUrl);
  const audioAssets = scenes.filter((scene) => scene.audioUrl);

  return (
    <section className="card card-dark p-4 mt-5">
      <h2 className="h4 fw-bold mb-3">Media Library</h2>
      <p className="muted-text mb-4">
        Generated assets stored in Backblaze B2.
      </p>

      <h3 className="h5 fw-bold mb-3">Images</h3>
      {imageAssets.length === 0 ? (
        <p className="muted-text">No images generated yet.</p>
      ) : (
        <div className="row g-3 mb-4">
          {imageAssets.map((scene) => (
            <div className="col-md-4" key={`image-${scene.id}`}>
              <img src={scene.imageUrl} alt={scene.title} className="scene-generated-image mb-2" />
              <p className="small mb-1">{scene.title}</p>
              <a href={scene.imageUrl} target="_blank" rel="noreferrer" className="small">
                Open B2 image
              </a>
            </div>
          ))}
        </div>
      )}

      <h3 className="h5 fw-bold mb-3">Audio</h3>
      {audioAssets.length === 0 ? (
        <p className="muted-text">No voice-overs generated yet.</p>
      ) : (
        <div className="d-grid gap-3">
          {audioAssets.map((scene) => (
            <div className="p-3 rounded bg-dark border" key={`audio-${scene.id}`}>
              <p className="small mb-2">{scene.title}</p>
              <audio className="w-100" controls src={scene.audioUrl} />
              <a href={scene.audioUrl} target="_blank" rel="noreferrer" className="small">
                Open B2 audio
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default MediaLibrary;