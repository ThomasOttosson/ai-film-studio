import { useEffect, useMemo, useRef, useState } from "react";
import {
  generateFullMovie,
  generateSceneAudio,
  generateSceneImage,
  generateSceneVideo,
  generateStoryboard,
} from "../api/filmApi";
import {
  cancelGenerationQueue,
  getGenerationQueue,
  retryFailedGenerationQueue,
  startGenerationQueue,
  type GenerationQueueResponse,
} from "../api/generationQueueApi";
import {
  connectGenerationQueueSocket,
  type GenerationQueueSocketMessage,
} from "../api/generationQueueSocket";
import AppMenuBar from "../components/AppMenuBar";
import FinalMovie from "../components/FinalMovie";
import GenerationQueue, {
  type QueueStep,
} from "../components/GenerationQueue";
import Hero from "../components/Hero";
import MediaLibrary from "../components/MediaLibrary";
import MediaPipeline from "../components/MediaPipeline";
import ProjectForm from "../components/ProjectForm";
import ProjectManager from "../components/ProjectManager";
import ProjectSettings from "../components/ProjectSettings";
import SceneCard from "../components/SceneCard";
import VideoEditor from "../components/VideoEditor";
import type { Scene } from "../types/film";
import {
  createAndSaveProject,
  defaultProjectData,
  deleteStoredProject,
  duplicateStoredProject,
  getInitialProject,
  getStoredProjects,
  setActiveProjectId,
  updateStoredProject,
  type SavedProjectData,
  type StoredProject,
} from "../utils/projectStorage";

function getSceneSeconds(scene: Scene, fallbackSceneLength: number) {
  const parsedSeconds = Number(String(scene.duration).replace(/[^0-9.]/g, ""));

  if (Number.isFinite(parsedSeconds) && parsedSeconds > 0) {
    return parsedSeconds;
  }

  return fallbackSceneLength;
}

function isTerminalQueueStatus(status: string) {
  return [
    "completed",
    "completed_with_errors",
    "failed",
    "cancelled",
    "not_found",
  ].includes(status);
}

