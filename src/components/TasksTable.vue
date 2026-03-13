<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import draggable from "vuedraggable";
import { useTasksStore } from "../stores/tasks";
import { useProjectsStore } from "../stores/projects";
import { useNotificationsStore } from "../stores/notifications";
import type { Task, TaskPriority, TaskStatus } from "../services/tasks";
import TaskUpsertModal from "./TaskUpsertModal.vue";
import ConfirmDeleteModal from "./ConfirmDeleteModal.vue";

type SortField = "manual" | "dueDate" | "status" | "priority";
type SortDirection = "asc" | "desc";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
];

const props = defineProps<{
  assigneeQuery: string;
  statusFilter: TaskStatus | "";
  priorityFilter?: TaskPriority | "";
}>();

const tasksStore = useTasksStore();
const projectsStore = useProjectsStore();
const notificationsStore = useNotificationsStore();

const TABLE_STATE_KEY = "spa_test_task:tasks-table";

const sort = reactive<{
  field: SortField;
  direction: SortDirection;
}>({
  field: "manual",
  direction: "asc",
});

const applySort = (field: SortField) => {
  if (sort.field === field) {
    sort.direction = sort.direction === "asc" ? "desc" : "asc";
  } else {
    sort.field = field;
    sort.direction = "asc";
  }
};

const sortedTasks = computed(() => {
  const selectedId = projectsStore.selectedProjectId;
  const base = selectedId != null
    ? tasksStore.tasks.filter(
        (task) => Number(task.projectId) === Number(selectedId),
      )
    : tasksStore.tasks;

  const tasks = [...base];

  return tasks.sort((a, b) => {
    if (sort.field === "manual") {
      return a.order - b.order;
    }

    if (sort.field === "dueDate") {
      const timeA = new Date(a.dueDate).getTime();
      const timeB = new Date(b.dueDate).getTime();
      return sort.direction === "asc" ? timeA - timeB : timeB - timeA;
    }

    if (sort.field === "status") {
      const valueA = a.status;
      const valueB = b.status;
      if (valueA === valueB) return 0;
      const comparison = valueA < valueB ? -1 : 1;
      return sort.direction === "asc" ? comparison : -comparison;
    }

    if (sort.field === "priority") {
      const pA = a.priority ?? 1;
      const pB = b.priority ?? 1;
      return sort.direction === "asc" ? pA - pB : pB - pA;
    }

    return 0;
  });
});

const filteredTasks = computed<Task[]>(() => {
  return sortedTasks.value.filter((task) => {
    const matchesAssignee =
      !props.assigneeQuery ||
      (task.assignee ?? "")
        .toLowerCase()
        .includes(props.assigneeQuery.toLowerCase());

    const matchesStatus =
      !props.statusFilter || task.status === props.statusFilter;

    const matchesPriority =
      !props.priorityFilter || (task.priority ?? 1) === props.priorityFilter;

    return matchesAssignee && matchesStatus && matchesPriority;
  });
});

const draggableTasks = ref<Task[]>([]);

watch(
  filteredTasks,
  (tasks) => {
    draggableTasks.value = [...tasks];
  },
  { immediate: true },
);

const handleDragEnd = () => {
  const orderedIds = draggableTasks.value.map((task) => task.id);
  tasksStore.setTasksOrder(orderedIds);
};

onMounted(() => {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(TABLE_STATE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as {
      sortField?: string;
      sortDirection?: SortDirection;
    };

    const storedField = parsed.sortField;
    if (storedField === "id") {
      sort.field = "priority";
    } else if (
      storedField === "manual" ||
      storedField === "dueDate" ||
      storedField === "status" ||
      storedField === "priority"
    ) {
      sort.field = storedField;
    }
    if (parsed.sortDirection) {
      sort.direction = parsed.sortDirection;
    }
  } catch {
    // ignore invalid state
  }
});

watch(
  [() => sort.field, () => sort.direction],
  () => {
    if (typeof window === "undefined") return;
    const payload = {
      sortField: sort.field,
      sortDirection: sort.direction,
    };
    window.localStorage.setItem(TABLE_STATE_KEY, JSON.stringify(payload));
  },
  { deep: false },
);

const columnWidths = reactive<Record<string, number>>({
  priority: 80,
  title: 160,
  assignee: 180,
  status: 140,
  dueDate: 180,
  actions: 50,
});

const taskPriority = (task: Task) => Math.min(5, Math.max(1, task.priority ?? 1));

const taskAssignees = (task: Task): string[] => {
  const s = task.assignee?.trim();
  if (!s) return [];
  return s.split(",").map((n) => n.trim()).filter(Boolean);
};

const updateStatus = async (task: Task, newStatus: TaskStatus) => {
  if (task.status === newStatus) return;
  try {
    await tasksStore.updateTask(task.id, { status: newStatus });
    notificationsStore.push("Статус завдання змінено", "success");
  } catch {
    notificationsStore.push("Не вдалося змінити статус", "error");
  }
};

