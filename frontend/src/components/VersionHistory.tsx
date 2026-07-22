import { useState } from "react";
import {
  listProjectAssetVersions,
  listSceneAssetVersions,
  restoreProjectAssetVersion,
  restoreSceneAssetVersion,
  type AssetType,
  type AssetVersion,
} from "../api/assetVersionApi";

interface VersionHistoryProps {
  projectId: string;
  assetType: AssetType;
  // Omit sceneId for project-level assets (e.g. the final movie).
  sceneId?: string | number;
  label?: string;
  onRestored: (version: AssetVersion) => void;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function VersionHistory({
  projectId,
  assetType,
  sceneId,
  label,
  onRestored,
}: VersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isImage = assetType === "image";

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data =
        sceneId === undefined
          ? await listProjectAssetVersions(projectId, assetType)
          : await listSceneAssetVersions(projectId, sceneId, assetType);
      setVersions(data.versions);
    } catch {
      setError("Could not load version history.");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) load();
  }

  async function handleRestore(version: AssetVersion) {
    setRestoringId(version.id);
    setError(null);
    try {
      const restored =
        sceneId === undefined
          ? await restoreProjectAssetVersion(projectId, assetType, version.id)
          : await restoreSceneAssetVersion(
              projectId,
              sceneId,
              assetType,
              version.id
            );
      onRestored(restored);
      await load();
    } catch {
      setError("Could not restore this version.");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={toggle}
      >
        {open ? "Hide history" : label ? `${label} history` : "History"}
      </button>

      {open && (
        <div className="mt-2">
          {loading && <p className="muted-text small mb-0">Loading…</p>}
          {error && <p className="text-danger small mb-0">{error}</p>}
          {!loading && !error && versions.length === 0 && (
            <p className="muted-text small mb-0">No versions yet.</p>
          )}

          {versions.map((version) => (
            <div
              key={version.id}
              className="d-flex align-items-center gap-2 border rounded p-2 mb-2"
            >
              {isImage && (
                <img
                  src={version.b2_url}
                  alt={`v${version.version_number}`}
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: "cover",
                    borderRadius: 4,
                  }}
                />
              )}

              <div className="flex-grow-1 small">
                <div>
                  <strong>v{version.version_number}</strong>
                  {version.model ? ` · ${version.model}` : ""}
                  {version.is_current && (
                    <span className="badge text-bg-success ms-2">current</span>
                  )}
                </div>
                <div className="muted-text">{timeAgo(version.created_at)}</div>
              </div>

              {!version.is_current && (
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  disabled={restoringId === version.id}
                  onClick={() => handleRestore(version)}
                >
                  {restoringId === version.id ? "Restoring…" : "Restore"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VersionHistory;