function Dashboard() {
  const initialProject = useMemo(() => getInitialProject(), []);

  const queueSocketRef = useRef<ReturnType<
    typeof connectGenerationQueueSocket
  > | null>(null);

  const queueReconnectTimeoutRef = useRef<number | null>(null);
  const queuePingIntervalRef = useRef<number | null>(null);

  const [projects, setProjects] = useState<StoredProject[]>(() =>
    getStoredProjects()
  );

  const [activeProjectId, setActiveProjectIdState] = useState(
    initialProject.id
  );

  const [movieTitle, setMovieTitle] = useState(
    initialProject.data.movieTitle
  );

  const [movieIdea, setMovieIdea] = useState(initialProject.data.movieIdea);
  const [scenes, setScenes] = useState<Scene[]>(initialProject.data.scenes);
  const [isLoading, setIsLoading] = useState(false);

  const [style, setStyle] = useState(initialProject.data.style);

  const [sceneLength, setSceneLength] = useState(
    initialProject.data.sceneLength
  );

  const [aspectRatio, setAspectRatio] = useState(
    initialProject.data.aspectRatio
  );

  const [generatingImageSceneId, setGeneratingImageSceneId] =
    useState<number | null>(null);

  const [generatingAudioSceneId, setGeneratingAudioSceneId] =
    useState<number | null>(null);

  const [generatingVideoSceneId, setGeneratingVideoSceneId] =
    useState<number | null>(null);

  const [queueSteps, setQueueSteps] = useState<QueueStep[]>([]);
  const [isRunningQueue, setIsRunningQueue] = useState(false);
  const [isCancellingQueue, setIsCancellingQueue] = useState(false);

  const [activeQueueBatchId, setActiveQueueBatchId] = useState<string | null>(
    null
  );

  const [isGeneratingFullMovie, setIsGeneratingFullMovie] = useState(false);

  const [finalMovieUrl, setFinalMovieUrl] = useState(
    initialProject.data.finalMovieUrl
  );

  const currentProjectData: SavedProjectData = {
    movieTitle,
    movieIdea,
    scenes,
    style,
    sceneLength,
    aspectRatio,
    finalMovieUrl,
  };

  function clearQueueReconnectTimeout() {
    if (queueReconnectTimeoutRef.current !== null) {
      window.clearTimeout(queueReconnectTimeoutRef.current);
      queueReconnectTimeoutRef.current = null;
    }
  }

  function clearQueuePingInterval() {
    if (queuePingIntervalRef.current !== null) {
      window.clearInterval(queuePingIntervalRef.current);
      queuePingIntervalRef.current = null;
    }
  }

  function closeQueueSocket() {
    clearQueueReconnectTimeout();
    clearQueuePingInterval();

    queueSocketRef.current?.close();
    queueSocketRef.current = null;
  }

  function resetQueueConnection() {
    closeQueueSocket();
    setIsRunningQueue(false);
    setIsCancellingQueue(false);
  }

  function applyQueueResponse(queue: GenerationQueueResponse) {
    setQueueSteps(queue.steps ?? []);

    if (queue.scenes?.length > 0) {
      setScenes(queue.scenes);
    }

    if (isTerminalQueueStatus(queue.status)) {
      setIsRunningQueue(false);
      setIsCancellingQueue(false);
    }
  }

  /*
   * Keep exactly one WebSocket connection open for the active queue.
   *
   * This effect intentionally depends only on:
   * - activeQueueBatchId
   * - isRunningQueue
   *
   * It must not depend on scenes or queueSteps because those values change
   * for every WebSocket message and would repeatedly close the connection.
   */
  useEffect(() => {
    if (!activeQueueBatchId || !isRunningQueue) {
      closeQueueSocket();
      return;
    }

    const batchId = activeQueueBatchId;
    let effectDisposed = false;
    let reconnectAttempts = 0;

    function cleanupCurrentConnection() {
      clearQueueReconnectTimeout();
      clearQueuePingInterval();

      queueSocketRef.current?.close();
      queueSocketRef.current = null;
    }

    async function recoverQueueSnapshot() {
      try {
        const queue = await getGenerationQueue(batchId);

        if (effectDisposed) {
          return false;
        }

        setQueueSteps(queue.steps ?? []);

        if (queue.scenes?.length > 0) {
          setScenes(queue.scenes);
        }

        if (isTerminalQueueStatus(queue.status)) {
          setIsRunningQueue(false);
          setIsCancellingQueue(false);
          return false;
        }

        return true;
      } catch (error) {
        console.error("Failed to recover queue snapshot:", error);
        return true;
      }
    }

    function scheduleReconnect() {
      if (effectDisposed) {
        return;
      }

      clearQueueReconnectTimeout();

      const reconnectDelay = Math.min(
        1_000 * 2 ** reconnectAttempts,
        10_000
      );

      reconnectAttempts += 1;

      queueReconnectTimeoutRef.current = window.setTimeout(async () => {
        if (effectDisposed) {
          return;
        }

        const queueStillRunning = await recoverQueueSnapshot();

        if (!effectDisposed && queueStillRunning) {
          openSocket();
        }
      }, reconnectDelay);
    }

    function handleSocketMessage(message: GenerationQueueSocketMessage) {
      if (effectDisposed) {
        return;
      }

      if (message.event === "batch_not_found") {
        setQueueSteps([]);
        setIsRunningQueue(false);
        setIsCancellingQueue(false);
        return;
      }

      const batch = message.batch;

      if (!batch) {
        return;
      }

      setQueueSteps(batch.steps ?? []);

      if (batch.scenes?.length > 0) {
        setScenes(batch.scenes);
      }

      if (isTerminalQueueStatus(batch.status)) {
        setIsRunningQueue(false);
        setIsCancellingQueue(false);
      }
    }

    function openSocket() {
      if (effectDisposed) {
        return;
      }

      cleanupCurrentConnection();

      const connection = connectGenerationQueueSocket({
        batchId,

        onOpen: () => {
          if (effectDisposed) {
            return;
          }

          console.log(`Generation WebSocket connected: ${batchId}`);

          reconnectAttempts = 0;
          clearQueueReconnectTimeout();
          clearQueuePingInterval();

          queuePingIntervalRef.current = window.setInterval(() => {
            queueSocketRef.current?.sendPing();
          }, 25_000);
        },

        onMessage: handleSocketMessage,

        onError: (event) => {
          if (effectDisposed) {
            return;
          }

          console.error("Generation WebSocket error:", event);
        },

        onClose: () => {
          clearQueuePingInterval();

          if (effectDisposed) {
            return;
          }

          console.log(`Generation WebSocket closed: ${batchId}`);
          queueSocketRef.current = null;

          scheduleReconnect();
        },
      });

      queueSocketRef.current = connection;
    }

    openSocket();

    return () => {
      effectDisposed = true;
      cleanupCurrentConnection();
    };
  }, [activeQueueBatchId, isRunningQueue]);

  function loadProjectIntoEditor(project: StoredProject) {
    closeQueueSocket();

    setActiveProjectId(project.id);
    setActiveProjectIdState(project.id);

    setMovieTitle(project.data.movieTitle);
    setMovieIdea(project.data.movieIdea);
    setScenes(project.data.scenes);
    setStyle(project.data.style);
    setSceneLength(project.data.sceneLength);
    setAspectRatio(project.data.aspectRatio);
    setFinalMovieUrl(project.data.finalMovieUrl);

    setGeneratingImageSceneId(null);
    setGeneratingAudioSceneId(null);
    setGeneratingVideoSceneId(null);
    setIsGeneratingFullMovie(false);

    setIsRunningQueue(false);
    setIsCancellingQueue(false);
    setQueueSteps([]);
    setActiveQueueBatchId(null);
  }

  useEffect(() => {
    const updatedProject = updateStoredProject(
      activeProjectId,
      currentProjectData
    );

    if (updatedProject) {
      setProjects(getStoredProjects());
    }
  }, [
    activeProjectId,
    movieTitle,
    movieIdea,
    scenes,
    style,
    sceneLength,
    aspectRatio,
    finalMovieUrl,
  ]);

  function handleClearQueue() {
    if (isRunningQueue) {
      return;
    }

    closeQueueSocket();
    setQueueSteps([]);
    setIsCancellingQueue(false);
    setActiveQueueBatchId(null);
  }

  function handleCreateProject() {
    const project = createAndSaveProject("Untitled Project");

    setProjects(getStoredProjects());
    loadProjectIntoEditor(project);
  }

  function handleOpenProject(projectId: string) {
    const project = getStoredProjects().find(
      (storedProject) => storedProject.id === projectId
    );

    if (!project) {
      return;
    }

    loadProjectIntoEditor(project);
  }

  function handleDuplicateProject(projectId: string) {
    const duplicatedProject = duplicateStoredProject(projectId);

    if (!duplicatedProject) {
      return;
    }

    setProjects(getStoredProjects());
    loadProjectIntoEditor(duplicatedProject);
  }

  function handleDeleteProject(projectId: string) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!shouldDelete) {
      return;
    }

    const remainingProjects = deleteStoredProject(projectId);

    setProjects(remainingProjects);

    if (projectId !== activeProjectId) {
      return;
    }

    if (remainingProjects[0]) {
      loadProjectIntoEditor(remainingProjects[0]);
      return;
    }

    const newProject = createAndSaveProject("Untitled Project");

    setProjects(getStoredProjects());
    loadProjectIntoEditor(newProject);
  }

  function handleClearCurrentProject() {
    const shouldClear = window.confirm(
      "Are you sure you want to clear the current project?"
    );

    if (!shouldClear) {
      return;
    }

    closeQueueSocket();

    setMovieTitle(defaultProjectData.movieTitle);
    setMovieIdea(defaultProjectData.movieIdea);
    setScenes(defaultProjectData.scenes);
    setStyle(defaultProjectData.style);
    setSceneLength(defaultProjectData.sceneLength);
    setAspectRatio(defaultProjectData.aspectRatio);
    setFinalMovieUrl(defaultProjectData.finalMovieUrl);

    setQueueSteps([]);
    setIsRunningQueue(false);
    setIsCancellingQueue(false);
    setActiveQueueBatchId(null);
  }

  async function handleGenerateStoryboard() {
    try {
      closeQueueSocket();
      setIsLoading(true);

      const generatedScenes = await generateStoryboard({
        title: movieTitle,
        idea: movieIdea,
        genre: "Sci-Fi",
        style,
        scene_count: 3,
        scene_length: sceneLength,
      });

      setScenes(
        generatedScenes.map((scene) => ({
          ...scene,
          duration: scene.duration ?? `${sceneLength}s`,
        }))
      );

      setQueueSteps([]);
      setIsRunningQueue(false);
      setIsCancellingQueue(false);
      setActiveQueueBatchId(null);
      setFinalMovieUrl("");
    } catch (error) {
      console.error("Failed to generate storyboard:", error);

      alert(
        "Could not generate storyboard. Make sure the backend is running."
      );
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
        scene_length: getSceneSeconds(latestScene, sceneLength),
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

  async function handleCancelQueue() {
    if (!activeQueueBatchId || isCancellingQueue) {
      return;
    }

    try {
      setIsCancellingQueue(true);

      const cancelledQueue = await cancelGenerationQueue(activeQueueBatchId);

      applyQueueResponse(cancelledQueue);
    } catch (error) {
      console.error("Failed to cancel queue:", error);
      alert("Could not cancel generation queue.");
      setIsCancellingQueue(false);
    }
  }

  async function handleRetryFailedQueue() {
    if (!activeQueueBatchId || isRunningQueue) {
      return;
    }

    try {
      closeQueueSocket();

      const retriedQueue = await retryFailedGenerationQueue(
        activeQueueBatchId
      );

      setQueueSteps(retriedQueue.steps ?? []);

      if (retriedQueue.scenes?.length > 0) {
        setScenes(retriedQueue.scenes);
      }

      if (isTerminalQueueStatus(retriedQueue.status)) {
        setIsRunningQueue(false);
        setIsCancellingQueue(false);
        return;
      }

      setIsCancellingQueue(false);
      setIsRunningQueue(true);
    } catch (error) {
      console.error("Failed to retry failed queue:", error);
      alert("Could not retry failed generation steps.");

      resetQueueConnection();
    }
  }

  async function handleGenerateAllMedia() {
    if (scenes.length === 0 || isRunningQueue) {
      return;
    }

    try {
      closeQueueSocket();
      setIsCancellingQueue(false);

      const startedQueue = await startGenerationQueue({
        scenes,
        style,
        sceneLength,
        aspectRatio,
      });

      const batchId = startedQueue.batch_id || startedQueue.id;

      if (!batchId) {
        throw new Error("No queue batch ID returned from backend.");
      }

      setActiveQueueBatchId(batchId);
      setQueueSteps(startedQueue.steps ?? []);
      setIsRunningQueue(true);
    } catch (error) {
      console.error("Failed to start generation queue:", error);

      alert(
        "Could not start generation queue. Check your backend terminal."
      );

      resetQueueConnection();
      setActiveQueueBatchId(null);
    }
  }

  async function handleGenerateFullMovie() {
    const videoUrls = scenes
      .map((scene) => scene.videoUrl)
      .filter((url): url is string => Boolean(url));

    if (videoUrls.length === 0) {
      alert(
        "Generate at least one scene video before creating the final movie."
      );

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
    <>
      <AppMenuBar />

      <main className="container py-5">
        <Hero />

        <ProjectManager
          projects={projects}
          activeProjectId={activeProjectId}
          currentProjectData={currentProjectData}
          onCreateProject={handleCreateProject}
          onOpenProject={handleOpenProject}
          onDuplicateProject={handleDuplicateProject}
          onDeleteProject={handleDeleteProject}
        />

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

        <div className="d-flex justify-content-end mb-5">
          <button
            className="btn btn-outline-danger"
            type="button"
            onClick={handleClearCurrentProject}
          >
            Clear Current Project
          </button>
        </div>

        {isLoading && (
          <div className="card card-dark p-4 mb-5 text-center">
            <h2 className="h4 fw-bold mb-2">
              Generating storyboard...
            </h2>

            <p className="muted-text">
              AI Film Studio is creating your first scene structure.
            </p>
          </div>
        )}

        {scenes.length > 0 && (
          <>
            <GenerationQueue
              scenes={scenes}
              isRunning={isRunningQueue}
              isCancelling={isCancellingQueue}
              queueSteps={queueSteps}
              onGenerateAll={handleGenerateAllMedia}
              onClearQueue={handleClearQueue}
              onCancelQueue={handleCancelQueue}
              onRetryFailed={handleRetryFailedQueue}
            />

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
                    isGeneratingImage={
                      generatingImageSceneId === scene.id
                    }
                    isGeneratingAudio={
                      generatingAudioSceneId === scene.id
                    }
                    isGeneratingVideo={
                      generatingVideoSceneId === scene.id
                    }
                  />
                ))}
              </div>
            </section>

            <VideoEditor scenes={scenes} setScenes={setScenes} />

            <MediaPipeline />

            <MediaLibrary scenes={scenes} />

            <section className="card card-dark p-4 mt-5">
              <h2 className="h4 fw-bold mb-3">Export Movie</h2>

              <p className="muted-text mb-3">
                Combine all generated scene videos into one final movie.
              </p>

              <button
                className="btn btn-gradient"
                type="button"
                onClick={handleGenerateFullMovie}
                disabled={isGeneratingFullMovie}
              >
                {isGeneratingFullMovie
                  ? "Generating final movie..."
                  : "Generate Full Movie"}
              </button>
            </section>

            {finalMovieUrl && (
              <FinalMovie finalMovieUrl={finalMovieUrl} />
            )}
          </>
        )}
      </main>
    </>
  );
}

export default Dashboard;