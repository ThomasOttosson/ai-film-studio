import { useState } from "react";
import { generateStoryboard } from "../api/filmApi";
import Hero from "../components/Hero";
import MediaPipeline from "../components/MediaPipeline";
import ProjectForm from "../components/ProjectForm";
import SceneCard from "../components/SceneCard";
import Timeline from "../components/Timeline";
import type { Scene } from "../types/film";

function Dashboard() {
  const [movieTitle, setMovieTitle] = useState("");
  const [movieIdea, setMovieIdea] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleGenerateStoryboard() {
    try {
      setIsLoading(true);

      const generatedScenes = await generateStoryboard({
        title: movieTitle,
        idea: movieIdea,
        genre: "Sci-Fi",
        style: "Cinematic",
        scene_count: 3,
      });

      setScenes(generatedScenes);
    } catch (error) {
      console.error("Failed to generate storyboard:", error);
      alert("Could not generate storyboard. Make sure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="container py-5">
      <Hero />

      <ProjectForm
        movieTitle={movieTitle}
        movieIdea={movieIdea}
        onMovieTitleChange={setMovieTitle}
        onMovieIdeaChange={setMovieIdea}
        onGenerateStoryboard={handleGenerateStoryboard}
      />

      {isLoading && (
        <div className="card card-dark p-4 mb-5 text-center">
          <h2 className="h4 fw-bold mb-2">Generating storyboard...</h2>
          <p className="muted-text">
            AI Film Studio is creating your first scene structure.
          </p>
        </div>
      )}

      {scenes.length > 0 && (
        <>
          <section className="mb-5">
            <h2 className="h3 fw-bold mb-4">Storyboard</h2>

            <div className="row g-4">
              {scenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} />
              ))}
            </div>
          </section>

          <Timeline scenes={scenes} />

          <MediaPipeline />
        </>
      )}
    </main>
  );
}

export default Dashboard;