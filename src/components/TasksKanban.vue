<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import draggable from "vuedraggable";
import { useTasksStore } from "../stores/tasks";
import { useProjectsStore } from "../stores/projects";
import { useNotificationsStore } from "../stores/notifications";
import type { Task, TaskPriority, TaskStatus } from "../services/tasks";
import TaskUpsertModal from "./TaskUpsertModal.vue";
import ConfirmDeleteModal from "./ConfirmDeleteModal.vue";

const props = defineProps<{
  assigneeQuery: string;
  statusFilter: TaskStatus | "";
  priorityFilter?: TaskPriority | "";
}>();

const tasksStore = useTasksStore();
const projectsStore = useProjectsStore();
const notificationsStore = useNotificationsStore();

const todoTasks = ref<Task[]>([]);
const inProgressTasks = ref<Task[]>([]);
const doneTasks = ref<Task[]>([]);

const syncFromStore = () => {
  const selectedId = projectsStore.selectedProjectId;
  let base =
    selectedId != null
      ? tasksStore.tasks.filter(
          (task) => Number(task.projectId) === Number(selectedId),
        )
      : tasksStore.tasks;

  if (props.assigneeQuery) {
    const q = props.assigneeQuery.toLowerCase();
    base = base.filter((t) =>
      (t.assignee ?? "").toLowerCase().includes(q),
    );
  }
  if (props.statusFilter) {
    base = base.filter((t) => t.status === props.statusFilter);
  }
  if (props.priorityFilter) {
    base = base.filter((t) => (t.priority ?? 1) === props.priorityFilter);
  }

  const tasks = [...base];

  const byStatus = {
    todo: [] as Task[],
    in_progress: [] as Task[],
    done: [] as Task[],
  };

  tasks.forEach((task) => {
    if (task.status === "todo") byStatus.todo.push(task);
    else if (task.status === "in_progress") byStatus.in_progress.push(task);
    else byStatus.done.push(task);
  });

  const sortByOrderThenId = (a: Task, b: Task) => {
    if (a.order === b.order) return a.id - b.id;
    return a.order - b.order;
  };

  todoTasks.value = byStatus.todo.sort(sortByOrderThenId);
  inProgressTasks.value = byStatus.in_progress.sort(sortByOrderThenId);
  doneTasks.value = byStatus.done.sort(sortByOrderThenId);
};

onMounted(() => {
  syncFromStore();
});

watch(
  [
    () => tasksStore.tasks,
    () => projectsStore.selectedProjectId,
    () => props.assigneeQuery,
    () => props.statusFilter,
    () => props.priorityFilter,
  ],
  () => {
    syncFromStore();
  },
  { deep: true },
);

const applyBoardChange = () => {
  tasksStore.reorderByStatus({
    todo: todoTasks.value.map((task) => task.id),
    in_progress: inProgressTasks.value.map((task) => task.id),
    done: doneTasks.value.map((task) => task.id),
  });
};

const editingTask = ref<Task | null>(null);
const isTaskModalOpen = computed({
  get: () => editingTask.value != null,
  set: (open: boolean) => {
    if (!open) editingTask.value = null;
  },
});

const pendingDeleteTask = ref<Task | null>(null);
const isDeleteTaskModalOpen = ref(false);

const openEditModal = (task: Task) => {
  editingTask.value = task;
};

const openDeleteTaskModal = (task: Task) => {
  pendingDeleteTask.value = task;
  isDeleteTaskModalOpen.value = true;
};

watch(isDeleteTaskModalOpen, (open) => {
  if (!open) pendingDeleteTask.value = null;
});

const handleConfirmDeleteTask = async () => {
  const task = pendingDeleteTask.value;
  if (!task) return;

  try {
    await tasksStore.removeTask(task.id);
    notificationsStore.push("Задача удалена", "success");
    isDeleteTaskModalOpen.value = false;
    pendingDeleteTask.value = null;
  } catch {
    notificationsStore.push("Не удалось удалить задачу", "error");
  }
};
</script>