const updatePriority = async (task: Task, newPriority: TaskPriority) => {
  const p = Math.min(5, Math.max(1, Number(newPriority))) as TaskPriority;
  if ((task.priority ?? 1) === p) return;
  try {
    await tasksStore.updateTask(task.id, { priority: p });
    notificationsStore.push("Пріоритет завдання змінено", "success");
  } catch {
    notificationsStore.push("Не вдалося змінити пріоритет", "error");
  }
};

const updateDueDate = async (task: Task, newDate: string) => {
  if (task.dueDate === newDate) return;
  try {
    await tasksStore.updateTask(task.id, { dueDate: newDate });
    notificationsStore.push("Дату виконання змінено", "success");
  } catch {
    notificationsStore.push("Не вдалося змінити дату", "error");
  }
};

const handleDeleteTask = async (task: Task) => {
  pendingDeleteTask.value = task;
  isDeleteTaskModalOpen.value = true;
};

const editingTask = ref<Task | null>(null);
const pendingDeleteTask = ref<Task | null>(null);
const isDeleteTaskModalOpen = ref(false);

const openEditModal = (task: Task) => {
  editingTask.value = task;
};

const isTaskModalOpen = computed({
  get: () => editingTask.value != null,
  set: (open: boolean) => {
    if (!open) editingTask.value = null;
  },
});

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

const resizing = reactive<{
  column: string | null;
  startX: number;
  startWidth: number;
}>({
  column: null,
  startX: 0,
  startWidth: 0,
});

const startResize = (event: MouseEvent, columnKey: string) => {
  resizing.column = columnKey;
  resizing.startX = event.clientX;
  resizing.startWidth = columnWidths[columnKey] ?? 0;

  window.addEventListener("mousemove", handleResizeMove);
  window.addEventListener("mouseup", stopResize);
};

const handleResizeMove = (event: MouseEvent) => {
  if (!resizing.column) return;

  const delta = event.clientX - resizing.startX;
  const newWidth = Math.max(80, resizing.startWidth + delta);
  columnWidths[resizing.column] = newWidth;
};

const stopResize = () => {
  resizing.column = null;
  window.removeEventListener("mousemove", handleResizeMove);
  window.removeEventListener("mouseup", stopResize);
};

</script>

