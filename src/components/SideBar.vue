<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useProjectsStore } from "../stores/projects";
import { useTasksStore } from "../stores/tasks";
import { useNotificationsStore } from "../stores/notifications";

const projectsStore = useProjectsStore();
const tasksStore = useTasksStore();
const notificationsStore = useNotificationsStore();

const taskCountByProjectId = computed(() => {
  const map = new Map<number, number>();
  tasksStore.tasks.forEach((task) => {
    if (task.projectId != null) {
      const id = Number(task.projectId);
      map.set(id, (map.get(id) ?? 0) + 1);
    }
  });
  return map;
});

const getTaskCount = (projectId: number) =>
  taskCountByProjectId.value.get(Number(projectId)) ?? 0;

const search = ref("");
const isAdding = ref(false);

interface ProjectForm {
  name: string;
}

const form = reactive<ProjectForm>({
  name: "",
});

const errors = reactive<{
  name: string | null;
}>({
  name: null,
});

const filteredProjects = computed(() => {
  const term = search.value.toLowerCase();
  return projectsStore.activeProjects.filter((project) =>
    project.name.toLowerCase().includes(term),
  );
});

const isSelected = (id: number) => {
  return projectsStore.selectedProjectId === id;
};

const selectProject = (id: number) => {
  projectsStore.selectProject(id);
};

const openAddModal = () => {
  form.name = "";
  errors.name = null;
  isAdding.value = true;
};

const closeAddModal = () => {
  isAdding.value = false;
};

const validateForm = () => {
  let valid = true;

  if (!form.name || form.name.trim().length < 3) {
    errors.name = "Назва проєкту має містити від 3 символів";
    valid = false;
  } else {
    errors.name = null;
  }

  return valid;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  await projectsStore.addProject({
    name: form.name.trim(),
  });

  notificationsStore.push("Проєкт успішно створено", "success");
  closeAddModal();
};

onMounted(async () => {
  await projectsStore.fetchProjects();
});
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__header">
      <div class="sidebar__search-wrapper">
        <input
          v-model="search"
          class="sidebar__search"
          type="text"
          placeholder="Пошук проєкту"
        />
      </div>
      <button
        type="button"
        class="sidebar__add-button"
        @click="openAddModal"
      >
        +
      </button>
    </div>

    <div class="sidebar__list">
      <button
        v-for="project in filteredProjects"
        :key="project.id"
        v-memo="[
          project.id,
          project.name,
          project.description,
          getTaskCount(project.id),
          isSelected(project.id),
        ]"
        type="button"
        class="sidebar__project"
        :class="{ 'sidebar__project--active': isSelected(project.id) }"
        @click="selectProject(project.id)"
      >
        <div class="sidebar__project-main">
          <span class="sidebar__project-name">
            {{ project.name }}
          </span>
          <span class="sidebar__project-badge">
            {{ getTaskCount(project.id) }}
          </span>
        </div>
        <p
          v-if="project.description"
          class="sidebar__project-description"
        >
          {{ project.description }}
        </p>
      </button>

      <p
        v-if="!filteredProjects.length"
        class="sidebar__empty"
      >
        Проєкти не знайдено
      </p>
    </div>

    <div
      v-if="isAdding"
      class="sidebar__backdrop"
      @click.self="closeAddModal"
    >
      <div class="sidebar__modal">
        <header class="sidebar__modal-header">
          <h2 class="sidebar__modal-title">Новий проєкт</h2>
        </header>

        <form
          class="sidebar__modal-body"
          @submit.prevent="handleSubmit"
        >
          <div class="sidebar__field">
            <label class="sidebar__label">
              Назва проєкту *
              <input
                v-model="form.name"
                type="text"
                class="sidebar__input"
                :class="{ 'sidebar__input--error': errors.name }"
                placeholder="Наприклад, CRM Dashboard"
              />
            </label>
            <p
              v-if="errors.name"
              class="sidebar__error"
            >
              {{ errors.name }}
            </p>
          </div>

          <footer class="sidebar__modal-footer">
            <button
              type="button"
              class="sidebar__button sidebar__button--ghost"
              @click="closeAddModal"
            >
              Скасувати
            </button>
            <button
              type="submit"
              class="sidebar__button sidebar__button--primary"
            >
              Зберегти
            </button>
          </footer>
        </form>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  gap: 0.75rem;
}

.sidebar__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar__search-wrapper {
  flex: 1;
}

.sidebar__search {
  width: 100%;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  padding: 0.4rem 0.75rem;
  font-size: 0.875rem;
}

.sidebar__add-button {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: none;
  background-color: #111827;
  color: #ffffff;
  font-size: 1.25rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.sidebar__list {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar__project {
  width: 100%;
  text-align: left;
  border-radius: 0.75rem;
  border: none;
  padding: 0.5rem 0.6rem;
  background-color: transparent;
  cursor: pointer;
}

.sidebar__project--active {
  background-color: #111827;
  color: #f9fafb;
}

.sidebar__project-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.sidebar__project-name {
  font-size: 0.875rem;
  font-weight: 500;
}

.sidebar__project-badge {
  min-width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sidebar__project-description {
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.sidebar__project--active .sidebar__project-description {
  color: rgba(249, 250, 251, 0.7);
}

.sidebar__empty {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: #9ca3af;
}

.sidebar__backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
}

.sidebar__modal {
  width: 420px;
  max-width: 100%;
  background-color: #ffffff;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.2),
    0 10px 10px -5px rgba(15, 23, 42, 0.04);
}

.sidebar__modal-header {
  padding: 1rem 1.25rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar__modal-title {
  font-size: 1.05rem;
  font-weight: 600;
}

.sidebar__modal-body {
  padding: 1rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sidebar__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar__input {
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  padding: 0.4rem 0.65rem;
  font-size: 0.875rem;
}

.sidebar__input--error {
  border-color: #ef4444;
}

.sidebar__error {
  font-size: 0.75rem;
  color: #b91c1c;
}

.sidebar__modal-footer {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.sidebar__button {
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0.35rem 1.1rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.sidebar__button--ghost {
  background-color: transparent;
  border-color: #d1d5db;
  color: #374151;
}

.sidebar__button--primary {
  background-color: #111827;
  color: #ffffff;
}
</style>
