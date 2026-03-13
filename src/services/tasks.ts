import api, { withCancelPrevious } from "./api";

export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export interface Task {
  id: number;
  projectId?: number;
  title: string;
  assignee?: string;
  status: TaskStatus;
  dueDate: string;
  order: number;
  priority?: TaskPriority;
}

export interface CreateTaskPayload {
  projectId?: number;
  title: string;
  assignee?: string;
  status: TaskStatus;
  dueDate: string;
  order?: number;
  priority?: TaskPriority;
}

export interface UpdateTaskPayload {
  title?: string;
  assignee?: string | null;
  status?: TaskStatus;
  dueDate?: string;
  order?: number;
  priority?: TaskPriority | null;
}

const GET_TASKS_KEY = "getTasks";

export const getTasks = async (): Promise<Task[]> => {
  return withCancelPrevious(GET_TASKS_KEY, async (signal) => {
    const { data } = await api.get<Task[]>("/tasksCRUD", { signal });
    return data;
  });
};

export const createTask = async (
  payload: CreateTaskPayload,
): Promise<Task> => {
  const { data } = await api.post<Task>("/tasksCRUD", payload);
  return data;
};

export const updateTask = async (
  id: number,
  payload: UpdateTaskPayload,
): Promise<Task> => {
  const { data } = await api.patch<Task>(`/tasksCRUD/${id}`, payload);
  return data;
};

export const deleteTask = async (id: number): Promise<void> => {
  await api.delete(`/tasksCRUD/${id}`);
};

