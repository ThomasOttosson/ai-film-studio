interface FinalMovieProps {
  finalMovieUrl: string;
}

function FinalMovie({ finalMovieUrl }: FinalMovieProps) {
  return (
    <section
      className="card card-dark p-4 mt-5"
      style={{
        maxWidth: "760px",
        margin: "0 auto",
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="h5 fw-bold mb-1">
            🎬 Final Movie
          </h2>

          <p className="text-secondary mb-0">
            Your movie has been generated successfully.
          </p>
        </div>
      </div>

      <div
        style={{
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #343434",
          background: "#111",
        }}
      >
        <video
          controls
          src={finalMovieUrl}
          style={{
            width: "100%",
            maxHeight: "380px",
            display: "block",
            objectFit: "contain",
          }}
        />
      </div>

      <div className="d-flex gap-2 mt-4 flex-wrap">
        <a
          href={finalMovieUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-gradient"
        >
          ▶ Open Movie
        </a>

        <a
          href={finalMovieUrl}
          download
          className="btn btn-outline-light"
        >
          ⬇ Download MP4
        </a>
      </div>
    </section>
  );
}

export default FinalMovie;