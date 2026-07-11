import type { Scene } from "../types/film";

export type ProjectRole = "owner" | "editor" | "viewer";

export interface SavedProjectData {
  movieTitle: string;
  movieIdea: string;
  scenes: Scene[];
  style: string;
  sceneLength: number;
  aspectRatio: string;
  finalMovieUrl: string;
}

export interface StoredProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  data: SavedProjectData;

  /**
   * Användarens behörighet i projektet.
   *
   * owner:
   * Kan redigera, dela, ändra roller och radera projektet.
   *
   * editor:
   * Kan läsa och redigera projektet.
   *
   * viewer:
   * Kan endast läsa projektet.
   */
  role?: ProjectRole;

  /**
   * E-postadressen till projektets ägare.
   * Används främst när ett projekt har delats med en annan användare.
   */
  ownerEmail?: string;
}

const PROJECTS_STORAGE_KEY = "ai-film-studio-projects";
const ACTIVE_PROJECT_STORAGE_KEY = "ai-film-studio-active-project-id";

export const defaultProjectData: SavedProjectData = {
  movieTitle: "",
  movieIdea: "",
  scenes: [],
  style: "Cinematic",
  sceneLength: 5,
  aspectRatio: "16:9",
  finalMovieUrl: "",
};

function createProjectId(): string {
  return `project-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function cloneProjectData(data: SavedProjectData): SavedProjectData {
  return {
    ...data,
    scenes: data.scenes.map((scene) => ({ ...scene })),
  };
}

function normaliseStoredProject(project: StoredProject): StoredProject {
  return {
    ...project,
    role: project.role ?? "owner",
    data: {
      ...defaultProjectData,
      ...project.data,
      scenes: Array.isArray(project.data?.scenes)
        ? project.data.scenes
        : [],
    },
  };
}

function safeParseProjects(value: string | null): StoredProject[] {
  if (!value) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter(
        (project): project is StoredProject =>
          typeof project === "object" &&
          project !== null &&
          "id" in project &&
          "name" in project &&
          "data" in project
      )
      .map(normaliseStoredProject);
  } catch (error) {
    console.error("Failed to parse saved projects:", error);
    return [];
  }
}

export function getStoredProjects(): StoredProject[] {
  return safeParseProjects(
    localStorage.getItem(PROJECTS_STORAGE_KEY)
  );
}

export function saveStoredProjects(
  projects: StoredProject[]
): void {
  localStorage.setItem(
    PROJECTS_STORAGE_KEY,
    JSON.stringify(projects)
  );
}

export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
}

export function setActiveProjectId(projectId: string): void {
  localStorage.setItem(
    ACTIVE_PROJECT_STORAGE_KEY,
    projectId
  );
}

export function clearActiveProjectId(): void {
  localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
}

export function createStoredProject(
  name = "Untitled Project",
  data: SavedProjectData = defaultProjectData
): StoredProject {
  const now = new Date().toISOString();
  const projectData = cloneProjectData(data);

  return {
    id: createProjectId(),
    name,
    createdAt: now,
    updatedAt: now,
    thumbnail: projectData.scenes.find(
      (scene) => scene.imageUrl
    )?.imageUrl,
    data: projectData,
    role: "owner",
  };
}

export function createAndSaveProject(
  name = "Untitled Project"
): StoredProject {
  const projects = getStoredProjects();
  const project = createStoredProject(name);

  saveStoredProjects([project, ...projects]);
  setActiveProjectId(project.id);

  return project;
}

export function updateStoredProject(
  projectId: string,
  data: SavedProjectData
): StoredProject | null {
  const projects = getStoredProjects();
  const now = new Date().toISOString();

  let updatedProject: StoredProject | null = null;

  const updatedProjects = projects.map((project) => {
    if (project.id !== projectId) {
      return project;
    }

    if (project.role === "viewer") {
      console.warn(
        "Viewer projects cannot be updated."
      );

      return project;
    }

    const projectData = cloneProjectData(data);

    updatedProject = {
      ...project,
      name:
        projectData.movieTitle.trim() ||
        project.name ||
        "Untitled Project",
      updatedAt: now,
      thumbnail: projectData.scenes.find(
        (scene) => scene.imageUrl
      )?.imageUrl,
      data: projectData,
    };

    return updatedProject;
  });

  if (updatedProject) {
    saveStoredProjects(updatedProjects);
  }

  return updatedProject;
}

export function deleteStoredProject(
  projectId: string
): StoredProject[] {
  const projects = getStoredProjects();
  const project = projects.find(
    (storedProject) => storedProject.id === projectId
  );

  if (!project) {
    return projects;
  }

  if (
    project.role !== undefined &&
    project.role !== "owner"
  ) {
    console.warn(
      "Only the project owner can delete this project."
    );

    return projects;
  }

  const remainingProjects = projects.filter(
    (storedProject) => storedProject.id !== projectId
  );

  saveStoredProjects(remainingProjects);

  if (getActiveProjectId() === projectId) {
    clearActiveProjectId();
  }

  return remainingProjects;
}

export function duplicateStoredProject(
  projectId: string
): StoredProject | null {
  const projects = getStoredProjects();
  const projectToDuplicate = projects.find(
    (project) => project.id === projectId
  );

  if (!projectToDuplicate) {
    return null;
  }

  const now = new Date().toISOString();

  const originalTitle =
    projectToDuplicate.data.movieTitle.trim() ||
    projectToDuplicate.name;

  const duplicatedData = cloneProjectData(
    projectToDuplicate.data
  );

  const duplicatedProject: StoredProject = {
    ...projectToDuplicate,
    id: createProjectId(),
    name: `${projectToDuplicate.name} Copy`,
    createdAt: now,
    updatedAt: now,
    thumbnail: duplicatedData.scenes.find(
      (scene) => scene.imageUrl
    )?.imageUrl,
    role: "owner",
    ownerEmail: undefined,
    data: {
      ...duplicatedData,
      movieTitle: `${originalTitle} Copy`,
    },
  };

  saveStoredProjects([
    duplicatedProject,
    ...projects,
  ]);

  setActiveProjectId(duplicatedProject.id);

  return duplicatedProject;
}

export function getProjectById(
  projectId: string
): StoredProject | null {
  return (
    getStoredProjects().find(
      (project) => project.id === projectId
    ) ?? null
  );
}

export function getInitialProject(): StoredProject {
  const projects = getStoredProjects();
  const activeProjectId = getActiveProjectId();

  const activeProject = activeProjectId
    ? projects.find(
        (project) => project.id === activeProjectId
      )
    : null;

  if (activeProject) {
    return activeProject;
  }

  const firstProject = projects[0];

  if (firstProject) {
    setActiveProjectId(firstProject.id);
    return firstProject;
  }

  return createAndSaveProject("Untitled Project");
}

export function canEditProject(
  project: StoredProject
): boolean {
  return (
    project.role === undefined ||
    project.role === "owner" ||
    project.role === "editor"
  );
}

export function canManageProject(
  project: StoredProject
): boolean {
  return (
    project.role === undefined ||
    project.role === "owner"
  );
}

export function isProjectViewer(
  project: StoredProject
): boolean {
  return project.role === "viewer";
}