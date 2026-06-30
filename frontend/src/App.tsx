import { useState } from "react";
import { FiFilm, FiImage, FiMusic, FiDatabase } from "react-icons/fi";

interface Scene {
  id: number;
  title: string;
  mood: string;
  duration: string;
  narration: string;
}

const demoScenes: Scene[] = [
  {
    id: 1,
    title: "The lonely robot",
    mood: "Melancholic, cinematic",
    duration: "8 sec",
    narration: "In a neon city, a small robot wanders alone through the rain.",
  },
  {
    id: 2,
    title: "The signal",
    mood: "Mysterious, hopeful",
    duration: "10 sec",
    narration: "A strange light appears in the sky, guiding the robot forward.",
  },
  {
    id: 3,
    title: "A new friend",
    mood: "Warm, emotional",
    duration: "12 sec",
    narration: "The robot discovers another machine waiting beneath the tower.",
  },
];

function App() {
  const [movieTitle, setMovieTitle] = useState("");
  const [movieIdea, setMovieIdea] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);

  function handleGenerateStoryboard() {
    setScenes(demoScenes);
  }

  return (
    <div className="app-shell">
      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom px-4">
        <a className="navbar-brand fw-bold d-flex align-items-center gap-2" href="/">
          <FiFilm />
          AI Film Studio
        </a>
      </nav>

      <main className="container py-5">
        <section className="text-center mb-5">
          <span className="badge rounded-pill text-bg-primary mb-3">
            Backblaze B2 + Genblaze Hackathon
          </span>
          <h1 className="display-4 fw-bold">
            Turn ideas into AI-generated movies
          </h1>
          <p className="lead muted-text mt-3">
            Create storyboards, generate scenes, store media assets, and build
            complete AI film pipelines.
          </p>
        </section>

        <section className="card card-dark p-4 mb-5">
          <h2 className="h4 fw-bold mb-3">Create new film project</h2>

          <div className="mb-3">
            <label className="form-label">Movie title</label>
            <input
              className="form-control"
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              placeholder="Example: Neon Dreams"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Movie idea</label>
            <textarea
              className="form-control"
              rows={5}
              value={movieIdea}
              onChange={(e) => setMovieIdea(e.target.value)}
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
                <option>Pixar-like</option>
                <option>Noir</option>
              </select>
            </div>
          </div>

          <button className="btn btn-gradient btn-lg" onClick={handleGenerateStoryboard}>
            Generate Storyboard
          </button>
        </section>

        {scenes.length > 0 && (
          <>
            <section className="mb-5">
              <h2 className="h3 fw-bold mb-4">Storyboard</h2>

              <div className="row g-4">
                {scenes.map((scene) => (
                  <div className="col-md-4" key={scene.id}>
                    <div className="card card-dark h-100 p-3">
                      <div
                        className="rounded mb-3 d-flex align-items-center justify-content-center"
                        style={{
                          height: "180px",
                          background:
                            "linear-gradient(135deg, rgba(99,102,241,.35), rgba(236,72,153,.25))",
                        }}
                      >
                        <FiImage size={42} />
                      </div>

                      <h3 className="h5 fw-bold">
                        Scene {scene.id}: {scene.title}
                      </h3>
                      <p className="muted-text small">{scene.mood}</p>
                      <p>{scene.narration}</p>
                      <span className="badge text-bg-dark border">{scene.duration}</span>

                      <div className="d-grid gap-2 mt-3">
                        <button className="btn btn-outline-light btn-sm">
                          Generate Image
                        </button>
                        <button className="btn btn-outline-light btn-sm">
                          Generate Audio
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card card-dark p-4 mb-5">
              <h2 className="h4 fw-bold mb-3">Film Timeline</h2>
              <div className="d-flex gap-3 flex-wrap">
                {scenes.map((scene) => (
                  <div className="px-4 py-3 rounded bg-dark border" key={scene.id}>
                    Scene {scene.id}
                  </div>
                ))}
              </div>
            </section>

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
          </>
        )}
      </main>
    </div>
  );
}

export default App;