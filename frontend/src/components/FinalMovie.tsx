interface FinalMovieProps {
  finalMovieUrl: string;
}

function FinalMovie({ finalMovieUrl }: FinalMovieProps) {
  return (
    <section className="card card-dark p-4 mt-5">
      <h2 className="h4 fw-bold mb-3">Final Movie</h2>

      <video className="w-100 rounded mb-3" controls src={finalMovieUrl} />

      <a
        href={finalMovieUrl}
        target="_blank"
        rel="noreferrer"
        className="btn btn-gradient"
      >
        Open Final Movie
      </a>
    </section>
  );
}

export default FinalMovie;