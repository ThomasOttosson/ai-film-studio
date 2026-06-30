interface ProjectFormProps {
  movieTitle: string;
  movieIdea: string;
  onMovieTitleChange: (value: string) => void;
  onMovieIdeaChange: (value: string) => void;
  onGenerateStoryboard: () => void;
}

function ProjectForm({
  movieTitle,
  movieIdea,
  onMovieTitleChange,
  onMovieIdeaChange,
  onGenerateStoryboard,
}: ProjectFormProps) {
  return (
    <section className="card card-dark p-4 mb-5">
      <h2 className="h4 fw-bold mb-3">Create new film project</h2>

      <div className="mb-3">
        <label className="form-label">Movie title</label>
        <input
          className="form-control"
          value={movieTitle}
          onChange={(event) => onMovieTitleChange(event.target.value)}
          placeholder="Example: Neon Dreams"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Movie idea</label>
        <textarea
          className="form-control"
          rows={5}
          value={movieIdea}
          onChange={(event) => onMovieIdeaChange(event.target.value)}
          placeholder="Example: A lonely robot finds friendship in a futuristic city."
        />
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <label className="form-label">Genre</label>
          <select className="form-select">
            <option>Sci-Fi</option>
            <option>Fantasy</option>
            <option>Drama</option>
            <option>Action</option>
            <option>Documentary</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label">Length</label>
          <select className="form-select">
            <option>3 Scenes</option>
            <option>5 Scenes</option>
            <option>8 Scenes</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label">Style</label>
          <select className="form-select">
            <option>Cinematic</option>
            <option>Anime</option>
            <option>Realistic</option>
            <option>Noir</option>
          </select>
        </div>
      </div>

      <button className="btn btn-gradient btn-lg" onClick={onGenerateStoryboard}>
        Generate Storyboard
      </button>
    </section>
  );
}

export default ProjectForm;