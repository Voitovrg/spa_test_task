type Id = number;

export type ProjectStatus = "active" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export interface Project {
  id: Id;
  name: string;
  description?: string;
  members?: string[];
  status: ProjectStatus;
  createdAt: string; // YYYY-MM-DD
}

export interface Task {
  id: Id;
  projectId?: Id;
  title: string;
  assignee?: string;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
  order: number;
  priority?: TaskPriority;
}

type Db = {
  projects: Project[];
  tasksCRUD: Task[];
};

const SEED: Db = {
  projects: [
    {
      id: 1,
      name: "Internal SPA test task",
      description: "Demo project for managing tasks and projects.",
      members: ["Alice", "Bob", "Charlie", "Dana", "Eve"],
      status: "active",
      createdAt: "2026-03-01",
    },
    {
      id: 2,
      name: "Marketing website refresh",
      description: "Redesign public marketing site with new branding.",
      members: ["Bob", "Charlie"],
      status: "active",
      createdAt: "2026-02-20",
    },
  ],
  tasksCRUD: [
    {
      id: 1,
      projectId: 1,
      title: "Design main dashboard",
      assignee: "Alice",
      status: "done",
      dueDate: "2026-03-05",
      order: 0,
      priority: 1,
    },
    {
      id: 2,
      projectId: 1,
      title: "Create Kanban view",
      assignee: undefined,
      status: "in_progress",
      dueDate: "2026-03-15",
      order: 1,
      priority: 4,
    },
    {
      id: 3,
      projectId: 2,
      title: "SEO meta tags",
      assignee: "Charlie",
      status: "in_progress",
      dueDate: "2026-03-10",
      order: 0,
      priority: 5,
    },
  ],
};

function cloneSeed(): Db {
  return {
    projects: SEED.projects.map((p) => ({ ...p, members: p.members ? [...p.members] : undefined })),
    tasksCRUD: SEED.tasksCRUD.map((t) => ({ ...t })),
  };
}

function getDb(): Db {
  const g = globalThis as unknown as { __spa_test_task_db__?: Db };
  if (!g.__spa_test_task_db__) g.__spa_test_task_db__ = cloneSeed();
  return g.__spa_test_task_db__;
}

function nextId(items: { id: Id }[]): Id {
  return items.reduce((max, it) => Math.max(max, it.id), 0) + 1;
}

function json(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export async function readJsonBody<T = any>(req: any): Promise<T> {
  const chunks: Uint8Array[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (c: Uint8Array) => chunks.push(c));
    req.on("end", () => resolve());
    req.on("error", reject);
  });
  if (!chunks.length) return {} as T;
  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw) as T;
}

export function sendNotFound(res: any) {
  return json(res, 404, { message: "Not found" });
}

export function sendMethodNotAllowed(res: any) {
  res.statusCode = 405;
  res.setHeader("Allow", "GET,POST,PATCH,DELETE,OPTIONS");
  res.end();
}

export function handleOptions(res: any) {
  res.statusCode = 204;
  res.end();
}

export const store = {
  // Projects
  listProjects(): Project[] {
    return [...getDb().projects];
  },
  createProject(payload: Omit<Project, "id"> & Partial<Pick<Project, "createdAt" | "status">>): Project {
    const db = getDb();
    const project: Project = {
      id: nextId(db.projects),
      name: payload.name,
      description: payload.description ?? undefined,
      members: payload.members ?? undefined,
      status: payload.status ?? "active",
      createdAt: payload.createdAt ?? new Date().toISOString().slice(0, 10),
    };
    db.projects.push(project);
    return project;
  },
  patchProject(id: Id, patch: Partial<Project>): Project | undefined {
    const db = getDb();
    const idx = db.projects.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    const current = db.projects[idx];
    const updated: Project = {
      ...current,
      ...patch,
      id: current.id,
      members: patch.members ?? current.members,
    };
    db.projects[idx] = updated;
    return updated;
  },
  deleteProject(id: Id): boolean {
    const db = getDb();
    const before = db.projects.length;
    db.projects = db.projects.filter((p) => p.id !== id);
    return db.projects.length !== before;
  },

  // Tasks
  listTasks(): Task[] {
    return [...getDb().tasksCRUD];
  },
  createTask(payload: Omit<Task, "id" | "order"> & Partial<Pick<Task, "order">>): Task {
    const db = getDb();
    const order =
      payload.order ??
      (payload.projectId
        ? Math.max(-1, ...db.tasksCRUD.filter((t) => t.projectId === payload.projectId).map((t) => t.order)) + 1
        : Math.max(-1, ...db.tasksCRUD.map((t) => t.order)) + 1);

    const task: Task = {
      id: nextId(db.tasksCRUD),
      projectId: payload.projectId,
      title: payload.title,
      assignee: payload.assignee ?? undefined,
      status: payload.status,
      dueDate: payload.dueDate,
      order,
      priority: payload.priority ?? undefined,
    };
    db.tasksCRUD.push(task);
    return task;
  },
  patchTask(id: Id, patch: Partial<Task>): Task | undefined {
    const db = getDb();
    const idx = db.tasksCRUD.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    const current = db.tasksCRUD[idx];
    const updated: Task = {
      ...current,
      ...patch,
      id: current.id,
    };
    db.tasksCRUD[idx] = updated;
    return updated;
  },
  deleteTask(id: Id): boolean {
    const db = getDb();
    const before = db.tasksCRUD.length;
    db.tasksCRUD = db.tasksCRUD.filter((t) => t.id !== id);
    return db.tasksCRUD.length !== before;
  },

  // Helpers for responses
  json,
};

