import type {
  SavedProjectData,
  StoredProject,
} from "../utils/projectStorage";

interface ProjectManagerProps {
  projects: StoredProject[];
  activeProjectId: string;
  currentProjectData: SavedProjectData;
  onCreateProject: () => void;
  onOpenProject: (projectId: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

function formatUpdatedDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

function getProjectPreviewTitle(project: StoredProject) {
  return (
    project.data.movieTitle.trim() ||
    project.name.trim() ||
    "Untitled Project"
  );
}

function ProjectManager({
  projects,
  activeProjectId,
  currentProjectData,
  onCreateProject,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
}: ProjectManagerProps) {
  const totalScenes = currentProjectData.scenes.length;
  const generatedVideos = currentProjectData.scenes.filter(
    (scene) => scene.videoUrl
  ).length;

  return (
    <section className="card card-dark p-4 mb-5">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
        <div>
          <span className="text-uppercase small fw-bold text-info">
            Project Manager
          </span>
          <h2 className="h3 fw-bold mt-2 mb-2">My Film Projects</h2>
          <p className="muted-text mb-0">
            Create, open, duplicate and delete your projects. Everything is
            securely stored in your account.
          </p>
        </div>

        <button
          className="btn btn-gradient"
          type="button"
          onClick={onCreateProject}
        >
          + New Project
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="p-3 rounded border bg-dark h-100">
            <p className="muted-text small mb-1">Current title</p>
            <h3 className="h5 fw-bold mb-0">
              {currentProjectData.movieTitle || "Untitled Project"}
            </h3>
          </div>
        </div>

        <div className="col-md-4">
          <div className="p-3 rounded border bg-dark h-100">
            <p className="muted-text small mb-1">Scenes</p>
            <h3 className="h5 fw-bold mb-0">{totalScenes}</h3>
          </div>
        </div>

        <div className="col-md-4">
          <div className="p-3 rounded border bg-dark h-100">
            <p className="muted-text small mb-1">Generated videos</p>
            <h3 className="h5 fw-bold mb-0">
              {generatedVideos}/{totalScenes || 0}
            </h3>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="p-4 rounded border bg-dark text-center">
          <h3 className="h5 fw-bold mb-2">No projects yet</h3>
          <p className="muted-text mb-3">
            Create your first movie project to start saving work to your account.
          </p>

          <button
            className="btn btn-gradient"
            type="button"
            onClick={onCreateProject}
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {projects.map((project) => {
            const isActive = project.id === activeProjectId;
            const previewTitle = getProjectPreviewTitle(project);
            const sceneCount = project.data.scenes.length;
            const videoCount = project.data.scenes.filter(
              (scene) => scene.videoUrl
            ).length;

            return (
              <div className="col-md-6 col-xl-4" key={project.id}>
                <div
                  className={`h-100 rounded border p-3 ${
                    isActive ? "border-info bg-dark" : "bg-dark"
                  }`}
                >
                  <div
                    className="rounded mb-3 overflow-hidden d-flex align-items-center justify-content-center"
                    style={{
                      height: 130,
                      background:
                        "linear-gradient(135deg, rgba(99,102,241,0.32), rgba(236,72,153,0.24))",
                    }}
                  >
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={previewTitle}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span className="muted-text small">No thumbnail yet</span>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <h3 className="h5 fw-bold mb-0">{previewTitle}</h3>

                    {isActive && (
                      <span className="badge text-bg-info">Active</span>
                    )}
                  </div>

                  <p className="muted-text small mb-3">
                    Updated {formatUpdatedDate(project.updatedAt)}
                  </p>

                  <div className="d-flex gap-2 flex-wrap mb-3">
                    <span className="badge text-bg-dark border">
                      {sceneCount} scenes
                    </span>
                    <span className="badge text-bg-dark border">
                      {videoCount} videos
                    </span>
                    <span className="badge text-bg-dark border">
                      {project.data.style}
                    </span>
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className="btn btn-outline-light btn-sm"
                      type="button"
                      disabled={isActive}
                      onClick={() => onOpenProject(project.id)}
                    >
                      Open
                    </button>

                    <button
                      className="btn btn-outline-light btn-sm"
                      type="button"
                      onClick={() => onDuplicateProject(project.id)}
                    >
                      Duplicate
                    </button>

                    <button
                      className="btn btn-outline-danger btn-sm"
                      type="button"
                      onClick={() => onDeleteProject(project.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ProjectManager;