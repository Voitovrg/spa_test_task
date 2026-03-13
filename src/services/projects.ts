import api, { withCancelPrevious } from "./api";

export type ProjectStatus = "active" | "archived";

export interface Project {
  id: number;
  name: string;
  description?: string;
  /**
   * Учасники / виконавці проєкту
   */
  members?: string[];
  status: ProjectStatus;
  /**
   * ISO дата (YYYY-MM-DD)
   */
  createdAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  members?: string[];
  status?: ProjectStatus;
  createdAt?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  members?: string[];
  status?: ProjectStatus;
}

const GET_PROJECTS_KEY = "getProjects";

export const getProjects = async (): Promise<Project[]> => {
  return withCancelPrevious(GET_PROJECTS_KEY, async (signal) => {
    const { data } = await api.get<Project[]>("/projects", { signal });
    return data;
  });
};

export const createProject = async (
  payload: CreateProjectPayload,
): Promise<Project> => {
  const withDefaults: CreateProjectPayload = {
    status: "active",
    createdAt: new Date().toISOString().slice(0, 10),
    ...payload,
  };

  const { data } = await api.post<Project>("/projects", withDefaults);
  return data;
};

export const updateProject = async (
  id: number,
  payload: UpdateProjectPayload,
): Promise<Project> => {
  const { data } = await api.patch<Project>(`/projects/${id}`, payload);
  return data;
};

export const deleteProject = async (id: number): Promise<void> => {
  await api.delete(`/projects/${id}`);
};

