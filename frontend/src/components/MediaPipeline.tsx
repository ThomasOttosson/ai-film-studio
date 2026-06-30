import { FiDatabase, FiFilm, FiImage, FiMusic } from "react-icons/fi";

function MediaPipeline() {
  return (
    <section className="card card-dark p-4">
      <h2 className="h4 fw-bold mb-3">Media Pipeline</h2>

      <div className="row g-3">
        <div className="col-md-3">
          <div className="p-3 rounded bg-dark border">
            <FiImage className="mb-2" />
            <div>Images</div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="p-3 rounded bg-dark border">
            <FiMusic className="mb-2" />
            <div>Audio</div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="p-3 rounded bg-dark border">
            <FiFilm className="mb-2" />
            <div>Video</div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="p-3 rounded bg-dark border">
            <FiDatabase className="mb-2" />
            <div>Backblaze B2 Storage</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MediaPipeline;