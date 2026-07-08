import type { Scene } from "../types/film";

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

function createProjectId() {
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function safeParseProjects(value: string | null): StoredProject[] {
  if (!value) return [];

  try {
    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) return [];

    return parsedValue as StoredProject[];
  } catch (error) {
    console.error("Failed to parse saved projects:", error);
    return [];
  }
}

export function getStoredProjects(): StoredProject[] {
  return safeParseProjects(localStorage.getItem(PROJECTS_STORAGE_KEY));
}

export function saveStoredProjects(projects: StoredProject[]) {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

export function getActiveProjectId() {
  return localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
}

export function setActiveProjectId(projectId: string) {
  localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId);
}

export function clearActiveProjectId() {
  localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
}

export function createStoredProject(
  name = "Untitled Project",
  data: SavedProjectData = defaultProjectData
): StoredProject {
  const now = new Date().toISOString();

  return {
    id: createProjectId(),
    name,
    createdAt: now,
    updatedAt: now,
    thumbnail: data.scenes.find((scene) => scene.imageUrl)?.imageUrl,
    data,
  };
}

export function createAndSaveProject(name = "Untitled Project") {
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
    if (project.id !== projectId) return project;

    updatedProject = {
      ...project,
      name: data.movieTitle.trim() || project.name || "Untitled Project",
      updatedAt: now,
      thumbnail: data.scenes.find((scene) => scene.imageUrl)?.imageUrl,
      data,
    };

    return updatedProject;
  });

  saveStoredProjects(updatedProjects);

  return updatedProject;
}

export function deleteStoredProject(projectId: string) {
  const projects = getStoredProjects().filter(
    (project) => project.id !== projectId
  );

  saveStoredProjects(projects);

  if (getActiveProjectId() === projectId) {
    clearActiveProjectId();
  }

  return projects;
}

export function duplicateStoredProject(projectId: string): StoredProject | null {
  const projects = getStoredProjects();
  const projectToDuplicate = projects.find((project) => project.id === projectId);

  if (!projectToDuplicate) return null;

  const now = new Date().toISOString();

  const duplicatedProject: StoredProject = {
    ...projectToDuplicate,
    id: createProjectId(),
    name: `${projectToDuplicate.name} Copy`,
    createdAt: now,
    updatedAt: now,
    data: {
      ...projectToDuplicate.data,
      movieTitle: `${projectToDuplicate.data.movieTitle || projectToDuplicate.name} Copy`,
    },
  };

  saveStoredProjects([duplicatedProject, ...projects]);
  setActiveProjectId(duplicatedProject.id);

  return duplicatedProject;
}

export function getProjectById(projectId: string) {
  return getStoredProjects().find((project) => project.id === projectId) ?? null;
}

export function getInitialProject(): StoredProject {
  const projects = getStoredProjects();
  const activeProjectId = getActiveProjectId();

  const activeProject = activeProjectId
    ? projects.find((project) => project.id === activeProjectId)
    : null;

  if (activeProject) {
    return activeProject;
  }

  if (projects[0]) {
    setActiveProjectId(projects[0].id);
    return projects[0];
  }

  return createAndSaveProject("Untitled Project");
}