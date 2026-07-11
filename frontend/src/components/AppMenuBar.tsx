import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { FiRefreshCw, FiShare2, FiTrash2, FiX } from "react-icons/fi";
import {
  inviteProjectMember,
  listProjectMembers,
  removeProjectMember,
  updateProjectMemberRole,
  type ProjectMember,
} from "../api/collaborationApi";
import type { ProjectRole } from "../utils/projectStorage";
import "./AppMenuBar.css";

interface AppMenuBarProps {
  activeProjectId: string;
  activeProjectName: string;
  activeProjectRole?: ProjectRole;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (error as {
      response?: { data?: { detail?: string } };
    }).response;

    if (response?.data?.detail) {
      return response.data.detail;
    }
  }

  return "Something went wrong. Please try again.";
}

function AppMenuBar({
  activeProjectId,
  activeProjectName,
  activeProjectRole = "owner",
}: AppMenuBarProps) {
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canManageMembers = activeProjectRole === "owner";

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0)),
    [members]
  );

  async function loadMembers() {
    if (!activeProjectId) return;

    try {
      setIsLoadingMembers(true);
      setErrorMessage("");
      const projectMembers = await listProjectMembers(activeProjectId);
      setMembers(projectMembers);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingMembers(false);
    }
  }

  function toggleProjectMenu() {
    setProjectMenuOpen((current) => !current);
  }

  function openShareDialog() {
    setProjectMenuOpen(false);
    setShareDialogOpen(true);
    setEmail("");
    setRole("viewer");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeShareDialog() {
    setShareDialogOpen(false);
  }

  useEffect(() => {
    if (shareDialogOpen) {
      void loadMembers();
    }
  }, [shareDialogOpen, activeProjectId]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !activeProjectId) return;

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const newMember = await inviteProjectMember(
        activeProjectId,
        normalizedEmail,
        role
      );

      setMembers((current) => [...current, newMember]);
      setEmail("");
      setSuccessMessage(`${newMember.email} was added as ${newMember.role}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRoleChange(
    member: ProjectMember,
    nextRole: "editor" | "viewer"
  ) {
    try {
      setErrorMessage("");
      setSuccessMessage("");

      const updatedMember = await updateProjectMemberRole(
        activeProjectId,
        member.id,
        nextRole
      );

      setMembers((current) =>
        current.map((item) =>
          item.id === updatedMember.id ? updatedMember : item
        )
      );
      setSuccessMessage(`${updatedMember.email} is now ${updatedMember.role}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleRemove(member: ProjectMember) {
    const shouldRemove = window.confirm(
      `Remove ${member.email} from this project?`
    );

    if (!shouldRemove) return;

    try {
      setErrorMessage("");
      setSuccessMessage("");
      await removeProjectMember(activeProjectId, member.id);
      setMembers((current) => current.filter((item) => item.id !== member.id));
      setSuccessMessage(`${member.email} was removed.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
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
              onClick={toggleProjectMenu}
              aria-expanded={projectMenuOpen}
              aria-haspopup="menu"
            >
              Project
            </button>

            {projectMenuOpen && (
              <div className="app-menu-dropdown-content" role="menu">
                <button
                  type="button"
                  onClick={openShareDialog}
                  role="menuitem"
                  disabled={!activeProjectId}
                >
                  <FiShare2 />
                  Share project
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
          <span>{activeProjectName || "Cloud Project"}</span>
        </div>
      </header>

      {shareDialogOpen && (
        <div
          className="share-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-project-title"
          onClick={closeShareDialog}
        >
          <div
            className="share-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="share-dialog-header">
              <div>
                <h2 id="share-project-title">Share project</h2>
                <p>{activeProjectName || "Untitled Project"}</p>
              </div>

              <button
                type="button"
                className="share-dialog-close"
                onClick={closeShareDialog}
                aria-label="Close share dialog"
              >
                <FiX />
              </button>
            </div>

            {canManageMembers ? (
              <form onSubmit={handleInvite}>
                <div className="share-dialog-field">
                  <label htmlFor="share-email">User email</label>
                  <input
                    id="share-email"
                    type="email"
                    placeholder="editor@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <div className="share-dialog-field">
                  <label htmlFor="share-role">Role</label>
                  <select
                    id="share-role"
                    value={role}
                    onChange={(event) =>
                      setRole(event.target.value as "editor" | "viewer")
                    }
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>

                <div className="share-dialog-actions share-dialog-actions-between">
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => void loadMembers()}
                    disabled={isLoadingMembers}
                  >
                    <FiRefreshCw />
                    Refresh
                  </button>

                  <button
                    type="submit"
                    className="primary-action"
                    disabled={isSubmitting || !email.trim()}
                  >
                    <FiShare2 />
                    {isSubmitting ? "Adding..." : "Add member"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="share-dialog-notice">
                You can view the project members, but only the owner can manage access.
              </p>
            )}

            {errorMessage && (
              <div className="share-dialog-message share-dialog-error">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="share-dialog-message share-dialog-success">
                {successMessage}
              </div>
            )}

            <div className="share-members-section">
              <div className="share-members-heading">
                <h3>Project members</h3>
                <span>{members.length}</span>
              </div>

              {isLoadingMembers ? (
                <p className="share-members-empty">Loading members...</p>
              ) : sortedMembers.length === 0 ? (
                <p className="share-members-empty">No members found.</p>
              ) : (
                <div className="share-members-list">
                  {sortedMembers.map((member) => (
                    <div className="share-member-row" key={`${member.id}-${member.userId}`}>
                      <div className="share-member-identity">
                        <strong>{member.email}</strong>
                        <span>{member.role}</span>
                      </div>

                      {member.role !== "owner" && canManageMembers && (
                        <div className="share-member-controls">
                          <select
                            value={member.role}
                            onChange={(event) =>
                              void handleRoleChange(
                                member,
                                event.target.value as "editor" | "viewer"
                              )
                            }
                            aria-label={`Role for ${member.email}`}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>

                          <button
                            type="button"
                            className="remove-member-button"
                            onClick={() => void handleRemove(member)}
                            aria-label={`Remove ${member.email}`}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="share-dialog-footer">
              <button type="button" onClick={closeShareDialog}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AppMenuBar;