import { useEffect, useRef, useState } from "react";
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
  pauseGenerationQueue,
  resumeGenerationQueue,
  retryFailedGenerationQueue,
  startGenerationQueue,
  type GenerationQueueResponse,
} from "../api/generationQueueApi";
import {
  connectGenerationQueueSocket,
  type GenerationQueueSocketMessage,
} from "../api/generationQueueSocket";
import {
  connectLiveCollaborationSocket,
  type LiveSocketMessage,
} from "../api/liveCollaborationSocket";
import {
  closeLiveSession,
  leaveLiveSession as leaveLiveSessionRequest,
  type CollaborationRole,
} from "../api/liveCollaborationApi";
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
  defaultProjectData,
  getActiveProjectId,
  setActiveProjectId,
  type SavedProjectData,
  type StoredProject,
} from "../utils/projectStorage";
import {
  createProject,
  deleteProject,
  duplicateProject,
  listProjects,
  updateProject,
} from "../api/projectApi";

function getSceneSeconds(
  scene: Scene,
  fallbackSceneLength: number
) {
  const parsedSeconds = Number(
    String(scene.duration).replace(/[^0-9.]/g, "")
  );

  if (
    Number.isFinite(parsedSeconds) &&
    parsedSeconds > 0
  ) {
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


function cloneProjectData(
  projectData: SavedProjectData
): SavedProjectData {
  return JSON.parse(
    JSON.stringify(projectData)
  ) as SavedProjectData;
}

function areProjectSnapshotsEqual(
  firstSnapshot: SavedProjectData,
  secondSnapshot: SavedProjectData
) {
  return (
    JSON.stringify(firstSnapshot) ===
    JSON.stringify(secondSnapshot)
  );
}

function Dashboard() {
  const initialProject: StoredProject = {
    id: "",
    name: "Untitled Project",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: defaultProjectData,
  };

  const projectsLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const historyTimeoutRef = useRef<number | null>(null);
  const undoStackRef = useRef<SavedProjectData[]>([]);
  const redoStackRef = useRef<SavedProjectData[]>([]);
  const lastHistorySnapshotRef =
    useRef<SavedProjectData | null>(null);
  const isApplyingHistoryRef = useRef(false);

  const queueSocketRef = useRef<ReturnType<
    typeof connectGenerationQueueSocket
  > | null>(null);

  const queueReconnectTimeoutRef =
    useRef<number | null>(null);

  const queuePingIntervalRef =
    useRef<number | null>(null);

  const liveSocketRef = useRef<ReturnType<
    typeof connectLiveCollaborationSocket
  > | null>(null);

  const livePingIntervalRef =
    useRef<number | null>(null);

  const applyingRemoteUpdateRef = useRef(false);
  const liveUserIdRef = useRef<number | null>(null);

  const [projects, setProjects] = useState<
    StoredProject[]
  >([]);

  const [
    isLoadingProjects,
    setIsLoadingProjects,
  ] = useState(true);

  const [
    activeProjectId,
    setActiveProjectIdState,
  ] = useState("");

  const [
    activeLiveSessionId,
    setActiveLiveSessionId,
  ] = useState<string | null>(null);

  const [liveOnlineCount, setLiveOnlineCount] =
    useState(0);

  const [
    lastLiveUpdatedBy,
    setLastLiveUpdatedBy,
  ] = useState("");

  const [liveRole, setLiveRole] = useState<
    CollaborationRole | "owner" | null
  >(null);

  const [
    livePermissionMessage,
    setLivePermissionMessage,
  ] = useState("");

  const [
    endLiveDialogOpen,
    setEndLiveDialogOpen,
  ] = useState(false);

  const [
    isEndingLiveSession,
    setIsEndingLiveSession,
  ] = useState(false);

  const [movieTitle, setMovieTitle] = useState(
    initialProject.data.movieTitle
  );

  const [movieIdea, setMovieIdea] = useState(
    initialProject.data.movieIdea
  );

  const [scenes, setScenes] = useState<Scene[]>(
    initialProject.data.scenes
  );

  const [isLoading, setIsLoading] =
    useState(false);

  const [style, setStyle] = useState(
    initialProject.data.style
  );

  const [sceneLength, setSceneLength] =
    useState(initialProject.data.sceneLength);

  const [aspectRatio, setAspectRatio] =
    useState(initialProject.data.aspectRatio);

  const [
    generatingImageSceneId,
    setGeneratingImageSceneId,
  ] = useState<number | null>(null);

  const [
    generatingAudioSceneId,
    setGeneratingAudioSceneId,
  ] = useState<number | null>(null);

  const [
    generatingVideoSceneId,
    setGeneratingVideoSceneId,
  ] = useState<number | null>(null);

  const [queueSteps, setQueueSteps] = useState<
    QueueStep[]
  >([]);

  const [queueSnapshot, setQueueSnapshot] =
    useState<GenerationQueueResponse | null>(null);

  const [isRunningQueue, setIsRunningQueue] =
    useState(false);

  const [isPausingQueue, setIsPausingQueue] =
    useState(false);

  const [
    isCancellingQueue,
    setIsCancellingQueue,
  ] = useState(false);

  const [
    activeQueueBatchId,
    setActiveQueueBatchId,
  ] = useState<string | null>(null);

  const [
    isGeneratingFullMovie,
    setIsGeneratingFullMovie,
  ] = useState(false);

  const [finalMovieUrl, setFinalMovieUrl] =
    useState(initialProject.data.finalMovieUrl);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const currentProjectData: SavedProjectData = {
    movieTitle,
    movieIdea,
    scenes,
    style,
    sceneLength,
    aspectRatio,
    finalMovieUrl,
  };

  const activeProject = projects.find(
    (project) => project.id === activeProjectId
  );

  function updateHistoryAvailability() {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }

  function clearPendingHistorySnapshot() {
    if (historyTimeoutRef.current !== null) {
      window.clearTimeout(historyTimeoutRef.current);
      historyTimeoutRef.current = null;
    }
  }

  function resetProjectHistory(
    projectData: SavedProjectData
  ) {
    clearPendingHistorySnapshot();
    undoStackRef.current = [];
    redoStackRef.current = [];
    lastHistorySnapshotRef.current =
      cloneProjectData(projectData);
    isApplyingHistoryRef.current = false;
    updateHistoryAvailability();
  }

  function applyProjectSnapshot(
    projectData: SavedProjectData
  ) {
    isApplyingHistoryRef.current = true;

    setMovieTitle(projectData.movieTitle);
    setMovieIdea(projectData.movieIdea);
    setScenes(cloneProjectData(projectData).scenes);
    setStyle(projectData.style);
    setSceneLength(projectData.sceneLength);
    setAspectRatio(projectData.aspectRatio);
    setFinalMovieUrl(projectData.finalMovieUrl);

    lastHistorySnapshotRef.current =
      cloneProjectData(projectData);
  }

  function handleUndo() {
    const previousSnapshot =
      undoStackRef.current.pop();

    if (!previousSnapshot) {
      return;
    }

    clearPendingHistorySnapshot();

    const currentSnapshot =
      lastHistorySnapshotRef.current ??
      currentProjectData;

    redoStackRef.current.push(
      cloneProjectData(currentSnapshot)
    );

    applyProjectSnapshot(previousSnapshot);
    updateHistoryAvailability();
  }

  function handleRedo() {
    const nextSnapshot =
      redoStackRef.current.pop();

    if (!nextSnapshot) {
      return;
    }

    clearPendingHistorySnapshot();

    const currentSnapshot =
      lastHistorySnapshotRef.current ??
      currentProjectData;

    undoStackRef.current.push(
      cloneProjectData(currentSnapshot)
    );

    applyProjectSnapshot(nextSnapshot);
    updateHistoryAvailability();
  }

  async function handleManualSaveProject() {
    if (!activeProjectId) {
      throw new Error(
        "No active project is open."
      );
    }

    const canEditProject =
      activeProject?.role === "owner" ||
      activeProject?.role === "editor" ||
      liveRole === "owner" ||
      liveRole === "editor";

    if (!canEditProject) {
      throw new Error(
        "You do not have permission to save changes to this project."
      );
    }

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(
        saveTimeoutRef.current
      );

      saveTimeoutRef.current = null;
    }

    const savedProject = await updateProject(
      activeProjectId,
      currentProjectData
    );

    if (
      liveRole === "owner" ||
      liveRole === "editor"
    ) {
      liveSocketRef.current?.sendProjectUpdate(
        currentProjectData
      );
    }

    setProjects((currentProjects) =>
      currentProjects
        .map((project) =>
          project.id === savedProject.id
            ? savedProject
            : project
        )
        .sort(
          (firstProject, secondProject) =>
            new Date(
              secondProject.updatedAt
            ).getTime() -
            new Date(
              firstProject.updatedAt
            ).getTime()
        )
    );
  }

  function leaveLiveSession() {
    liveSocketRef.current?.close();
    liveSocketRef.current = null;

    if (
      livePingIntervalRef.current !== null
    ) {
      window.clearInterval(
        livePingIntervalRef.current
      );

      livePingIntervalRef.current = null;
    }

    setActiveLiveSessionId(null);
    setLiveOnlineCount(0);
    setLastLiveUpdatedBy("");
    liveUserIdRef.current = null;
    setLiveRole(null);
    setLivePermissionMessage("");
  }

  function joinLiveSession(sessionId: string) {
    if (activeLiveSessionId === sessionId) {
      return;
    }

    leaveLiveSession();
    setActiveLiveSessionId(sessionId);
  }

  async function handleEndLiveSession() {
    if (!activeLiveSessionId) {
      return;
    }

    try {
      setIsEndingLiveSession(true);

      if (liveRole === "owner") {
        await closeLiveSession(
          activeLiveSessionId
        );
      } else {
        await leaveLiveSessionRequest(
          activeLiveSessionId
        );
      }

      setEndLiveDialogOpen(false);
      leaveLiveSession();
    } catch (error) {
      console.error(
        "Failed to end live collaboration:",
        error
      );

      alert(
        liveRole === "owner"
          ? "Could not close the live collaboration session."
          : "Could not leave the live collaboration session."
      );
    } finally {
      setIsEndingLiveSession(false);
    }
  }

  function clearQueueReconnectTimeout() {
    if (
      queueReconnectTimeoutRef.current !== null
    ) {
      window.clearTimeout(
        queueReconnectTimeoutRef.current
      );

      queueReconnectTimeoutRef.current = null;
    }
  }

  function clearQueuePingInterval() {
    if (queuePingIntervalRef.current !== null) {
      window.clearInterval(
        queuePingIntervalRef.current
      );

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
    setIsPausingQueue(false);
    setQueueSnapshot(null);
  }

  function applyQueueResponse(
    queue: GenerationQueueResponse
  ) {
    setQueueSnapshot(queue);
    setQueueSteps(queue.steps ?? []);

    if (queue.scenes?.length > 0) {
      setScenes(queue.scenes);
    }

    const isPaused = queue.status === "paused";

    if (isTerminalQueueStatus(queue.status) || isPaused) {
      setIsRunningQueue(false);
      setIsCancellingQueue(false);
      setIsPausingQueue(false);
    } else {
      setIsRunningQueue(true);
    }
  }

  useEffect(() => {
    if (
      !activeQueueBatchId ||
      !isRunningQueue
    ) {
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
        const queue =
          await getGenerationQueue(batchId);

        if (effectDisposed) {
          return false;
        }

        applyQueueResponse(queue);

        if (
          isTerminalQueueStatus(queue.status) ||
          queue.status === "paused"
        ) {
          return false;
        }

        return true;
      } catch (error) {
        console.error(
          "Failed to recover queue snapshot:",
          error
        );

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

      queueReconnectTimeoutRef.current =
        window.setTimeout(async () => {
          if (effectDisposed) {
            return;
          }

          const queueStillRunning =
            await recoverQueueSnapshot();

          if (
            !effectDisposed &&
            queueStillRunning
          ) {
            openSocket();
          }
        }, reconnectDelay);
    }

    function handleSocketMessage(
      message: GenerationQueueSocketMessage
    ) {
      if (effectDisposed) {
        return;
      }

      if (
        message.event === "batch_not_found"
      ) {
        setQueueSteps([]);
        setIsRunningQueue(false);
        setIsCancellingQueue(false);
        return;
      }

      const batch = message.batch;

      if (!batch) {
        return;
      }

      applyQueueResponse(batch);
    }

    function openSocket() {
      if (effectDisposed) {
        return;
      }

      cleanupCurrentConnection();

      const connection =
        connectGenerationQueueSocket({
          batchId,

          onOpen: () => {
            if (effectDisposed) {
              return;
            }

            console.log(
              `Generation WebSocket connected: ${batchId}`
            );

            reconnectAttempts = 0;
            clearQueueReconnectTimeout();
            clearQueuePingInterval();

            queuePingIntervalRef.current =
              window.setInterval(() => {
                queueSocketRef.current?.sendPing();
              }, 25_000);
          },

          onMessage: handleSocketMessage,

          onError: (event) => {
            if (effectDisposed) {
              return;
            }

            console.error(
              "Generation WebSocket error:",
              event
            );
          },

          onClose: () => {
            clearQueuePingInterval();

            if (effectDisposed) {
              return;
            }

            console.log(
              `Generation WebSocket closed: ${batchId}`
            );

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

  useEffect(() => {
    if (!activeLiveSessionId) {
      return;
    }

    const connection =
      connectLiveCollaborationSocket({
        sessionId: activeLiveSessionId,

        onOpen: () => {
          livePingIntervalRef.current =
            window.setInterval(() => {
              liveSocketRef.current?.sendPing();
            }, 25_000);
        },

        onMessage: (
          message: LiveSocketMessage
        ) => {
          if (message.event === "connected") {
            liveUserIdRef.current =
              message.userId;

            setLiveRole(message.role);
            setLivePermissionMessage("");
            return;
          }

          if (message.event === "presence") {
            setLiveOnlineCount(
              message.onlineUserIds.length
            );

            return;
          }

          if (
            message.event === "role_changed"
          ) {
            if (
              message.userId ===
              liveUserIdRef.current
            ) {
              setLiveRole(message.role);

              setLivePermissionMessage(
                message.role === "viewer"
                  ? "Your role was changed to Viewer. You can watch changes but cannot edit."
                  : "Your role was changed to Editor. You can edit again."
              );
            }

            return;
          }

          if (
            message.event ===
            "participant_removed"
          ) {
            if (
              message.userId ===
              liveUserIdRef.current
            ) {
              setLivePermissionMessage(
                "You were removed from the live session."
              );

              leaveLiveSession();
            }

            return;
          }

          if (
            message.event ===
            "permission_denied"
          ) {
            setLivePermissionMessage(
              message.message
            );

            return;
          }

          if (
            message.event ===
            "project_update"
          ) {
            applyingRemoteUpdateRef.current =
              true;

            setMovieTitle(
              message.data.movieTitle
            );

            setMovieIdea(
              message.data.movieIdea
            );

            setScenes(message.data.scenes);
            setStyle(message.data.style);

            setSceneLength(
              message.data.sceneLength
            );

            setAspectRatio(
              message.data.aspectRatio
            );

            setFinalMovieUrl(
              message.data.finalMovieUrl
            );

            setLastLiveUpdatedBy(
              message.updatedBy
            );

            resetProjectHistory(
              message.data
            );
          }
        },

        onClose: () => {
          if (
            livePingIntervalRef.current !==
            null
          ) {
            window.clearInterval(
              livePingIntervalRef.current
            );

            livePingIntervalRef.current =
              null;
          }

          liveSocketRef.current = null;
        },

        onError: (event) => {
          console.error(
            "Live collaboration WebSocket error:",
            event
          );
        },
      });

    liveSocketRef.current = connection;

    return () => {
      connection.close();

      if (
        livePingIntervalRef.current !== null
      ) {
        window.clearInterval(
          livePingIntervalRef.current
        );

        livePingIntervalRef.current = null;
      }

      liveSocketRef.current = null;
    };
  }, [activeLiveSessionId]);

  function loadProjectIntoEditor(
    project: StoredProject
  ) {
    closeQueueSocket();
    leaveLiveSession();

    setActiveProjectId(project.id);
    setActiveProjectIdState(project.id);

    setMovieTitle(project.data.movieTitle);
    setMovieIdea(project.data.movieIdea);
    setScenes(project.data.scenes);
    setStyle(project.data.style);

    setSceneLength(
      project.data.sceneLength
    );

    setAspectRatio(
      project.data.aspectRatio
    );

    setFinalMovieUrl(
      project.data.finalMovieUrl
    );

    resetProjectHistory(project.data);

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
    let cancelled = false;

    async function loadProjects() {
      try {
        setIsLoadingProjects(true);

        let serverProjects =
          await listProjects();

        if (serverProjects.length === 0) {
          const firstProject =
            await createProject(
              defaultProjectData
            );

          serverProjects = [firstProject];
        }

        if (cancelled) {
          return;
        }

        setProjects(serverProjects);

        const rememberedProjectId =
          getActiveProjectId();

        const projectToOpen =
          serverProjects.find(
            (project) =>
              project.id ===
              rememberedProjectId
          ) ?? serverProjects[0];

        loadProjectIntoEditor(projectToOpen);
        projectsLoadedRef.current = true;
      } catch (error) {
        console.error(
          "Failed to load projects:",
          error
        );

        alert(
          "Could not load your projects from the server."
        );
      } finally {
        if (!cancelled) {
          setIsLoadingProjects(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !projectsLoadedRef.current ||
      !activeProjectId ||
      !lastHistorySnapshotRef.current
    ) {
      return;
    }

    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      lastHistorySnapshotRef.current =
        cloneProjectData(currentProjectData);
      return;
    }

    if (applyingRemoteUpdateRef.current) {
      return;
    }

    clearPendingHistorySnapshot();

    historyTimeoutRef.current =
      window.setTimeout(() => {
        const previousSnapshot =
          lastHistorySnapshotRef.current;

        const nextSnapshot =
          cloneProjectData(currentProjectData);

        if (
          !previousSnapshot ||
          areProjectSnapshotsEqual(
            previousSnapshot,
            nextSnapshot
          )
        ) {
          return;
        }

        undoStackRef.current.push(
          cloneProjectData(previousSnapshot)
        );

        if (undoStackRef.current.length > 50) {
          undoStackRef.current.shift();
        }

        redoStackRef.current = [];
        lastHistorySnapshotRef.current =
          nextSnapshot;

        updateHistoryAvailability();
      }, 400);

    return () => {
      clearPendingHistorySnapshot();
    };
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

  useEffect(() => {
    if (
      !projectsLoadedRef.current ||
      !activeProjectId
    ) {
      return;
    }

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(
        saveTimeoutRef.current
      );
    }

    saveTimeoutRef.current =
      window.setTimeout(async () => {
        if (
          applyingRemoteUpdateRef.current
        ) {
          applyingRemoteUpdateRef.current =
            false;

          return;
        }

        const canEditProject =
          activeProject?.role === "owner" ||
          activeProject?.role === "editor" ||
          liveRole === "owner" ||
          liveRole === "editor";

        if (!canEditProject) {
          return;
        }

        try {
          const savedProject =
            await updateProject(
              activeProjectId,
              currentProjectData
            );

          if (
            liveRole === "owner" ||
            liveRole === "editor"
          ) {
            liveSocketRef.current?.sendProjectUpdate(
              currentProjectData
            );
          }

          setProjects(
            (currentProjects) =>
              currentProjects
                .map((project) =>
                  project.id ===
                  savedProject.id
                    ? savedProject
                    : project
                )
                .sort(
                  (
                    firstProject,
                    secondProject
                  ) =>
                    new Date(
                      secondProject.updatedAt
                    ).getTime() -
                    new Date(
                      firstProject.updatedAt
                    ).getTime()
                )
          );
        } catch (error) {
          console.error(
            "Failed to save project:",
            error
          );
        }
      }, 700);

    return () => {
      if (
        saveTimeoutRef.current !== null
      ) {
        window.clearTimeout(
          saveTimeoutRef.current
        );
      }
    };
  }, [
    activeProjectId,
    movieTitle,
    movieIdea,
    scenes,
    style,
    sceneLength,
    aspectRatio,
    finalMovieUrl,
    activeProject?.role,
    liveRole,
  ]);

  function handleClearQueue() {
    if (isRunningQueue) {
      return;
    }

    closeQueueSocket();
    setQueueSteps([]);
    setQueueSnapshot(null);
    setIsCancellingQueue(false);
    setIsPausingQueue(false);
    setActiveQueueBatchId(null);
  }

  async function handleCreateProject() {
    try {
      const project = await createProject(
        defaultProjectData
      );

      setProjects((currentProjects) => [
        project,
        ...currentProjects,
      ]);

      loadProjectIntoEditor(project);
    } catch (error) {
      console.error(
        "Failed to create project:",
        error
      );

      alert(
        "Could not create a new project."
      );
    }
  }

  function handleOpenProject(
    projectId: string
  ) {
    const project = projects.find(
      (storedProject) =>
        storedProject.id === projectId
    );

    if (project) {
      loadProjectIntoEditor(project);
    }
  }

  async function handleDuplicateProject(
    projectId: string
  ) {
    try {
      const duplicated =
        await duplicateProject(projectId);

      setProjects((currentProjects) => [
        duplicated,
        ...currentProjects,
      ]);

      loadProjectIntoEditor(duplicated);
    } catch (error) {
      console.error(
        "Failed to duplicate project:",
        error
      );

      alert(
        "Could not duplicate the project."
      );
    }
  }

  async function handleDeleteProject(
    projectId: string
  ) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteProject(projectId);

      let remainingProjects =
        projects.filter(
          (project) =>
            project.id !== projectId
        );

      if (remainingProjects.length === 0) {
        const replacement =
          await createProject(
            defaultProjectData
          );

        remainingProjects = [replacement];
      }

      setProjects(remainingProjects);

      if (
        projectId === activeProjectId
      ) {
        loadProjectIntoEditor(
          remainingProjects[0]
        );
      }
    } catch (error) {
      console.error(
        "Failed to delete project:",
        error
      );

      alert(
        "Could not delete the project."
      );
    }
  }

  function handleClearCurrentProject() {
    const shouldClear = window.confirm(
      "Are you sure you want to clear the current project?"
    );

    if (!shouldClear) {
      return;
    }

    closeQueueSocket();

    setMovieTitle(
      defaultProjectData.movieTitle
    );

    setMovieIdea(
      defaultProjectData.movieIdea
    );

    setScenes(defaultProjectData.scenes);
    setStyle(defaultProjectData.style);

    setSceneLength(
      defaultProjectData.sceneLength
    );

    setAspectRatio(
      defaultProjectData.aspectRatio
    );

    setFinalMovieUrl(
      defaultProjectData.finalMovieUrl
    );

    setQueueSteps([]);
    setIsRunningQueue(false);
    setIsCancellingQueue(false);
    setActiveQueueBatchId(null);
  }

  async function handleGenerateStoryboard() {
    try {
      closeQueueSocket();
      setIsLoading(true);

      const generatedScenes =
        await generateStoryboard({
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
          duration:
            scene.duration ??
            `${sceneLength}s`,
        }))
      );

      setQueueSteps([]);
      setIsRunningQueue(false);
      setIsCancellingQueue(false);
      setActiveQueueBatchId(null);
      setFinalMovieUrl("");
    } catch (error) {
      console.error(
        "Failed to generate storyboard:",
        error
      );

      alert(
        "Could not generate storyboard. Make sure the backend is running."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateImage(
    scene: Scene
  ) {
    try {
      setGeneratingImageSceneId(scene.id);

      const result =
        await generateSceneImage({
          scene_title: scene.title,
          narration: scene.narration,
          mood: scene.mood,
          style,
        });

      setScenes((currentScenes) =>
        currentScenes.map(
          (currentScene) =>
            currentScene.id === scene.id
              ? {
                  ...currentScene,
                  imageUrl:
                    result.image_url,
                  imagePrompt:
                    result.prompt,
                }
              : currentScene
        )
      );
    } catch (error) {
      console.error(
        "Failed to generate image:",
        error
      );

      alert(
        "Could not generate image. Check your backend terminal."
      );
    } finally {
      setGeneratingImageSceneId(null);
    }
  }

  async function handleGenerateAudio(
    scene: Scene
  ) {
    try {
      setGeneratingAudioSceneId(scene.id);

      const result =
        await generateSceneAudio({
          scene_title: scene.title,
          narration: scene.narration,
          voice: "alloy",
        });

      setScenes((currentScenes) =>
        currentScenes.map(
          (currentScene) =>
            currentScene.id === scene.id
              ? {
                  ...currentScene,
                  audioUrl:
                    result.audio_url,
                  audioPrompt:
                    result.prompt,
                }
              : currentScene
        )
      );
    } catch (error) {
      console.error(
        "Failed to generate audio:",
        error
      );

      alert(
        "Could not generate audio. Check your backend terminal."
      );
    } finally {
      setGeneratingAudioSceneId(null);
    }
  }

  async function handleGenerateVideo(
    scene: Scene
  ) {
    const latestScene = scenes.find(
      (currentScene) =>
        currentScene.id === scene.id
    );

    if (
      !latestScene?.imageUrl ||
      !latestScene?.audioUrl
    ) {
      alert(
        "Generate both image and audio before creating a video."
      );

      return;
    }

    try {
      setGeneratingVideoSceneId(
        latestScene.id
      );

      const result =
        await generateSceneVideo({
          scene_title: latestScene.title,
          image_url: latestScene.imageUrl,
          audio_url: latestScene.audioUrl,
          scene_length: getSceneSeconds(
            latestScene,
            sceneLength
          ),
          aspect_ratio: aspectRatio,
        });

      setScenes((currentScenes) =>
        currentScenes.map(
          (currentScene) =>
            currentScene.id ===
            latestScene.id
              ? {
                  ...currentScene,
                  videoUrl:
                    result.video_url,
                  videoPrompt:
                    result.prompt,
                }
              : currentScene
        )
      );
    } catch (error) {
      console.error(
        "Failed to generate video:",
        error
      );

      alert(
        "Could not generate video. Check your backend terminal."
      );
    } finally {
      setGeneratingVideoSceneId(null);
    }
  }

  async function handlePauseQueue() {
    if (!activeQueueBatchId || !isRunningQueue || isPausingQueue) {
      return;
    }

    try {
      setIsPausingQueue(true);
      const pausedQueue = await pauseGenerationQueue(activeQueueBatchId);
      applyQueueResponse(pausedQueue);
    } catch (error) {
      console.error("Failed to pause queue:", error);
      alert("Could not pause the render queue.");
      setIsPausingQueue(false);
    }
  }

  async function handleResumeQueue() {
    if (!activeQueueBatchId || queueSnapshot?.status !== "paused") {
      return;
    }

    try {
      const resumedQueue = await resumeGenerationQueue(activeQueueBatchId);
      applyQueueResponse(resumedQueue);
      setIsRunningQueue(true);
    } catch (error) {
      console.error("Failed to resume queue:", error);
      alert("Could not resume the render queue.");
    }
  }

  async function handleCancelQueue() {
    if (
      !activeQueueBatchId ||
      isCancellingQueue
    ) {
      return;
    }

    try {
      setIsCancellingQueue(true);

      const cancelledQueue =
        await cancelGenerationQueue(
          activeQueueBatchId
        );

      applyQueueResponse(cancelledQueue);
    } catch (error) {
      console.error(
        "Failed to cancel queue:",
        error
      );

      alert(
        "Could not cancel generation queue."
      );

      setIsCancellingQueue(false);
    }
  }

  async function handleRetryFailedQueue() {
    if (
      !activeQueueBatchId ||
      isRunningQueue
    ) {
      return;
    }

    try {
      closeQueueSocket();

      const retriedQueue =
        await retryFailedGenerationQueue(
          activeQueueBatchId
        );

      applyQueueResponse(retriedQueue);
      setIsCancellingQueue(false);
    } catch (error) {
      console.error(
        "Failed to retry failed queue:",
        error
      );

      alert(
        "Could not retry failed generation steps."
      );

      resetQueueConnection();
    }
  }

  async function handleGenerateAllMedia() {
    if (
      scenes.length === 0 ||
      isRunningQueue
    ) {
      return;
    }

    if (!activeProjectId) {
      alert(
        "Save or open a project before generating media."
      );

      return;
    }

    try {
      closeQueueSocket();
      setIsCancellingQueue(false);

      const startedQueue =
        await startGenerationQueue({
          projectId: activeProjectId,
          scenes,
          style,
          sceneLength,
          aspectRatio,
        });

      const batchId =
        startedQueue.batch_id ||
        startedQueue.id;

      if (!batchId) {
        throw new Error(
          "No queue batch ID returned from backend."
        );
      }

      setActiveQueueBatchId(batchId);

      applyQueueResponse(startedQueue);
      setIsRunningQueue(true);
    } catch (error) {
      console.error(
        "Failed to start generation queue:",
        error
      );

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
      .filter(
        (url): url is string =>
          Boolean(url)
      );

    if (videoUrls.length === 0) {
      alert(
        "Generate at least one scene video before creating the final movie."
      );

      return;
    }

    try {
      setIsGeneratingFullMovie(true);

      const result =
        await generateFullMovie({
          title:
            movieTitle ||
            "Untitled Film",
          video_urls: videoUrls,
        });

      setFinalMovieUrl(
        result.final_movie_url
      );
    } catch (error) {
      console.error(
        "Failed to generate full movie:",
        error
      );

      alert(
        "Could not generate full movie. Check your backend terminal."
      );
    } finally {
      setIsGeneratingFullMovie(false);
    }
  }

  if (isLoadingProjects) {
    return (
      <main className="container py-5">
        <div className="card card-dark p-5 text-center">
          <h1 className="h4 fw-bold mb-2">
            Loading your projects...
          </h1>

          <p className="muted-text mb-0">
            Fetching your workspace from
            PostgreSQL.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <AppMenuBar
        activeProjectId={activeProjectId}
        activeProjectName={
          activeProject?.name ??
          "Untitled Project"
        }
        activeProjectRole={
          activeProject?.role
        }
        activeProjectData={
          currentProjectData
        }
        activeLiveSessionId={
          activeLiveSessionId
        }
        onSaveProject={
          handleManualSaveProject
        }
        onJoinLiveSession={
          joinLiveSession
        }
        onLeaveLiveSession={
          leaveLiveSession
        }
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {activeLiveSessionId && (
        <div className="container pt-3">
          <div className="live-session-status-bar">
            <div className="live-session-status-text">
              <span
                className="live-session-dot"
                aria-hidden="true"
              />

              <strong>
                Live session active
              </strong>

              <span>
                {liveOnlineCount}{" "}
                user
                {liveOnlineCount === 1
                  ? ""
                  : "s"}{" "}
                online
              </span>

              {liveRole ? (
                <span>
                  Role: {liveRole}
                </span>
              ) : null}

              {lastLiveUpdatedBy ? (
                <span>
                  Last update from{" "}
                  {lastLiveUpdatedBy}
                </span>
              ) : null}

              {livePermissionMessage ? (
                <span>
                  {livePermissionMessage}
                </span>
              ) : null}
            </div>

            <button
              type="button"
              className="live-session-end-button"
              onClick={() =>
                setEndLiveDialogOpen(true)
              }
            >
              End
            </button>
          </div>
        </div>
      )}

      {endLiveDialogOpen &&
        activeLiveSessionId && (
          <div
            className="share-dialog-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-live-session-title"
            onClick={() => {
              if (
                !isEndingLiveSession
              ) {
                setEndLiveDialogOpen(
                  false
                );
              }
            }}
          >
            <div
              className="share-dialog end-live-session-dialog"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="share-dialog-header">
                <div>
                  <h2 id="end-live-session-title">
                    {liveRole ===
                    "owner"
                      ? "End live collaboration?"
                      : "Leave live collaboration?"}
                  </h2>

                  <p>
                    {liveRole ===
                    "owner"
                      ? "This will disconnect every participant and close the session."
                      : "You will leave the session. Other participants can continue collaborating."}
                  </p>
                </div>
              </div>

              <div className="share-dialog-actions">
                <button
                  type="button"
                  onClick={() =>
                    setEndLiveDialogOpen(
                      false
                    )
                  }
                  disabled={
                    isEndingLiveSession
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="confirm-end-live-button"
                  onClick={() =>
                    void handleEndLiveSession()
                  }
                  disabled={
                    isEndingLiveSession
                  }
                >
                  {isEndingLiveSession
                    ? "Ending..."
                    : liveRole ===
                        "owner"
                      ? "End session"
                      : "Leave session"}
                </button>
              </div>
            </div>
          </div>
        )}

      <main className="container py-5">
        <Hero />

        <ProjectManager
          projects={projects}
          activeProjectId={
            activeProjectId
          }
          currentProjectData={
            currentProjectData
          }
          onCreateProject={
            handleCreateProject
          }
          onOpenProject={
            handleOpenProject
          }
          onDuplicateProject={
            handleDuplicateProject
          }
          onDeleteProject={
            handleDeleteProject
          }
        />

        <ProjectSettings
          style={style}
          sceneLength={sceneLength}
          aspectRatio={aspectRatio}
          onStyleChange={setStyle}
          onSceneLengthChange={
            setSceneLength
          }
          onAspectRatioChange={
            setAspectRatio
          }
        />

        <ProjectForm
          movieTitle={movieTitle}
          movieIdea={movieIdea}
          onMovieTitleChange={
            setMovieTitle
          }
          onMovieIdeaChange={
            setMovieIdea
          }
          onGenerateStoryboard={
            handleGenerateStoryboard
          }
        />

        <div className="d-flex justify-content-end mb-5">
          <button
            className="btn btn-outline-danger"
            type="button"
            onClick={
              handleClearCurrentProject
            }
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
              AI Film Studio is creating
              your first scene structure.
            </p>
          </div>
        )}

        {scenes.length > 0 && (
          <>
            <GenerationQueue
              scenes={scenes}
              isRunning={
                isRunningQueue
              }
              queueStatus={queueSnapshot?.status ?? null}
              isCancelling={
                isCancellingQueue
              }
              isPausing={isPausingQueue}
              queueSteps={queueSteps}
              progressPercent={queueSnapshot?.progressPercent}
              estimatedRemainingSeconds={
                queueSnapshot?.estimatedRemainingSeconds
              }
              currentStep={queueSnapshot?.currentStep}
              onGenerateAll={
                handleGenerateAllMedia
              }
              onClearQueue={
                handleClearQueue
              }
              onCancelQueue={
                handleCancelQueue
              }
              onPauseQueue={handlePauseQueue}
              onResumeQueue={handleResumeQueue}
              onRetryFailed={
                handleRetryFailedQueue
              }
            />

            <section className="mb-5">
              <h2 className="h3 fw-bold mb-4">
                Storyboard
              </h2>

              <div className="row g-4">
                {scenes.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    onGenerateImage={
                      handleGenerateImage
                    }
                    onGenerateAudio={
                      handleGenerateAudio
                    }
                    onGenerateVideo={
                      handleGenerateVideo
                    }
                    isGeneratingImage={
                      generatingImageSceneId ===
                      scene.id
                    }
                    isGeneratingAudio={
                      generatingAudioSceneId ===
                      scene.id
                    }
                    isGeneratingVideo={
                      generatingVideoSceneId ===
                      scene.id
                    }
                  />
                ))}
              </div>
            </section>

            <VideoEditor
              scenes={scenes}
              setScenes={setScenes}
            />

            <MediaPipeline />

            <MediaLibrary
              scenes={scenes}
            />

            <section className="card card-dark p-4 mt-5">
              <h2 className="h4 fw-bold mb-3">
                Export Movie
              </h2>

              <p className="muted-text mb-3">
                Combine all generated scene
                videos into one final movie.
              </p>

              <button
                className="btn btn-gradient"
                type="button"
                onClick={
                  handleGenerateFullMovie
                }
                disabled={
                  isGeneratingFullMovie
                }
              >
                {isGeneratingFullMovie
                  ? "Generating final movie..."
                  : "Generate Full Movie"}
              </button>
            </section>

            {finalMovieUrl && (
              <FinalMovie
                finalMovieUrl={
                  finalMovieUrl
                }
              />
            )}
          </>
        )}
      </main>
    </>
  );
}

export default Dashboard;