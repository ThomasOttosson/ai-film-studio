import { useState } from "react";
import { FiShare2, FiX } from "react-icons/fi";
import "./AppMenuBar.css";

function AppMenuBar() {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  function openShareDialog() {
    setShareDialogOpen(true);
  }

  function closeShareDialog() {
    setShareDialogOpen(false);
  }

  return (
    <>
      <header className="app-menu-bar">
        <div className="app-menu-left">
          <div className="app-logo">🎬 AI Film Studio</div>

          <button type="button">File</button>
          <button type="button">Edit</button>

          <details className="app-menu-dropdown">
            <summary>Project</summary>

            <div className="app-menu-dropdown-content" role="menu">
              <button
                type="button"
                onClick={openShareDialog}
                role="menuitem"
              >
                <FiShare2 />
                Share project
              </button>
            </div>
          </details>

          <button type="button">Generate</button>
          <button type="button">View</button>
          <button type="button">Tools</button>
          <button type="button">Window</button>
          <button type="button">Help</button>
        </div>

        <div className="app-menu-right">
          <span>Cloud Project</span>
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
                <p>Sharing will be connected to the backend in the next step.</p>
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

            <div className="share-dialog-field">
              <label htmlFor="share-email">User email</label>
              <input
                id="share-email"
                type="email"
                placeholder="editor@example.com"
                disabled
              />
            </div>

            <div className="share-dialog-field">
              <label htmlFor="share-role">Role</label>
              <select id="share-role" disabled>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>

            <div className="share-dialog-actions">
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