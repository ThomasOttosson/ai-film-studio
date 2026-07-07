import { useState } from "react";
import {
  generateFullMovie,
  generateSceneAudio,
  generateSceneImage,
  generateSceneVideo,
  generateStoryboard,
} from "../api/filmApi";
import FinalMovie from "../components/FinalMovie";
import Hero from "../components/Hero";
import MediaLibrary from "../components/MediaLibrary";
import MediaPipeline from "../components/MediaPipeline";
import ProjectForm from "../components/ProjectForm";
import ProjectSettings from "../components/ProjectSettings";
import SceneCard from "../components/SceneCard";
import Timeline from "../components/Timeline";
import type { Scene } from "../types/film";

function Dashboard() {
  const [movieTitle, setMovieTitle] = useState("");
  const [movieIdea, setMovieIdea] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [style, setStyle] = useState("Cinematic");
  const [sceneLength, setSceneLength] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");

  const [generatingImageSceneId, setGeneratingImageSceneId] =
    useState<number | null>(null);
  const [generatingAudioSceneId, setGeneratingAudioSceneId] =
    useState<number | null>(null);
  const [generatingVideoSceneId, setGeneratingVideoSceneId] =
    useState<number | null>(null);

  const [isGeneratingFullMovie, setIsGeneratingFullMovie] = useState(false);
  const [finalMovieUrl, setFinalMovieUrl] = useState("");

  async function handleGenerateStoryboard() {
    try {
      setIsLoading(true);

      const generatedScenes = await generateStoryboard({
        title: movieTitle,
        idea: movieIdea,
        genre: "Sci-Fi",
        style,
        scene_count: 3,
        scene_length: sceneLength,
      });

      setScenes(generatedScenes);
      setFinalMovieUrl("");
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
        style,
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
    const latestScene = scenes.find(
      (currentScene) => currentScene.id === scene.id
    );

    if (!latestScene?.imageUrl || !latestScene?.audioUrl) {
      alert("Generate both image and audio before creating a video.");
      return;
    }

    try {
      setGeneratingVideoSceneId(latestScene.id);

      const result = await generateSceneVideo({
        scene_title: latestScene.title,
        image_url: latestScene.imageUrl,
        audio_url: latestScene.audioUrl,
        scene_length: sceneLength,
        aspect_ratio: aspectRatio,
      });

      setScenes((currentScenes) =>
        currentScenes.map((currentScene) =>
          currentScene.id === latestScene.id
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

  function handleMoveSceneUp(sceneId: number) {
    setScenes((currentScenes) => {
      const index = currentScenes.findIndex((scene) => scene.id === sceneId);
      if (index <= 0) return currentScenes;

      const updatedScenes = [...currentScenes];
      [updatedScenes[index - 1], updatedScenes[index]] = [
        updatedScenes[index],
        updatedScenes[index - 1],
      ];

      return updatedScenes;
    });
  }

  function handleMoveSceneDown(sceneId: number) {
    setScenes((currentScenes) => {
      const index = currentScenes.findIndex((scene) => scene.id === sceneId);
      if (index === -1 || index === currentScenes.length - 1) {
        return currentScenes;
      }

      const updatedScenes = [...currentScenes];
      [updatedScenes[index], updatedScenes[index + 1]] = [
        updatedScenes[index + 1],
        updatedScenes[index],
      ];

      return updatedScenes;
    });
  }

  function handleRemoveScene(sceneId: number) {
    setScenes((currentScenes) =>
      currentScenes.filter((scene) => scene.id !== sceneId)
    );
  }

  async function handleGenerateFullMovie() {
    const videoUrls = scenes
      .map((scene) => scene.videoUrl)
      .filter((url): url is string => Boolean(url));

    if (videoUrls.length === 0) {
      alert("Generate at least one scene video before creating the final movie.");
      return;
    }

    try {
      setIsGeneratingFullMovie(true);

      const result = await generateFullMovie({
        title: movieTitle || "Untitled Film",
        video_urls: videoUrls,
      });

      setFinalMovieUrl(result.final_movie_url);
    } catch (error) {
      console.error("Failed to generate full movie:", error);
      alert("Could not generate full movie. Check your backend terminal.");
    } finally {
      setIsGeneratingFullMovie(false);
    }
  }

  return (
    <main className="container py-5">
      <Hero />

      <ProjectSettings
        style={style}
        sceneLength={sceneLength}
        aspectRatio={aspectRatio}
        onStyleChange={setStyle}
        onSceneLengthChange={setSceneLength}
        onAspectRatioChange={setAspectRatio}
      />

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

          <Timeline
            scenes={scenes}
            onMoveSceneUp={handleMoveSceneUp}
            onMoveSceneDown={handleMoveSceneDown}
            onRemoveScene={handleRemoveScene}
          />

          <MediaPipeline />
          <MediaLibrary scenes={scenes} />

          <section className="card card-dark p-4 mt-5">
            <h2 className="h4 fw-bold mb-3">Export Movie</h2>
            <p className="muted-text mb-3">
              Combine all generated scene videos into one final movie.
            </p>

            <button
              className="btn btn-gradient"
              onClick={handleGenerateFullMovie}
              disabled={isGeneratingFullMovie}
            >
              {isGeneratingFullMovie
                ? "Generating final movie..."
                : "Generate Full Movie"}
            </button>
          </section>

          {finalMovieUrl && <FinalMovie finalMovieUrl={finalMovieUrl} />}
        </>
      )}
    </main>
  );
}

export default Dashboard;