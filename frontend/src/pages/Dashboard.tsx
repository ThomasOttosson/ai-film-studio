import { useState } from "react";
import Hero from "../components/Hero";
import MediaPipeline from "../components/MediaPipeline";
import ProjectForm from "../components/ProjectForm";
import SceneCard from "../components/SceneCard";
import Timeline from "../components/Timeline";
import type { Scene } from "../types/film";

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

function Dashboard() {
  const [movieTitle, setMovieTitle] = useState("");
  const [movieIdea, setMovieIdea] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);

  function handleGenerateStoryboard() {
    setScenes(demoScenes);
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