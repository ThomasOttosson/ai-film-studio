import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { jsPDF } from "jspdf";
import {
  FiArchive,
  FiCheck,
  FiDownload,
  FiFileText,
  FiFilm,
  FiRadio,
  FiSave,
  FiSearch,
  FiShare2,
  FiTrash2,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import { downloadProjectZip } from "../api/exportApi";
import {
  closeLiveSession,
  createLiveSession,
  getActiveProjectSession,
  listMyLiveInvitations,
  removeLiveParticipant,
  respondToLiveInvitation,
  revokeLiveInvitation,
  searchEligibleUsers,
  sendLiveInvitation,
  updateLiveParticipantRole,
  type CollaborationRole,
  type EligibleUser,
  type LiveInvitation,
  type LiveSession,
} from "../api/liveCollaborationApi";
import type {
  ProjectRole,
  SavedProjectData,
} from "../utils/projectStorage";
import { useAuth } from "../auth/AuthContext";
import "./AppMenuBar.css";

interface AppMenuBarProps {
  activeProjectId: string;
  activeProjectName: string;
  activeProjectRole?: ProjectRole;
  activeProjectData: SavedProjectData;
  activeLiveSessionId: string | null;
  onSaveProject: () => Promise<void>;
  onJoinLiveSession: (sessionId: string) => void;
  onLeaveLiveSession: () => void;
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            detail?: string;
          };
        };
      }
    ).response;

    return response?.data?.detail ?? "The request failed.";
  }

  return error instanceof Error
    ? error.message
    : "The request failed.";
}

function createSafeFileName(value: string) {
  const safeName = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return safeName || "ai-film-studio-project";
}

function getPrintableValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function createStoryboardPdf(
  projectTitle: string,
  projectData: SavedProjectData
) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginLeft = 18;
  const marginRight = 18;
  const marginTop = 18;
  const marginBottom = 18;
  const contentWidth =
    pageWidth - marginLeft - marginRight;
  let currentY = marginTop;

  function addNewPage() {
    pdf.addPage();
    currentY = marginTop;
  }

  function ensureSpace(requiredHeight: number) {
    if (
      currentY + requiredHeight >
      pageHeight - marginBottom
    ) {
      addNewPage();
    }
  }

  function addWrappedText(
    text: string,
    options?: {
      fontSize?: number;
      fontStyle?: "normal" | "bold" | "italic";
      spacingAfter?: number;
      lineHeight?: number;
    }
  ) {
    const cleanText = text.trim();
    if (!cleanText) return;

    const fontSize = options?.fontSize ?? 10;
    const fontStyle =
      options?.fontStyle ?? "normal";
    const spacingAfter =
      options?.spacingAfter ?? 4;
    const lineHeight = options?.lineHeight ?? 5;

    pdf.setFont("helvetica", fontStyle);
    pdf.setFontSize(fontSize);

    const lines = pdf.splitTextToSize(
      cleanText,
      contentWidth
    );

    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(String(line), marginLeft, currentY);
      currentY += lineHeight;
    }

    currentY += spacingAfter;
  }

  function addLabelValue(
    label: string,
    value: unknown
  ) {
    const printableValue =
      getPrintableValue(value);

    if (!printableValue) return;

    ensureSpace(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(`${label}:`, marginLeft, currentY);
    currentY += 5;

    addWrappedText(printableValue, {
      fontSize: 10,
      spacingAfter: 3,
    });
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);

  const titleLines = pdf.splitTextToSize(
    projectTitle,
    contentWidth
  );

  for (const titleLine of titleLines) {
    ensureSpace(10);
    pdf.text(
      String(titleLine),
      marginLeft,
      currentY
    );
    currentY += 10;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(90);
  pdf.text(
    "AI Film Studio Storyboard",
    marginLeft,
    currentY
  );
  currentY += 7;

  pdf.setFontSize(9);
  pdf.text(
    `Exported: ${new Date().toLocaleString()}`,
    marginLeft,
    currentY
  );
  pdf.setTextColor(0);
  currentY += 10;

  pdf.setDrawColor(190);
  pdf.line(
    marginLeft,
    currentY,
    pageWidth - marginRight,
    currentY
  );
  currentY += 9;

  addLabelValue("Movie title", projectData.movieTitle);
  addLabelValue("Movie idea", projectData.movieIdea);
  addLabelValue("Visual style", projectData.style);
  addLabelValue("Aspect ratio", projectData.aspectRatio);
  addLabelValue(
    "Default scene length",
    `${projectData.sceneLength} seconds`
  );

  ensureSpace(14);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Storyboard scenes", marginLeft, currentY);
  currentY += 10;

  projectData.scenes.forEach((scene, index) => {
    ensureSpace(30);
    pdf.setFillColor(240, 240, 240);
    pdf.roundedRect(
      marginLeft,
      currentY - 6,
      contentWidth,
      11,
      2,
      2,
      "F"
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);

    const sceneTitle =
      getPrintableValue(scene.title) ||
      `Scene ${index + 1}`;

    pdf.text(
      `${index + 1}. ${sceneTitle}`,
      marginLeft + 3,
      currentY + 1
    );

    currentY += 12;
    addLabelValue("Narration", scene.narration);
    addLabelValue("Mood", scene.mood);
    addLabelValue("Duration", scene.duration);
    addLabelValue("Image prompt", scene.imagePrompt);
    addLabelValue("Audio prompt", scene.audioPrompt);
    addLabelValue("Video prompt", scene.videoPrompt);

    const mediaLines: string[] = [];
    if (scene.imageUrl) {
      mediaLines.push(`Image: ${scene.imageUrl}`);
    }
    if (scene.audioUrl) {
      mediaLines.push(`Audio: ${scene.audioUrl}`);
    }
    if (scene.videoUrl) {
      mediaLines.push(`Video: ${scene.videoUrl}`);
    }

    if (mediaLines.length > 0) {
      addLabelValue(
        "Generated media",
        mediaLines.join("\n")
      );
    }

    if (index < projectData.scenes.length - 1) {
      ensureSpace(8);
      pdf.setDrawColor(210);
      pdf.line(
        marginLeft,
        currentY,
        pageWidth - marginRight,
        currentY
      );
      currentY += 8;
    }
  });

  const totalPages = pdf.getNumberOfPages();

  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber += 1
  ) {
    pdf.setPage(pageNumber);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(110);
    pdf.text(
      `AI Film Studio · Page ${pageNumber} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  return pdf;
}

function AppMenuBar({
  activeProjectId,
  activeProjectName,
  activeProjectRole,
  activeProjectData,
  activeLiveSessionId,
  onSaveProject,
  onJoinLiveSession,
  onLeaveLiveSession,
}: AppMenuBarProps) {
  const { user } = useAuth();

  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] =
    useState(false);

  const [shareDialogOpen, setShareDialogOpen] =
    useState(false);
  const [liveDialogOpen, setLiveDialogOpen] =
    useState(false);
  const [
    invitationsDialogOpen,
    setInvitationsDialogOpen,
  ] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [eligibleUsers, setEligibleUsers] = useState<
    EligibleUser[]
  >([]);

  const [selectedUserId, setSelectedUserId] = useState<
    number | null
  >(null);

  const [selectedRole, setSelectedRole] =
    useState<CollaborationRole>("viewer");

  const [session, setSession] =
    useState<LiveSession | null>(null);

  const [myInvitations, setMyInvitations] = useState<
    LiveInvitation[]
  >([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] =
    useState(false);
  const [isSavingProject, setIsSavingProject] =
    useState(false);
  const [isExportingZip, setIsExportingZip] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isOwner = activeProjectRole === "owner";
  const canSaveProject =
    activeProjectRole === "owner" ||
    activeProjectRole === "editor";

  const currentParticipant = session?.participants.find(
    (participant) => participant.email === user?.email
  );

  const pendingCount = useMemo(
    () =>
      myInvitations.filter(
        (invitation) => invitation.status === "pending"
      ).length,
    [myInvitations]
  );

  const closeMenus = useCallback(() => {
    setFileMenuOpen(false);
    setProjectMenuOpen(false);
  }, []);

  const handleSaveProject = useCallback(async () => {
    setFileMenuOpen(false);
    setError("");
    setMessage("");

    if (!activeProjectId) {
      setError(
        "Open or create a project before saving."
      );
      return;
    }

    if (!canSaveProject) {
      setError(
        "Viewers cannot save changes to this project."
      );
      return;
    }

    if (isSavingProject) {
      return;
    }

    try {
      setIsSavingProject(true);
      setMessage("Saving project...");

      await onSaveProject();

      setMessage("Project saved successfully.");
    } catch (saveError) {
      console.error(
        "Failed to save project:",
        saveError
      );

      setMessage("");
      setError(getErrorMessage(saveError));
    } finally {
      setIsSavingProject(false);
    }
  }, [
    activeProjectId,
    canSaveProject,
    isSavingProject,
    onSaveProject,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function refreshInvitations() {
      try {
        const invitations =
          await listMyLiveInvitations();

        if (!cancelled) {
          setMyInvitations(invitations);
        }
      } catch (requestError) {
        console.error(
          "Failed to load live collaboration invitations:",
          requestError
        );
      }
    }

    void refreshInvitations();

    const intervalId = window.setInterval(
      refreshInvitations,
      5000
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setFileMenuOpen(false);
    setProjectMenuOpen(false);
    setSession(null);
    setSearchQuery("");
    setEligibleUsers([]);
    setSelectedUserId(null);
    setError("");
    setMessage("");

    onLeaveLiveSession();
  }, [activeProjectId, onLeaveLiveSession]);

  useEffect(() => {
    if (
      !liveDialogOpen ||
      !isOwner ||
      !activeProjectId
    ) {
      return;
    }

    const timeoutId = window.setTimeout(
      async () => {
        try {
          setIsSearching(true);

          const users = await searchEligibleUsers(
            activeProjectId,
            searchQuery,
            10
          );

          setEligibleUsers(users);
        } catch (requestError) {
          setError(getErrorMessage(requestError));
        } finally {
          setIsSearching(false);
        }
      },
      300
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    searchQuery,
    liveDialogOpen,
    isOwner,
    activeProjectId,
  ]);

  useEffect(() => {
    function handleKeyboardShortcut(
      event: KeyboardEvent
    ) {
      const isSaveShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s";

      if (!isSaveShortcut) {
        return;
      }

      event.preventDefault();
      void handleSaveProject();
    }

    window.addEventListener(
      "keydown",
      handleKeyboardShortcut
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboardShortcut
      );
    };
  }, [handleSaveProject]);

  async function refreshSession() {
    if (!activeProjectId) {
      return null;
    }

    const refreshedSession =
      await getActiveProjectSession(
        activeProjectId
      );

    setSession(refreshedSession);

    return refreshedSession;
  }

  function handleFileMenuToggle() {
    setProjectMenuOpen(false);

    setFileMenuOpen((current) => !current);
  }

  function handleProjectMenuToggle() {
    setFileMenuOpen(false);

    setProjectMenuOpen((current) => !current);
  }

  function handleExportMp4() {
    setFileMenuOpen(false);
    setError("");
    setMessage("");

    if (!activeProjectId) {
      setError(
        "Open a project before exporting an MP4 file."
      );
      return;
    }

    const finalMovieUrl =
      activeProjectData.finalMovieUrl;

    if (!finalMovieUrl) {
      setError(
        "Generate a final movie before exporting as MP4."
      );
      return;
    }

    const downloadLink =
      document.createElement("a");

    downloadLink.href = finalMovieUrl;
    downloadLink.download = `${createSafeFileName(
      activeProjectName ||
        activeProjectData.movieTitle ||
        "ai-film-studio-movie"
    )}.mp4`;

    downloadLink.target = "_blank";
    downloadLink.rel = "noopener noreferrer";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    setMessage("MP4 export started.");
  }

  function handleExportPdf() {
    setFileMenuOpen(false);
    setError("");
    setMessage("");

    if (!activeProjectId) {
      setError(
        "Open a project before exporting a storyboard."
      );
      return;
    }

    if (activeProjectData.scenes.length === 0) {
      setError(
        "Generate at least one storyboard scene before exporting a PDF."
      );
      return;
    }

    try {
      const projectTitle =
        activeProjectName ||
        activeProjectData.movieTitle ||
        "Untitled Project";

      const pdf = createStoryboardPdf(
        projectTitle,
        activeProjectData
      );

      pdf.save(
        `${createSafeFileName(projectTitle)}-storyboard.pdf`
      );

      setMessage(
        "Storyboard PDF exported successfully."
      );
    } catch (pdfError) {
      console.error(
        "Failed to export storyboard PDF:",
        pdfError
      );
      setMessage("");
      setError(
        "The storyboard PDF could not be created."
      );
    }
  }

  function handleExportJson() {
    setFileMenuOpen(false);
    setError("");
    setMessage("");

    if (!activeProjectId) {
      setError(
        "Open a project before exporting project data."
      );
      return;
    }

    const exportData = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      project: {
        id: activeProjectId,
        name:
          activeProjectName ||
          activeProjectData.movieTitle ||
          "Untitled Project",
        role: activeProjectRole ?? null,
        data: activeProjectData,
      },
    };

    const jsonContent = JSON.stringify(
      exportData,
      null,
      2
    );

    const jsonBlob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8",
    });

    const downloadUrl =
      URL.createObjectURL(jsonBlob);

    const downloadLink =
      document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = `${createSafeFileName(
      activeProjectName ||
        activeProjectData.movieTitle ||
        "ai-film-studio-project"
    )}.json`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 100);

    setMessage(
      "Project JSON exported successfully."
    );
  }

  async function handleExportZip() {
    setFileMenuOpen(false);
    setError("");
    setMessage("");

    if (!activeProjectId) {
      setError(
        "Open a project before exporting a ZIP file."
      );
      return;
    }

    if (isExportingZip) {
      return;
    }

    try {
      setIsExportingZip(true);
      setMessage("Preparing project ZIP...");

      await downloadProjectZip(activeProjectId, {
        fallbackFileName:
          activeProjectName ||
          activeProjectData.movieTitle ||
          "ai-film-studio-project",
      });

      setMessage(
        "Project ZIP exported successfully."
      );
    } catch (zipError) {
      console.error(
        "Failed to export project ZIP:",
        zipError
      );

      setMessage("");
      setError(getErrorMessage(zipError));
    } finally {
      setIsExportingZip(false);
    }
  }

  async function openLiveDialog() {
    closeMenus();
    setLiveDialogOpen(true);
    setError("");
    setMessage("");

    if (!activeProjectId) {
      return;
    }

    try {
      setIsLoading(true);

      const activeSession =
        await getActiveProjectSession(
          activeProjectId
        );

      setSession(activeSession);

      if (isOwner) {
        const users = await searchEligibleUsers(
          activeProjectId,
          "",
          10
        );

        setEligibleUsers(users);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendInvitation() {
    if (
      !activeProjectId ||
      selectedUserId === null
    ) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setMessage("");

      const currentSession =
        session ??
        (await createLiveSession(
          activeProjectId
        ));

      const invitation =
        await sendLiveInvitation(
          currentSession.id,
          selectedUserId,
          selectedRole
        );

      await refreshSession();

      onJoinLiveSession(currentSession.id);
      setSelectedUserId(null);
      setSearchQuery("");

      setMessage(
        `Invitation sent to ${invitation.invitedUserEmail} as ${invitation.role}.`
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleParticipantRoleChange(
    participantId: number,
    role: CollaborationRole
  ) {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);

      await updateLiveParticipantRole(
        session.id,
        participantId,
        role
      );

      await refreshSession();

      setMessage(
        `Participant role changed to ${role}.`
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveParticipant(
    participantId: number
  ) {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);

      await removeLiveParticipant(
        session.id,
        participantId
      );

      await refreshSession();

      setMessage(
        "Participant removed from the live session."
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRevoke(
    invitationId: number
  ) {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);

      await revokeLiveInvitation(
        session.id,
        invitationId
      );

      await refreshSession();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCloseSession() {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);

      await closeLiveSession(session.id);

      setSession(null);
      onLeaveLiveSession();

      setMessage(
        "Live collaboration session closed."
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRespond(
    invitation: LiveInvitation,
    response: "accepted" | "declined"
  ) {
    try {
      setIsLoading(true);
      setError("");

      const updatedInvitation =
        await respondToLiveInvitation(
          invitation.id,
          response
        );

      setMyInvitations(
        (currentInvitations) =>
          currentInvitations.filter(
            (item) =>
              item.id !== invitation.id
          )
      );

      if (response === "accepted") {
        setInvitationsDialogOpen(false);

        if (
          updatedInvitation.projectId ===
          activeProjectId
        ) {
          onJoinLiveSession(
            updatedInvitation.sessionId
          );

          setMessage(
            `Joined ${updatedInvitation.projectName} as ${updatedInvitation.role}.`
          );
        } else {
          setMessage(
            `Invitation accepted as ${updatedInvitation.role}. Open ${updatedInvitation.projectName} and choose Project → Live collaboration → Join live session.`
          );
        }
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <header className="app-menu-bar">
        <div className="app-menu-left">
          <div className="app-logo">
            🎬 AI Film Studio
          </div>

          <div className="app-menu-dropdown">
            <button
              type="button"
              onClick={handleFileMenuToggle}
              aria-expanded={fileMenuOpen}
              aria-haspopup="menu"
            >
              File
            </button>

            {fileMenuOpen && (
              <div
                className="app-menu-dropdown-content file-menu-dropdown"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    void handleSaveProject()
                  }
                  disabled={
                    !activeProjectId ||
                    !canSaveProject ||
                    isSavingProject
                  }
                >
                  <FiSave />

                  <span className="app-menu-item-label">
                    {isSavingProject
                      ? "Saving project..."
                      : "Save project"}
                  </span>

                  <span className="app-menu-shortcut">
                    Ctrl+S
                  </span>
                </button>

                <div
                  className="menu-divider"
                  role="separator"
                />

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportMp4}
                  disabled={
                    !activeProjectId ||
                    !activeProjectData.finalMovieUrl
                  }
                >
                  <FiFilm />
                  <span>Export as MP4</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportPdf}
                  disabled={
                    !activeProjectId ||
                    activeProjectData.scenes.length === 0
                  }
                  title={
                    activeProjectData.scenes.length === 0
                      ? "Generate at least one storyboard scene first"
                      : "Export storyboard as PDF"
                  }
                >
                  <FiFileText />

                  <span>
                    Export storyboard as PDF
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportJson}
                  disabled={!activeProjectId}
                >
                  <FiDownload />

                  <span>
                    Export project as JSON
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    void handleExportZip()
                  }
                  disabled={
                    !activeProjectId ||
                    isExportingZip
                  }
                >
                  <FiArchive />

                  <span>
                    {isExportingZip
                      ? "Preparing ZIP..."
                      : "Export project as ZIP"}
                  </span>
                </button>
              </div>
            )}
          </div>

          <button type="button">
            Edit
          </button>

          <div className="app-menu-dropdown">
            <button
              type="button"
              onClick={
                handleProjectMenuToggle
              }
              aria-expanded={
                projectMenuOpen
              }
              aria-haspopup="menu"
            >
              Project
            </button>

            {projectMenuOpen && (
              <div
                className="app-menu-dropdown-content"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenus();
                    setShareDialogOpen(true);
                  }}
                >
                  <FiShare2 />
                  Share project
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    void openLiveDialog()
                  }
                >
                  <FiRadio />
                  Live collaboration
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenus();
                    setInvitationsDialogOpen(
                      true
                    );
                  }}
                >
                  <FiUserPlus />
                  Invitations

                  {pendingCount > 0 && (
                    <span className="menu-count-badge">
                      {pendingCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          <button type="button">
            Generate
          </button>

          <button type="button">
            View
          </button>

          <button type="button">
            Tools
          </button>

          <button type="button">
            Window
          </button>

          <button type="button">
            Help
          </button>
        </div>

        <div className="app-menu-right">
          {activeLiveSessionId ? (
            <span className="live-active-label">
              ● Live session active
            </span>
          ) : error ? (
            <span className="menu-status-error">
              {error}
            </span>
          ) : message ? (
            <span className="menu-status-message">
              {message}
            </span>
          ) : (
            <span>Cloud Project</span>
          )}
        </div>
      </header>

      {shareDialogOpen && (
        <div
          className="share-dialog-overlay"
          onClick={() =>
            setShareDialogOpen(false)
          }
        >
          <div
            className="share-dialog"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="share-dialog-header">
              <div>
                <h2>Share project</h2>

                <p>
                  Manage permanent project access.
                </p>
              </div>

              <button
                type="button"
                className="share-dialog-close"
                onClick={() =>
                  setShareDialogOpen(false)
                }
                aria-label="Close share project dialog"
              >
                <FiX />
              </button>
            </div>

            <p className="dialog-info">
              Add users as project Editors or
              Viewers before inviting them to a
              live session.
            </p>
          </div>
        </div>
      )}

      {liveDialogOpen && (
        <div
          className="share-dialog-overlay"
          onClick={() =>
            setLiveDialogOpen(false)
          }
        >
          <div
            className="share-dialog live-dialog"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="share-dialog-header">
              <div>
                <h2>Live collaboration</h2>

                <p>
                  {activeProjectName ||
                    "Current project"}
                </p>
              </div>

              <button
                type="button"
                className="share-dialog-close"
                onClick={() =>
                  setLiveDialogOpen(false)
                }
                aria-label="Close live collaboration dialog"
              >
                <FiX />
              </button>
            </div>

            {error && (
              <div className="dialog-message dialog-error">
                {error}
              </div>
            )}

            {message && (
              <div className="dialog-message dialog-success">
                {message}
              </div>
            )}

            {!isOwner && (
              <div className="dialog-info">
                {currentParticipant ? (
                  <>
                    <p>
                      You have{" "}
                      <strong>
                        {currentParticipant.role}
                      </strong>{" "}
                      access in this live session.
                    </p>

                    <button
                      type="button"
                      className="primary-dialog-button"
                      onClick={() => {
                        if (session) {
                          onJoinLiveSession(
                            session.id
                          );
                        }
                      }}
                    >
                      <FiRadio />
                      Join live session
                    </button>
                  </>
                ) : (
                  <p>
                    You need an accepted
                    invitation before joining
                    this session.
                  </p>
                )}
              </div>
            )}

            {isOwner && (
              <>
                <div className="live-search-row">
                  <div className="share-dialog-field live-search-field">
                    <label htmlFor="live-user-search">
                      Search project members
                    </label>

                    <div className="search-input-wrapper">
                      <FiSearch />

                      <input
                        id="live-user-search"
                        type="search"
                        value={searchQuery}
                        onChange={(event) =>
                          setSearchQuery(
                            event.target.value
                          )
                        }
                        placeholder="Search by email..."
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="share-dialog-field live-role-field">
                    <label htmlFor="live-role">
                      Invite as
                    </label>

                    <select
                      id="live-role"
                      value={selectedRole}
                      onChange={(event) =>
                        setSelectedRole(
                          event.target
                            .value as CollaborationRole
                        )
                      }
                      disabled={isLoading}
                    >
                      <option value="viewer">
                        Viewer
                      </option>

                      <option value="editor">
                        Editor
                      </option>
                    </select>
                  </div>
                </div>

                <div className="user-search-results">
                  {isSearching ? (
                    <p className="muted-dialog-text">
                      Searching...
                    </p>
                  ) : eligibleUsers.length ===
                    0 ? (
                    <p className="muted-dialog-text">
                      No matching project
                      members.
                    </p>
                  ) : (
                    eligibleUsers.map(
                      (eligibleUser) => (
                        <button
                          type="button"
                          key={
                            eligibleUser.userId
                          }
                          className={
                            selectedUserId ===
                            eligibleUser.userId
                              ? "user-search-result selected"
                              : "user-search-result"
                          }
                          onClick={() =>
                            setSelectedUserId(
                              eligibleUser.userId
                            )
                          }
                        >
                          <span>
                            {eligibleUser.email}
                          </span>

                          <small>
                            Project role:{" "}
                            {
                              eligibleUser.projectRole
                            }
                          </small>
                        </button>
                      )
                    )
                  )}
                </div>

                <button
                  type="button"
                  className="primary-dialog-button"
                  onClick={() =>
                    void handleSendInvitation()
                  }
                  disabled={
                    selectedUserId === null ||
                    isLoading
                  }
                >
                  <FiUserPlus />

                  {`Send ${selectedRole} invitation`}
                </button>

                <div className="invitation-list">
                  <h3>
                    Pending and answered
                    invitations
                  </h3>

                  {!session ||
                  session.invitations.length ===
                    0 ? (
                    <p className="muted-dialog-text">
                      No invitations sent yet.
                    </p>
                  ) : (
                    session.invitations.map(
                      (invitation) => (
                        <div
                          className="invitation-row"
                          key={invitation.id}
                        >
                          <div>
                            <strong>
                              {
                                invitation.invitedUserEmail
                              }
                            </strong>

                            <span className="role-badge">
                              {invitation.role}
                            </span>

                            <span
                              className={`status-badge status-${invitation.status}`}
                            >
                              {invitation.status}
                            </span>
                          </div>

                          {invitation.status !==
                            "accepted" && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleRevoke(
                                  invitation.id
                                )
                              }
                              disabled={isLoading}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      )
                    )
                  )}
                </div>

                <div className="invitation-list">
                  <h3>
                    Active participants
                  </h3>

                  {!session ||
                  session.participants.length ===
                    0 ? (
                    <p className="muted-dialog-text">
                      No one has accepted yet.
                    </p>
                  ) : (
                    session.participants.map(
                      (participant) => (
                        <div
                          className="participant-row"
                          key={participant.id}
                        >
                          <strong>
                            {participant.email}
                          </strong>

                          <select
                            value={
                              participant.role
                            }
                            onChange={(event) =>
                              void handleParticipantRoleChange(
                                participant.id,
                                event.target
                                  .value as CollaborationRole
                              )
                            }
                            disabled={isLoading}
                          >
                            <option value="viewer">
                              Viewer
                            </option>

                            <option value="editor">
                              Editor
                            </option>
                          </select>

                          <button
                            type="button"
                            className="icon-danger-button"
                            onClick={() =>
                              void handleRemoveParticipant(
                                participant.id
                              )
                            }
                            disabled={isLoading}
                            aria-label={`Remove ${participant.email}`}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      )
                    )
                  )}
                </div>

                {session && (
                  <div className="share-dialog-actions">
                    <button
                      type="button"
                      className="danger-dialog-button"
                      onClick={() =>
                        void handleCloseSession()
                      }
                    >
                      Close session
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {invitationsDialogOpen && (
        <div
          className="share-dialog-overlay"
          onClick={() =>
            setInvitationsDialogOpen(false)
          }
        >
          <div
            className="share-dialog live-dialog"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="share-dialog-header">
              <div>
                <h2>
                  Live collaboration invitations
                </h2>

                <p>
                  Review the requested role before
                  accepting.
                </p>
              </div>

              <button
                type="button"
                className="share-dialog-close"
                onClick={() =>
                  setInvitationsDialogOpen(false)
                }
                aria-label="Close invitations dialog"
              >
                <FiX />
              </button>
            </div>

            {error && (
              <div className="dialog-message dialog-error">
                {error}
              </div>
            )}

            {myInvitations.length === 0 ? (
              <p className="dialog-info">
                You have no pending
                invitations.
              </p>
            ) : (
              <div className="invitation-list">
                {myInvitations.map(
                  (invitation) => (
                    <div
                      className="incoming-invitation"
                      key={invitation.id}
                    >
                      <div>
                        <strong>
                          {
                            invitation.projectName
                          }
                        </strong>

                        <p>
                          Invited by{" "}
                          {
                            invitation.invitedByEmail
                          }
                        </p>

                        <span className="role-badge">
                          Role:{" "}
                          {invitation.role}
                        </span>
                      </div>

                      <div className="incoming-invitation-actions">
                        <button
                          type="button"
                          className="accept-button"
                          onClick={() =>
                            void handleRespond(
                              invitation,
                              "accepted"
                            )
                          }
                          disabled={isLoading}
                        >
                          <FiCheck />
                          Accept
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleRespond(
                              invitation,
                              "declined"
                            )
                          }
                          disabled={isLoading}
                        >
                          <FiX />
                          Decline
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default AppMenuBar;