<template>
  <div class="tasks-table">
    <div class="tasks-table__wrapper">
      <table class="tasks-table__table">
        <thead>
          <tr>
            <th
              class="tasks-table__th tasks-table__th--sortable"
              :style="{ width: `${columnWidths.priority}px` }"
              @click="applySort('priority')"
            >
              <div class="tasks-table__th-content">
                <span>Пріоритет</span>
                <span
                  class="tasks-table__sort-indicator"
                  :data-active="sort.field === 'priority'"
                >
                  <span
                    class="tasks-table__sort-arrow"
                    :class="{
                      'tasks-table__sort-arrow--asc':
                        sort.field === 'priority' && sort.direction === 'asc',
                      'tasks-table__sort-arrow--desc':
                        sort.field === 'priority' && sort.direction === 'desc',
                    }"
                  />
                </span>
                <span
                  class="tasks-table__resize-handle"
                  @mousedown.stop.prevent="(event) => startResize(event, 'priority')"
                />
              </div>
            </th>

            <th
              class="tasks-table__th"
              :style="{ width: `${columnWidths.title}px` }"
            >
              <div class="tasks-table__th-content">
                <span>Назва завдання</span>
                <span
                  class="tasks-table__resize-handle"
                  @mousedown.prevent="(event) => startResize(event, 'title')"
                />
              </div>
            </th>

            <th
              class="tasks-table__th"
              :style="{ width: `${columnWidths.assignee}px` }"
            >
              <div class="tasks-table__th-content">
                <span>Виконавець</span>
                <span
                  class="tasks-table__resize-handle"
                  @mousedown.prevent="(event) => startResize(event, 'assignee')"
                />
              </div>
            </th>

            <th
              class="tasks-table__th tasks-table__th--sortable"
              :style="{ width: `${columnWidths.status}px` }"
              @click="applySort('status')"
            >
              <div class="tasks-table__th-content">
                <span>Статус</span>
                <span
                  class="tasks-table__sort-indicator"
                  :data-active="sort.field === 'status'"
                >
                  <span
                    class="tasks-table__sort-arrow"
                    :class="{
                      'tasks-table__sort-arrow--asc':
                        sort.field === 'status' && sort.direction === 'asc',
                      'tasks-table__sort-arrow--desc':
                        sort.field === 'status' && sort.direction === 'desc',
                    }"
                  />
                </span>
                <span
                  class="tasks-table__resize-handle"
                  @mousedown.stop.prevent="(event) => startResize(event, 'status')"
                />
              </div>
            </th>

            <th
              class="tasks-table__th tasks-table__th--sortable"
              :style="{ width: `${columnWidths.dueDate}px` }"
              @click="applySort('dueDate')"
            >
              <div class="tasks-table__th-content">
                <span>Термін виконання</span>
                <span
                  class="tasks-table__sort-indicator"
                  :data-active="sort.field === 'dueDate'"
                >
                  <span
                    class="tasks-table__sort-arrow"
                    :class="{
                      'tasks-table__sort-arrow--asc':
                        sort.field === 'dueDate' && sort.direction === 'asc',
                      'tasks-table__sort-arrow--desc':
                        sort.field === 'dueDate' && sort.direction === 'desc',
                    }"
                  />
                </span>
                <span
                  class="tasks-table__resize-handle"
                  @mousedown.stop.prevent="(event) => startResize(event, 'dueDate')"
                />
              </div>
            </th>
            <th
              class="tasks-table__th tasks-table__th--actions"
              :style="{ width: `${columnWidths.actions}px` }"
            >
              <div class="tasks-table__th-content">
                <span>Дії</span>
              </div>
            </th>
          </tr>
        </thead>

        <draggable
          v-model="draggableTasks"
          item-key="id"
          tag="tbody"
          handle=".tasks-table__row-handle"
          @end="handleDragEnd"
        >
          <template #item="{ element: task }">
            <tr
              v-memo="[
                task.id,
                task.title,
                task.assignee,
                task.status,
                task.dueDate,
                task.priority ?? 1,
              ]"
              class="tasks-table__row"
            >
              <td
                class="tasks-table__cell tasks-table__cell--priority tasks-table__cell--fill"
                :style="{ width: `${columnWidths.priority}px` }"
                @click.stop
              >
                <span class="tasks-table__row-handle">⋮⋮</span>
                <select
                  :value="taskPriority(task)"
                  class="tasks-table__priority-select"
                  :data-priority="taskPriority(task)"
                  @change="updatePriority(task, Number(($event.target as HTMLSelectElement).value) as TaskPriority)"
                >
                  <option
                    v-for="opt in PRIORITY_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </td>
              <td
                class="tasks-table__cell"
                :style="{ width: `${columnWidths.title}px` }"
              >
                <div class="tasks-table__cell-title">
                  <span class="tasks-table__task-title">
                    {{ task.title }}
                  </span>
                </div>
              </td>
              <td
                class="tasks-table__cell tasks-table__cell--assignee"
                :style="{ width: `${columnWidths.assignee}px` }"
              >
                <div v-if="taskAssignees(task).length" class="tasks-table__assignee-tags">
                  <span
                    v-for="name in taskAssignees(task)"
                    :key="name"
                    class="tasks-table__assignee-tag"
                  >
                    {{ name }}
                  </span>
                </div>
                <span v-else>—</span>
              </td>
              <td
                class="tasks-table__cell tasks-table__cell--status tasks-table__cell--fill"
                :style="{ width: `${columnWidths.status}px` }"
                @click.stop
              >
                <select
                  :value="task.status"
                  class="tasks-table__status-select"
                  :data-status="task.status"
                  @change="updateStatus(task, ($event.target as HTMLSelectElement).value as TaskStatus)"
                >
                  <option
                    v-for="opt in STATUS_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </td>
              <td
                class="tasks-table__cell tasks-table__cell--fill"
                :style="{ width: `${columnWidths.dueDate}px` }"
                @click.stop
              >
                <input
                  type="date"
                  class="tasks-table__date-input"
                  :value="task.dueDate"
                  @change="updateDueDate(task, ($event.target as HTMLInputElement).value)"
                />
              </td>
              <td
                class="tasks-table__cell tasks-table__cell--actions"
                :style="{ width: `${columnWidths.actions}px` }"
                @click.stop
              >
                <div class="tasks-table__row-actions">
                  <button
                    type="button"
                    class="tasks-table__icon-btn"
                    title="Редагувати завдання"
                    aria-label="Редагувати"
                    @click="openEditModal(task)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                  <button
                    type="button"
                    class="tasks-table__icon-btn tasks-table__icon-btn--danger"
                    title="Удалить задачу"
                    aria-label="Удалить"
                    @click="handleDeleteTask(task)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </draggable>
      </table>
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
.tasks-table {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tasks-table__wrapper {
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  overflow: auto;
}

.tasks-table__table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.tasks-table__th {
  position: relative;
  text-align: left;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  padding: 0.6rem 0.75rem;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  user-select: none;
}

.tasks-table__th--numeric {
  text-align: left;
}

.tasks-table__th-content {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.tasks-table__th--sortable {
  cursor: pointer;
}

.tasks-table__sort-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.75rem;
  height: 0.75rem;
  opacity: 0.4;
}

.tasks-table__sort-indicator[data-active="true"] {
  opacity: 1;
}

.tasks-table__sort-arrow {
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
}

.tasks-table__sort-arrow--asc {
  border-bottom: 6px solid #4b5563;
}

.tasks-table__sort-arrow--desc {
  border-top: 6px solid #4b5563;
}

.tasks-table__resize-handle {
  width: 4px;
  align-self: stretch;
  cursor: col-resize;
  margin-left: auto;
}

.tasks-table__resize-handle::before {
  content: "";
  display: block;
  width: 1px;
  height: 16px;
  margin: auto;
  background-color: #d1d5db;
}

.tasks-table__row {
  border-bottom: 1px solid #f3f4f6;
}

.tasks-table__cell {
  padding: 0.55rem 1.05rem 0.55rem 0.55rem;
  font-size: 0.875rem;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
}

.tasks-table__cell--numeric {
  text-align: left;
}

.tasks-table__cell--priority {
  text-align: left;
}

.tasks-table__cell--fill {
  padding-left: 0.55rem;
  padding-right: 2rem;
}

.tasks-table__cell--priority.tasks-table__cell--fill {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.tasks-table__cell--priority.tasks-table__cell--fill .tasks-table__priority-select {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  text-align: center;
}

.tasks-table__cell--fill .tasks-table__status-select {
  width: 100%;
  box-sizing: border-box;
}

.tasks-table__cell--fill .tasks-table__date-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin-right: 0;
}

.tasks-table__cell--assignee {
  white-space: normal;
  overflow: visible;
}

.tasks-table__assignee-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.tasks-table__assignee-tag {
  display: inline-block;
  padding: 0.1rem 0.35rem;
  font-size: 0.75rem;
  border-radius: 999px;
  background-color: #e5e7eb;
  color: #374151;
  white-space: nowrap;
}

.tasks-table__priority-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.tasks-table__priority-pill[data-priority="1"] {
  background-color: #f3f4f6;
  color: #6b7280;
}

.tasks-table__priority-pill[data-priority="2"] {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.tasks-table__priority-pill[data-priority="3"] {
  background-color: #fef3c7;
  color: #b45309;
}

.tasks-table__priority-pill[data-priority="4"] {
  background-color: #fed7aa;
  color: #c2410c;
}

.tasks-table__priority-pill[data-priority="5"] {
  background-color: #fecaca;
  color: #b91c1c;
}

.tasks-table__row-handle {
  display: inline-block;
  margin-right: 0.35rem;
  color: #9ca3af;
  cursor: grab;
}

.tasks-table__cell-title {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.tasks-table__task-title {
  font-weight: 500;
}

.tasks-table__status-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.tasks-table__status-pill[data-status="todo"] {
  background-color: #eff6ff;
  color: #1d4ed8;
}

.tasks-table__status-pill[data-status="in_progress"] {
  background-color: #fffbeb;
  color: #92400e;
}

.tasks-table__status-pill[data-status="done"] {
  background-color: #ecfdf3;
  color: #166534;
}

.tasks-table__status-select {
  width: 100%;
  max-width: 100%;
  padding: 0.15rem 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  background-color: inherit;
  color: inherit;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.35rem center;
}

.tasks-table__status-select[data-status="todo"] {
  background-color: #eff6ff;
  color: #1d4ed8;
}

.tasks-table__status-select[data-status="in_progress"] {
  background-color: #fffbeb;
  color: #92400e;
}

.tasks-table__status-select[data-status="done"] {
  background-color: #ecfdf3;
  color: #166534;
}

.tasks-table__priority-select {
  min-width: 2rem;
  padding: 0.15rem 0.4rem;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  background-color: inherit;
  color: inherit;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.2rem center;
}

.tasks-table__priority-select[data-priority="1"] {
  background-color: #f3f4f6;
  color: #6b7280;
}

.tasks-table__priority-select[data-priority="2"] {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.tasks-table__priority-select[data-priority="3"] {
  background-color: #fef3c7;
  color: #b45309;
}

.tasks-table__priority-select[data-priority="4"] {
  background-color: #fed7aa;
  color: #c2410c;
}

.tasks-table__priority-select[data-priority="5"] {
  background-color: #fecaca;
  color: #b91c1c;
}

.tasks-table__date-input {
  width: fit-content;
  padding: 0.2rem 0.4rem;
  margin-right: 0.4rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: #fff;
}

.tasks-table__cell--actions {
  text-align: center;
}

.tasks-table__row-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.tasks-table__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tasks-table__icon-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.tasks-table__icon-btn--danger {
  color: #b91c1c;
}

.tasks-table__icon-btn--danger:hover {
  background-color: #fef2f2;
  color: #991b1b;
}

</style>

