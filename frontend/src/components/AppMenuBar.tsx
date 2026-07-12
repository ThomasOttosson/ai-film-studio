import { useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiRadio,
  FiSearch,
  FiShare2,
  FiTrash2,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
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
import type { ProjectRole } from "../utils/projectStorage";
import { useAuth } from "../auth/AuthContext";
import "./AppMenuBar.css";

interface AppMenuBarProps {
  activeProjectId: string;
  activeProjectName: string;
  activeProjectRole?: ProjectRole;
  activeLiveSessionId: string | null;
  onJoinLiveSession: (sessionId: string) => void;
  onLeaveLiveSession: () => void;
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { detail?: string } } })
      .response;
    return response?.data?.detail ?? "The request failed.";
  }
  return error instanceof Error ? error.message : "The request failed.";
}

function AppMenuBar({
  activeProjectId,
  activeProjectName,
  activeProjectRole,
  activeLiveSessionId,
  onJoinLiveSession,
  onLeaveLiveSession,
}: AppMenuBarProps) {
  const { user } = useAuth();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [liveDialogOpen, setLiveDialogOpen] = useState(false);
  const [invitationsDialogOpen, setInvitationsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<CollaborationRole>("viewer");
  const [session, setSession] = useState<LiveSession | null>(null);
  const [myInvitations, setMyInvitations] = useState<LiveInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isOwner = activeProjectRole === "owner";
  const currentParticipant = session?.participants.find(
    (participant) => participant.email === user?.email
  );

  const pendingCount = useMemo(
    () => myInvitations.filter((invite) => invite.status === "pending").length,
    [myInvitations]
  );

  useEffect(() => {
    let cancelled = false;

    async function refreshInvitations() {
      try {
        const invitations = await listMyLiveInvitations();
        if (!cancelled) setMyInvitations(invitations);
      } catch (requestError) {
        console.error("Failed to load live collaboration invitations:", requestError);
      }
    }

    void refreshInvitations();
    const intervalId = window.setInterval(refreshInvitations, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setSession(null);
    setSearchQuery("");
    setEligibleUsers([]);
    setSelectedUserId(null);
    setError("");
    setMessage("");
    onLeaveLiveSession();
  }, [activeProjectId]);

  useEffect(() => {
    if (!liveDialogOpen || !isOwner || !activeProjectId) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const users = await searchEligibleUsers(activeProjectId, searchQuery, 10);
        setEligibleUsers(users);
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery, liveDialogOpen, isOwner, activeProjectId]);

  async function refreshSession() {
    if (!activeProjectId) return null;
    const refreshed = await getActiveProjectSession(activeProjectId);
    setSession(refreshed);
    return refreshed;
  }

  async function openLiveDialog() {
    setProjectMenuOpen(false);
    setLiveDialogOpen(true);
    setError("");
    setMessage("");

    if (!activeProjectId) return;

    try {
      setIsLoading(true);
      const activeSession = await getActiveProjectSession(activeProjectId);
      setSession(activeSession);
      if (isOwner) {
        const users = await searchEligibleUsers(activeProjectId, "", 10);
        setEligibleUsers(users);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendInvitation() {
    if (!activeProjectId || selectedUserId === null) return;

    try {
      setIsLoading(true);
      setError("");
      setMessage("");

      const currentSession = session ?? (await createLiveSession(activeProjectId));
      const invitation = await sendLiveInvitation(
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
    if (!session) return;
    try {
      setIsLoading(true);
      await updateLiveParticipantRole(session.id, participantId, role);
      await refreshSession();
      setMessage(`Participant role changed to ${role}.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveParticipant(participantId: number) {
    if (!session) return;
    try {
      setIsLoading(true);
      await removeLiveParticipant(session.id, participantId);
      await refreshSession();
      setMessage("Participant removed from the live session.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRevoke(invitationId: number) {
    if (!session) return;
    try {
      setIsLoading(true);
      await revokeLiveInvitation(session.id, invitationId);
      await refreshSession();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCloseSession() {
    if (!session) return;
    try {
      setIsLoading(true);
      await closeLiveSession(session.id);
      setSession(null);
      onLeaveLiveSession();
      setMessage("Live collaboration session closed.");
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
      const updated = await respondToLiveInvitation(invitation.id, response);
      setMyInvitations((current) =>
        current.filter((item) => item.id !== invitation.id)
      );

      if (response === "accepted") {
        setInvitationsDialogOpen(false);
        if (updated.projectId === activeProjectId) {
          onJoinLiveSession(updated.sessionId);
          setMessage(
            `Joined ${updated.projectName} as ${updated.role}.`
          );
        } else {
          setMessage(
            `Invitation accepted as ${updated.role}. Open ${updated.projectName} and choose Project → Live collaboration → Join live session.`
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
          <div className="app-logo">🎬 AI Film Studio</div>
          <button type="button">File</button>
          <button type="button">Edit</button>

          <div className="app-menu-dropdown">
            <button
              type="button"
              onClick={() => setProjectMenuOpen((current) => !current)}
              aria-expanded={projectMenuOpen}
            >
              Project
            </button>

            {projectMenuOpen && (
              <div className="app-menu-dropdown-content" role="menu">
                <button
                  type="button"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    setShareDialogOpen(true);
                  }}
                >
                  <FiShare2 /> Share project
                </button>

                <button type="button" onClick={openLiveDialog}>
                  <FiRadio /> Live collaboration
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    setInvitationsDialogOpen(true);
                  }}
                >
                  <FiUserPlus /> Invitations
                  {pendingCount > 0 && (
                    <span className="menu-count-badge">{pendingCount}</span>
                  )}
                </button>
              </div>
            )}
          </div>

          <button type="button">Generate</button>
          <button type="button">View</button>
          <button type="button">Tools</button>
          <button type="button">Window</button>
          <button type="button">Help</button>
        </div>

        <div className="app-menu-right">
          {activeLiveSessionId ? (
            <span className="live-active-label">● Live session active</span>
          ) : (
            <span>Cloud Project</span>
          )}
        </div>
      </header>

      {shareDialogOpen && (
        <div className="share-dialog-overlay" onClick={() => setShareDialogOpen(false)}>
          <div className="share-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="share-dialog-header">
              <div>
                <h2>Share project</h2>
                <p>Manage permanent project access.</p>
              </div>
              <button className="share-dialog-close" onClick={() => setShareDialogOpen(false)}>
                <FiX />
              </button>
            </div>
            <p className="dialog-info">
              Add users as project Editors or Viewers before inviting them to a live session.
            </p>
          </div>
        </div>
      )}

      {liveDialogOpen && (
        <div className="share-dialog-overlay" onClick={() => setLiveDialogOpen(false)}>
          <div className="share-dialog live-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="share-dialog-header">
              <div>
                <h2>Live collaboration</h2>
                <p>{activeProjectName || "Current project"}</p>
              </div>
              <button className="share-dialog-close" onClick={() => setLiveDialogOpen(false)}>
                <FiX />
              </button>
            </div>

            {error && <div className="dialog-message dialog-error">{error}</div>}
            {message && <div className="dialog-message dialog-success">{message}</div>}

            {!isOwner && (
              <div className="dialog-info">
                {currentParticipant ? (
                  <>
                    <p>
                      You have <strong>{currentParticipant.role}</strong> access in this live session.
                    </p>
                    <button
                      type="button"
                      className="primary-dialog-button"
                      onClick={() => session && onJoinLiveSession(session.id)}
                    >
                      <FiRadio /> Join live session
                    </button>
                  </>
                ) : (
                  <p>You need an accepted invitation before joining this session.</p>
                )}
              </div>
            )}

            {isOwner && (
              <>
                <div className="live-search-row">
                  <div className="share-dialog-field live-search-field">
                    <label htmlFor="live-user-search">Search project members</label>
                    <div className="search-input-wrapper">
                      <FiSearch />
                      <input
                        id="live-user-search"
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by email..."
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="share-dialog-field live-role-field">
                    <label htmlFor="live-role">Invite as</label>
                    <select
                      id="live-role"
                      value={selectedRole}
                      onChange={(event) =>
                        setSelectedRole(event.target.value as CollaborationRole)
                      }
                      disabled={isLoading}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                  </div>
                </div>

                <div className="user-search-results">
                  {isSearching ? (
                    <p className="muted-dialog-text">Searching...</p>
                  ) : eligibleUsers.length === 0 ? (
                    <p className="muted-dialog-text">No matching project members.</p>
                  ) : (
                    eligibleUsers.map((eligibleUser) => (
                      <button
                        type="button"
                        key={eligibleUser.userId}
                        className={
                          selectedUserId === eligibleUser.userId
                            ? "user-search-result selected"
                            : "user-search-result"
                        }
                        onClick={() => setSelectedUserId(eligibleUser.userId)}
                      >
                        <span>{eligibleUser.email}</span>
                        <small>Project role: {eligibleUser.projectRole}</small>
                      </button>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  className="primary-dialog-button"
                  onClick={handleSendInvitation}
                  disabled={selectedUserId === null || isLoading}
                >
                  <FiUserPlus /> Send {selectedRole} invitation
                </button>

                <div className="invitation-list">
                  <h3>Pending and answered invitations</h3>
                  {!session || session.invitations.length === 0 ? (
                    <p className="muted-dialog-text">No invitations sent yet.</p>
                  ) : (
                    session.invitations.map((invitation) => (
                      <div className="invitation-row" key={invitation.id}>
                        <div>
                          <strong>{invitation.invitedUserEmail}</strong>
                          <span className="role-badge">{invitation.role}</span>
                          <span className={`status-badge status-${invitation.status}`}>
                            {invitation.status}
                          </span>
                        </div>
                        {invitation.status !== "accepted" && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(invitation.id)}
                            disabled={isLoading}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="invitation-list">
                  <h3>Active participants</h3>
                  {!session || session.participants.length === 0 ? (
                    <p className="muted-dialog-text">No one has accepted yet.</p>
                  ) : (
                    session.participants.map((participant) => (
                      <div className="participant-row" key={participant.id}>
                        <strong>{participant.email}</strong>
                        <select
                          value={participant.role}
                          onChange={(event) =>
                            void handleParticipantRoleChange(
                              participant.id,
                              event.target.value as CollaborationRole
                            )
                          }
                          disabled={isLoading}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button
                          type="button"
                          className="icon-danger-button"
                          onClick={() => void handleRemoveParticipant(participant.id)}
                          disabled={isLoading}
                          aria-label={`Remove ${participant.email}`}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {session && (
                  <div className="share-dialog-actions">
                    <button type="button" className="danger-dialog-button" onClick={handleCloseSession}>
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
        <div className="share-dialog-overlay" onClick={() => setInvitationsDialogOpen(false)}>
          <div className="share-dialog live-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="share-dialog-header">
              <div>
                <h2>Live collaboration invitations</h2>
                <p>Review the requested role before accepting.</p>
              </div>
              <button className="share-dialog-close" onClick={() => setInvitationsDialogOpen(false)}>
                <FiX />
              </button>
            </div>

            {error && <div className="dialog-message dialog-error">{error}</div>}

            {myInvitations.length === 0 ? (
              <p className="dialog-info">You have no pending invitations.</p>
            ) : (
              <div className="invitation-list">
                {myInvitations.map((invitation) => (
                  <div className="incoming-invitation" key={invitation.id}>
                    <div>
                      <strong>{invitation.projectName}</strong>
                      <p>Invited by {invitation.invitedByEmail}</p>
                      <span className="role-badge">Role: {invitation.role}</span>
                    </div>
                    <div className="incoming-invitation-actions">
                      <button
                        type="button"
                        className="accept-button"
                        onClick={() => handleRespond(invitation, "accepted")}
                        disabled={isLoading}
                      >
                        <FiCheck /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespond(invitation, "declined")}
                        disabled={isLoading}
                      >
                        <FiX /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default AppMenuBar;