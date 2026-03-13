import { defineStore } from "pinia";
import { RequestAbortedError } from "../services/api";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
  type CreateProjectPayload,
  type Project,
  type UpdateProjectPayload,
} from "../services/projects";

interface ProjectsState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  selectedProjectId: number | null;
}

export const useProjectsStore = defineStore("projects", {
  state: (): ProjectsState => ({
    projects: [],
    isLoading: false,
    error: null,
    selectedProjectId: null,
  }),

  getters: {
    activeProjects(state): Project[] {
      return state.projects.filter((project) => project.status === "active");
    },

    currentProject(state): Project | null {
      if (state.selectedProjectId == null) return null;
      const id = Number(state.selectedProjectId);
      return (
        state.projects.find((project) => Number(project.id) === id) ?? null
      );
    },
  },

  actions: {
    async fetchProjects() {
      this.isLoading = true;
      this.error = null;

      try {
        const data = await getProjects();
        this.projects = data.map((p) => ({
          ...p,
          id: Number(p.id),
        }));

        if (!this.selectedProjectId && this.projects.length > 0) {
          this.selectedProjectId = Number(this.projects[0]?.id) ?? null;
        }
      } catch (error) {
        if (error instanceof RequestAbortedError) return;
        this.error =
          error && typeof (error as Error).message === "string"
            ? (error as Error).message
            : "Не вдалося завантажити проєкти";
        console.error(error);
      } finally {
        this.isLoading = false;
      }
    },

    selectProject(id: number) {
      this.selectedProjectId = id;
    },

    async addProject(payload: CreateProjectPayload) {
      const project = await createProject(payload);
      this.projects.push(project);
      this.selectedProjectId = project.id;
    },

    async updateProject(id: number, payload: UpdateProjectPayload) {
      const updated = await updateProject(id, payload);
      const index = this.projects.findIndex((project) => project.id === id);
      if (index !== -1) {
        this.projects.splice(index, 1, updated);
      }
    },

    async removeProject(id: number) {
      await deleteProject(id);
      this.projects = this.projects.filter((project) => project.id !== id);

      if (this.selectedProjectId === id) {
        this.selectedProjectId = this.projects[0]?.id ?? null;
      }
    },
  },
});

