<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useTasksStore } from "../stores/tasks";
import { useProjectsStore } from "../stores/projects";
import { useNotificationsStore } from "../stores/notifications";
import TasksTable from "./TasksTable.vue";
import TasksKanban from "./TasksKanban.vue";
import TasksStats from "./TasksStats.vue";
import type { TaskPriority, TaskStatus } from "../services/tasks";
import TaskUpsertModal from "./TaskUpsertModal.vue";
import ConfirmDeleteModal from "./ConfirmDeleteModal.vue";

type ViewMode = "table" | "kanban";

const VIEW_MODE_KEY = "tasks:view-mode";

const tasksStore = useTasksStore();
const projectsStore = useProjectsStore();
const notificationsStore = useNotificationsStore();

const initialMode = ((): ViewMode => {
  if (typeof window === "undefined") return "table";
  const stored = window.localStorage.getItem(VIEW_MODE_KEY);
  return stored === "kanban" ? "kanban" : "table";
})();

const viewMode = ref<ViewMode>(initialMode);
const assigneeQuery = ref("");
const statusFilter = ref<TaskStatus | "">("");
const priorityFilter = ref<TaskPriority | "">("");
const isTaskModalOpen = ref(false);

const isTable = computed(() => viewMode.value === "table");
const isKanban = computed(() => viewMode.value === "kanban");
const canDeleteProject = computed(() => projectsStore.selectedProjectId != null);
const currentProjectName = computed(
  () => projectsStore.currentProject?.name ?? "",
);
const isDeleteProjectModalOpen = ref(false);

const changeMode = (mode: ViewMode) => {
  viewMode.value = mode;
};

const openAddModal = () => {
  isTaskModalOpen.value = true;
};

const openDeleteProjectModal = () => {
  if (!canDeleteProject.value) return;
  isDeleteProjectModalOpen.value = true;
};

const handleConfirmDeleteProject = async () => {
  const projectId = projectsStore.selectedProjectId;
  if (projectId == null) return;

  try {
    await projectsStore.removeProject(projectId);
    notificationsStore.push("Проект удалён", "success");
    isDeleteProjectModalOpen.value = false;
  } catch {
    notificationsStore.push("Не удалось удалить проект", "error");
  }
};

watch(
  viewMode,
  (mode) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEW_MODE_KEY, mode);
  },
  { immediate: true },
);

onMounted(async () => {
  await tasksStore.fetchTasks();
});
</script>

<template>
  <section class="tasks-view">
    <header class="tasks-view__header">
      <nav class="tasks-view__tabs" aria-label="Режим відображення">
        <button
          type="button"
          class="tasks-view__tab"
          :class="{ 'tasks-view__tab--active': isTable }"
          @click="changeMode('table')"
        >
          Таблиця
        </button>
        <button
          type="button"
          class="tasks-view__tab"
          :class="{ 'tasks-view__tab--active': isKanban }"
          @click="changeMode('kanban')"
        >
          Канбан
        </button>
      </nav>

      <div class="tasks-view__center">
        <input
          v-model="assigneeQuery"
          type="text"
          class="tasks-view__search"
          placeholder="Пошук за виконавцем"
        />
      </div>

      <div class="tasks-view__right">
        <button
          type="button"
          class="tasks-view__add-btn"
          @click="openAddModal"
        >
          Додати завдання
        </button>
        <button
          v-if="canDeleteProject"
          type="button"
          class="tasks-view__delete-project-btn"
          title="Удалить проект"
          aria-label="Удалить проект"
          @click="openDeleteProjectModal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
    </header>

    <div class="tasks-view__stats">
      <TasksStats
        :assignee-query="assigneeQuery"
        v-model:status-filter="statusFilter"
        v-model:priority-filter="priorityFilter"
      />
    </div>

    <div class="tasks-view__body">
      <TasksTable
        v-if="isTable"
        :assignee-query="assigneeQuery"
        :status-filter="statusFilter"
        :priority-filter="priorityFilter"
      />
      <TasksKanban
        v-else
        :assignee-query="assigneeQuery"
        :status-filter="statusFilter"
        :priority-filter="priorityFilter"
      />
    </div>

    <TaskUpsertModal v-model="isTaskModalOpen" :task="null" />
    <ConfirmDeleteModal
      v-model="isDeleteProjectModalOpen"
      title="Удалить проект?"
      :description="`Проект «${currentProjectName || 'Без названия'}» будет удалён без возможности восстановления.`"
      confirm-text="Удалить проект"
      @confirm="handleConfirmDeleteProject"
    />
  </section>
</template>

<style scoped>
.tasks-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tasks-view__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: #ffffff;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.tasks-view__tabs {
  display: inline-flex;
  padding: 0.25rem;
  border-radius: 8px;
  background-color: #f3f4f6;
}

.tasks-view__tab {
  border: none;
  background: transparent;
  padding: 0.35rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 6px;
  color: #4b5563;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.tasks-view__tab:hover {
  background-color: #e5e7eb;
}

.tasks-view__tab--active {
  background-color: #ffffff;
  color: #111827;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.1);
}

.tasks-view__center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 0;
}

.tasks-view__search {
  width: 100%;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  padding: 0.4rem 1rem;
  font-size: 0.875rem;
}

.tasks-view__search::placeholder {
  color: #9ca3af;
}

.tasks-view__right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tasks-view__add-btn {
  border-radius: 8px;
  border: none;
  background-color: #111827;
  color: #ffffff;
  font-size: 0.875rem;
  padding: 0.45rem 1.25rem;
  cursor: pointer;
  font-weight: 500;
}

.tasks-view__delete-project-btn {
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background-color: #fff;
  color: #b91c1c;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.tasks-view__delete-project-btn:hover {
  background-color: #fef2f2;
  border-color: #fca5a5;
  color: #991b1b;
}

.tasks-view__stats {
  margin-top: -0.5rem;
}

.tasks-view__body {
  border-radius: 0.75rem;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

</style>

