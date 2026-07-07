import { useState } from "react";
import {
  generateSceneAudio,
  generateSceneImage,
  generateSceneVideo,
  generateStoryboard,
} from "../api/filmApi";
import Hero from "../components/Hero";
import MediaLibrary from "../components/MediaLibrary";
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

  const [generatingImageSceneId, setGeneratingImageSceneId] = useState<
    number | null
  >(null);

  const [generatingAudioSceneId, setGeneratingAudioSceneId] = useState<
    number | null
  >(null);

  const [generatingVideoSceneId, setGeneratingVideoSceneId] = useState<
    number | null
  >(null);

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

  async function handleGenerateImage(scene: Scene) {
    try {
      setGeneratingImageSceneId(scene.id);

      const result = await generateSceneImage({
        scene_title: scene.title,
        narration: scene.narration,
        mood: scene.mood,
        style: "cinematic",
      });

      setScenes((currentScenes) =>
        currentScenes.map((currentScene) =>
          currentScene.id === scene.id
            ? {
                ...currentScene,
                imageUrl: result.image_url,
                imagePrompt: result.prompt,
              }
            : currentScene
        )
      );
    } catch (error) {
      console.error("Failed to generate image:", error);
      alert("Could not generate image. Check your backend terminal.");
    } finally {
      setGeneratingImageSceneId(null);
    }
  }

  async function handleGenerateAudio(scene: Scene) {
    try {
      setGeneratingAudioSceneId(scene.id);

      const result = await generateSceneAudio({
        scene_title: scene.title,
        narration: scene.narration,
        voice: "alloy",
      });

      setScenes((currentScenes) =>
        currentScenes.map((currentScene) =>
          currentScene.id === scene.id
            ? {
                ...currentScene,
                audioUrl: result.audio_url,
                audioPrompt: result.prompt,
              }
            : currentScene
        )
      );
    } catch (error) {
      console.error("Failed to generate audio:", error);
      alert("Could not generate audio. Check your backend terminal.");
    } finally {
      setGeneratingAudioSceneId(null);
    }
  }

  async function handleGenerateVideo(scene: Scene) {
    if (!scene.imageUrl || !scene.audioUrl) {
      alert("Generate both image and audio before creating a video.");
      return;
    }

    try {
      setGeneratingVideoSceneId(scene.id);

      const result = await generateSceneVideo({
        scene_title: scene.title,
        image_url: scene.imageUrl,
        audio_url: scene.audioUrl,
      });

      setScenes((currentScenes) =>
        currentScenes.map((currentScene) =>
          currentScene.id === scene.id
            ? {
                ...currentScene,
                videoUrl: result.video_url,
                videoPrompt: result.prompt,
              }
            : currentScene
        )
      );
    } catch (error) {
      console.error("Failed to generate video:", error);
      alert("Could not generate video. Check your backend terminal.");
    } finally {
      setGeneratingVideoSceneId(null);
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
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  onGenerateImage={handleGenerateImage}
                  onGenerateAudio={handleGenerateAudio}
                  onGenerateVideo={handleGenerateVideo}
                  isGeneratingImage={generatingImageSceneId === scene.id}
                  isGeneratingAudio={generatingAudioSceneId === scene.id}
                  isGeneratingVideo={generatingVideoSceneId === scene.id}
                />
              ))}
            </div>
          </section>

          <Timeline scenes={scenes} />

          <MediaPipeline />

          <MediaLibrary scenes={scenes} />
        </>
      )}
    </main>
  );
}

export default Dashboard;