import { defineStore } from "pinia";
import { RequestAbortedError } from "../services/api";
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
  type CreateTaskPayload,
  type Task,
  type TaskPriority,
  type UpdateTaskPayload,
} from "../services/tasks";

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
}

export const useTasksStore = defineStore("tasks", {
  state: (): TasksState => ({
    tasks: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    assignees(state): string[] {
      const names = new Set<string>();
      state.tasks.forEach((task) => {
        if (task.assignee) {
          task.assignee
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((name) => names.add(name));
        }
      });
      return Array.from(names).sort();
    },
  },

  actions: {
    async fetchTasks() {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await getTasks();

        const normalize = (t: Task & { order?: number; priority?: number }) => {
          const p = t.priority != null ? Math.min(5, Math.max(1, Number(t.priority))) : 1;
          return {
            ...t,
            id: Number(t.id),
            projectId: t.projectId != null ? Number(t.projectId) : undefined,
            order: typeof t.order === "number" ? t.order : 0,
            priority: p as TaskPriority,
          };
        };

        this.tasks = data
          .map((task, index) => {
            const n = normalize(task as Task & { order?: number });
            return { ...n, order: n.order ?? index };
          })
          .sort((a, b) => a.order - b.order);
      } catch (error) {
        if (error instanceof RequestAbortedError) return;
        this.error =
          error && typeof (error as Error).message === "string"
            ? (error as Error).message
            : "Не вдалося завантажити завдання";
        console.error(error);
      } finally {
        this.isLoading = false;
      }
    },

    setTasksOrder(orderedIds: number[]) {
      const orderMap = new Map<number, number>();
      orderedIds.forEach((id, index) => {
        orderMap.set(id, index);
      });

      this.tasks = this.tasks
        .slice()
        .sort((a, b) => {
          const orderA = orderMap.get(a.id) ?? a.order;
          const orderB = orderMap.get(b.id) ?? b.order;
          return orderA - orderB;
        })
        .map((task) => ({
          ...task,
          order: orderMap.get(task.id) ?? task.order,
        }));
    },

    /**
     * Оновлює статус і порядок завдань згідно з поточним станом колонок на канбан-дошці.
     */
    reorderByStatus(columns: {
      todo: number[];
      in_progress: number[];
      done: number[];
    }) {
      const statusById = new Map<number, "todo" | "in_progress" | "done">();

      (["todo", "in_progress", "done"] as const).forEach((status) => {
        columns[status].forEach((id) => {
          statusById.set(id, status);
        });
      });

      this.tasks = this.tasks.map((task) => {
        const status = statusById.get(task.id);

        if (!status) {
          return task;
        }

        const orderInStatus = columns[status].indexOf(task.id);

        return {
          ...task,
          status,
          order: orderInStatus >= 0 ? orderInStatus : task.order,
        };
      });
    },

    async addTask(payload: CreateTaskPayload) {
      const nextOrder =
        this.tasks.length > 0
          ? Math.max(...this.tasks.map((task) => task.order)) + 1
          : 0;

      const created = await createTask({
        ...payload,
        order: nextOrder,
      });

      this.tasks.push({
        ...created,
        id: Number(created.id),
        projectId:
          created.projectId != null ? Number(created.projectId) : undefined,
        priority:
          created.priority != null
            ? (Math.min(5, Math.max(1, Number(created.priority))) as TaskPriority)
            : 1,
      });
    },

    async updateTask(id: number, payload: UpdateTaskPayload) {
      const updated = await updateTask(id, payload);
      const index = this.tasks.findIndex((task) => Number(task.id) === id);
      if (index !== -1) {
        this.tasks.splice(index, 1, {
          ...updated,
          id: Number(updated.id),
          projectId:
            updated.projectId != null
              ? Number(updated.projectId)
              : undefined,
          priority:
            updated.priority != null
              ? (Math.min(5, Math.max(1, Number(updated.priority))) as TaskPriority)
              : (this.tasks[index]?.priority ?? 1),
        });
      }
    },

    async removeTask(id: number) {
      await deleteTask(id);
      this.tasks = this.tasks.filter((task) => task.id !== id);
    },
  },
});