<template>
  <div class="kanban-wrapper">
    <div class="kanban">
      <div class="kanban__column">
        <header class="kanban__column-header">
          <h2 class="kanban__column-title">To do</h2>
          <span class="kanban__badge kanban__badge--todo">{{ todoTasks.length }}</span>
        </header>

        <draggable
          v-model="todoTasks"
          item-key="id"
          group="kanban-tasks"
          class="kanban__list"
          @change="applyBoardChange"
        >
          <template #item="{ element: task }">
            <article
              v-memo="[
                task.id,
                task.title,
                task.assignee,
                task.dueDate,
                task.priority ?? 1,
              ]"
              class="kanban__card"
            >
              <div class="kanban__card-head">
                <span
                  class="kanban__priority"
                  :data-priority="Math.min(5, Math.max(1, task.priority ?? 1))"
                  :title="`Пріоритет ${Math.min(5, Math.max(1, task.priority ?? 1))}`"
                >
                  {{ Math.min(5, Math.max(1, task.priority ?? 1)) }}
                </span>
                <h3 class="kanban__card-title">
                  {{ task.title }}
                </h3>
                <div class="kanban__card-actions">
                  <button
                    type="button"
                    class="kanban__icon-btn"
                    title="Редактировать"
                    aria-label="Редактировать"
                    @mousedown.stop.prevent
                    @click.stop="openEditModal(task)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                  <button
                    type="button"
                    class="kanban__icon-btn kanban__icon-btn--danger"
                    title="Удалить"
                    aria-label="Удалить"
                    @mousedown.stop.prevent
                    @click.stop="openDeleteTaskModal(task)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </div>
              <p class="kanban__card-meta">
                <span v-if="task.assignee">
                  {{ task.assignee }}
                </span>
                <span class="kanban__card-date">
                  {{ task.dueDate }}
                </span>
              </p>
            </article>
          </template>
        </draggable>
      </div>

      <div class="kanban__column">
        <header class="kanban__column-header">
          <h2 class="kanban__column-title">In progress</h2>
          <span class="kanban__badge kanban__badge--in-progress">{{ inProgressTasks.length }}</span>
        </header>

        <draggable
          v-model="inProgressTasks"
          item-key="id"
          group="kanban-tasks"
          class="kanban__list"
          @change="applyBoardChange"
        >
          <template #item="{ element: task }">
            <article
              v-memo="[
                task.id,
                task.title,
                task.assignee,
                task.dueDate,
                task.priority ?? 1,
              ]"
              class="kanban__card"
            >
              <div class="kanban__card-head">
                <span
                  class="kanban__priority"
                  :data-priority="Math.min(5, Math.max(1, task.priority ?? 1))"
                  :title="`Пріоритет ${Math.min(5, Math.max(1, task.priority ?? 1))}`"
                >
                  {{ Math.min(5, Math.max(1, task.priority ?? 1)) }}
                </span>
                <h3 class="kanban__card-title">
                  {{ task.title }}
                </h3>
                <div class="kanban__card-actions">
                  <button
                    type="button"
                    class="kanban__icon-btn"
                    title="Редактировать"
                    aria-label="Редактировать"
                    @mousedown.stop.prevent
                    @click.stop="openEditModal(task)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                  <button
                    type="button"
                    class="kanban__icon-btn kanban__icon-btn--danger"
                    title="Удалить"
                    aria-label="Удалить"
                    @mousedown.stop.prevent
                    @click.stop="openDeleteTaskModal(task)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </div>
              <p class="kanban__card-meta">
                <span v-if="task.assignee">
                  {{ task.assignee }}
                </span>
                <span class="kanban__card-date">
                  {{ task.dueDate }}
                </span>
              </p>
            </article>
          </template>
        </draggable>
      </div>

      <div class="kanban__column">
        <header class="kanban__column-header">
          <h2 class="kanban__column-title">Done</h2>
          <span class="kanban__badge kanban__badge--done">{{ doneTasks.length }}</span>
        </header>

        <draggable
          v-model="doneTasks"
          item-key="id"
          group="kanban-tasks"
          class="kanban__list"
          @change="applyBoardChange"
        >
          <template #item="{ element: task }">
            <article
              v-memo="[
                task.id,
                task.title,
                task.assignee,
                task.dueDate,
                task.priority ?? 1,
              ]"
              class="kanban__card"
            >
              <div class="kanban__card-head">
                <span
                  class="kanban__priority"
                  :data-priority="Math.min(5, Math.max(1, task.priority ?? 1))"
                  :title="`Пріоритет ${Math.min(5, Math.max(1, task.priority ?? 1))}`"
                >
                  {{ Math.min(5, Math.max(1, task.priority ?? 1)) }}
                </span>
                <h3 class="kanban__card-title">
                  {{ task.title }}
                </h3>
                <div class="kanban__card-actions">
                  <button
                    type="button"
                    class="kanban__icon-btn"
                    title="Редактировать"
                    aria-label="Редактировать"
                    @mousedown.stop.prevent
                    @click.stop="openEditModal(task)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                  <button
                    type="button"
                    class="kanban__icon-btn kanban__icon-btn--danger"
                    title="Удалить"
                    aria-label="Удалить"
                    @mousedown.stop.prevent
                    @click.stop="openDeleteTaskModal(task)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </div>
              <p class="kanban__card-meta">
                <span v-if="task.assignee">
                  {{ task.assignee }}
                </span>
                <span class="kanban__card-date">
                  {{ task.dueDate }}
                </span>
              </p>
            </article>
          </template>
        </draggable>
      </div>
    </div>

    <TaskUpsertModal v-model="isTaskModalOpen" :task="editingTask" />
    <ConfirmDeleteModal
      v-model="isDeleteTaskModalOpen"
      title="Удалить задачу?"
      :description="pendingDeleteTask ? `Задача «${pendingDeleteTask.title}» будет удалена без возможности восстановления.` : undefined"
      confirm-text="Удалить задачу"
      @confirm="handleConfirmDeleteTask"
    />
  </div>
</template>

<style scoped>
.kanban-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.kanban {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  align-items: flex-start;
}

.kanban__column {
  background-color: #f9fafb;
  border-radius: 0.75rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.kanban__column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kanban__column-title {
  font-size: 0.9rem;
  font-weight: 600;
}

.kanban__badge {
  min-width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.kanban__badge--todo {
  background-color: #3b82f6;
  color: #ffffff;
}

.kanban__badge--in-progress {
  background-color: #f59e0b;
  color: #ffffff;
}

.kanban__badge--done {
  background-color: #10b981;
  color: #ffffff;
}

.kanban__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 2rem;
}

.kanban__card {
  background-color: #ffffff;
  border-radius: 0.75rem;
  padding: 0.6rem 0.75rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  cursor: grab;
}

.kanban__card-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}

.kanban__priority {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 600;
}

.kanban__priority[data-priority="1"] {
  background-color: #f3f4f6;
  color: #6b7280;
}

.kanban__priority[data-priority="2"] {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.kanban__priority[data-priority="3"] {
  background-color: #fef3c7;
  color: #b45309;
}

.kanban__priority[data-priority="4"] {
  background-color: #fed7aa;
  color: #c2410c;
}

.kanban__priority[data-priority="5"] {
  background-color: #fecaca;
  color: #b91c1c;
}

.kanban__card-title {
  flex: 1;
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 500;
}

.kanban__card-actions {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.kanban__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: none;
  border-radius: 0.45rem;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.kanban__icon-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.kanban__icon-btn--danger {
  color: #b91c1c;
}

.kanban__icon-btn--danger:hover {
  background-color: #fef2f2;
  color: #991b1b;
}

.kanban__card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #6b7280;
}

.kanban__card-date {
  font-variant-numeric: tabular-nums;
}
</style>

