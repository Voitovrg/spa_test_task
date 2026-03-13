<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useTasksStore } from "../stores/tasks";
import { useProjectsStore } from "../stores/projects";
import { useNotificationsStore } from "../stores/notifications";
import type { Task, TaskPriority, TaskStatus } from "../services/tasks";

const props = defineProps<{
  modelValue: boolean;
  task: Task | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const tasksStore = useTasksStore();
const projectsStore = useProjectsStore();
const notificationsStore = useNotificationsStore();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

const isEdit = computed(() => props.task != null);

interface TaskForm {
  title: string;
  status: TaskStatus | "";
  dueDate: string;
  priority: TaskPriority;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 1, label: "1 — обычный" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5 — очень важная и срочная" },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const form = reactive<TaskForm>({
  title: "",
  status: "",
  dueDate: "",
  priority: 1,
});

const errors = reactive<Record<keyof TaskForm, string | null>>({
  title: null,
  status: null,
  dueDate: null,
  priority: null,
});

const assigneeTags = ref<string[]>([]);
const assigneeDropdownOpen = ref(false);
const assigneeQueryInput = ref("");
const assigneeInputRef = ref<HTMLInputElement | null>(null);

const availableUsers = computed(() => {
  const fromTasks = tasksStore.assignees;
  const fromProject = projectsStore.currentProject?.members ?? [];
  return [...new Set([...fromProject, ...fromTasks])].sort();
});

const filteredDropdownUsers = computed(() => {
  const selected = new Set(assigneeTags.value);
  const q = assigneeQueryInput.value.trim().toLowerCase();
  return availableUsers.value.filter((name) => {
    if (selected.has(name)) return false;
    if (!q) return true;
    return name.toLowerCase().includes(q);
  });
});

const resetForm = () => {
  form.title = "";
  form.status = "";
  form.dueDate = "";
  form.priority = 1;
  assigneeTags.value = [];
  assigneeQueryInput.value = "";
  assigneeDropdownOpen.value = false;
  (Object.keys(errors) as (keyof TaskForm)[]).forEach((key) => {
    errors[key] = null;
  });
};

const fillFromTask = (task: Task) => {
  form.title = task.title;
  form.status = task.status;
  form.dueDate = task.dueDate;
  form.priority = (task.priority ?? 1) as TaskPriority;
  assigneeTags.value = task.assignee
    ? task.assignee.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  assigneeQueryInput.value = "";
  assigneeDropdownOpen.value = false;
  (Object.keys(errors) as (keyof TaskForm)[]).forEach((key) => {
    errors[key] = null;
  });
};

watch(
  () => isOpen.value,
  (open) => {
    if (!open) return;
    if (props.task) fillFromTask(props.task);
    else resetForm();
  },
  { immediate: true },
);

watch(
  () => props.task?.id,
  () => {
    if (!isOpen.value) return;
    if (props.task) fillFromTask(props.task);
  },
);

const close = () => {
  isOpen.value = false;
};

const addAssignee = (name: string) => {
  if (!assigneeTags.value.includes(name)) {
    assigneeTags.value = [...assigneeTags.value, name];
  }
  assigneeQueryInput.value = "";
  assigneeInputRef.value?.focus();
};

const removeAssignee = (name: string) => {
  assigneeTags.value = assigneeTags.value.filter((t) => t !== name);
};

let assigneeDropdownCloseTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleCloseAssigneeDropdown = () => {
  assigneeDropdownCloseTimer = setTimeout(() => {
    assigneeDropdownOpen.value = false;
  }, 200);
};
const cancelCloseAssigneeDropdown = () => {
  if (assigneeDropdownCloseTimer) {
    clearTimeout(assigneeDropdownCloseTimer);
    assigneeDropdownCloseTimer = null;
  }
};

const validate = (): boolean => {
  let valid = true;

  if (!form.title || form.title.trim().length < 3) {
    errors.title = "Название должно быть от 3 символов";
    valid = false;
  } else if (form.title.trim().length > 120) {
    errors.title = "Название не может превышать 120 символов";
    valid = false;
  } else {
    errors.title = null;
  }

  if (!form.status) {
    errors.status = "Статус обязателен";
    valid = false;
  } else {
    errors.status = null;
  }

  if (!form.dueDate) {
    errors.dueDate = "Выберите дату";
    valid = false;
  } else if (!isEdit.value) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(form.dueDate);
    if (selected < today) {
      errors.dueDate = "Дата должна быть не раньше сегодня";
      valid = false;
    } else {
      errors.dueDate = null;
    }
  } else {
    errors.dueDate = null;
  }

  return valid;
};

const headerTitle = computed(() =>
  isEdit.value ? "Редактировать задачу" : "Создать задачу",
);
const submitLabel = computed(() =>
  isEdit.value ? "Сохранить" : "Создать задачу",
);

const isSubmitting = ref(false);

const handleSubmit = async () => {
  if (!validate()) return;

  const assigneeStr = assigneeTags.value.length
    ? assigneeTags.value.join(", ")
    : "";

  isSubmitting.value = true;
  try {
    if (isEdit.value && props.task) {
      await tasksStore.updateTask(props.task.id, {
        title: form.title.trim(),
        assignee: assigneeStr || null,
        status: form.status as TaskStatus,
        dueDate: form.dueDate,
        priority: form.priority,
      });
      notificationsStore.push("Задача обновлена", "success");
    } else {
      const projectId = projectsStore.selectedProjectId ?? undefined;
      await tasksStore.addTask({
        title: form.title.trim(),
        assignee: assigneeStr || undefined,
        status: form.status as TaskStatus,
        dueDate: form.dueDate,
        projectId,
        priority: form.priority,
      });
      notificationsStore.push("Задача успешно создана", "success");
    }

    close();
  } catch {
    notificationsStore.push(
      isEdit.value ? "Не удалось сохранить задачу" : "Не удалось создать задачу",
      "error",
    );
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div v-if="isOpen" class="task-upsert__backdrop" @click.self="close">
    <div class="task-upsert__modal" @click.stop>
      <header class="task-upsert__modal-header">
        <h2 class="task-upsert__modal-title">{{ headerTitle }}</h2>
      </header>

      <form class="task-upsert__modal-body" @submit.prevent="handleSubmit">
        <div class="task-upsert__field">
          <label class="task-upsert__label">
            <span class="task-upsert__label-row">
              <span>Название задачи *</span>
              <span class="task-upsert__char-counter">{{ form.title.length }} / 120</span>
            </span>
            <input
              v-model="form.title"
              type="text"
              class="task-upsert__input"
              :class="{ 'task-upsert__input--error': errors.title }"
              placeholder="Например, Создать страницу проектов"
            />
          </label>
          <p v-if="errors.title" class="task-upsert__error">{{ errors.title }}</p>
        </div>

        <div class="task-upsert__field">
          <label class="task-upsert__label">
            Исполнитель
            <div
              class="task-upsert__assignee-wrap"
              :class="{ 'task-upsert__assignee-wrap--focused': assigneeDropdownOpen }"
            >
              <span v-for="name in assigneeTags" :key="name" class="task-upsert__tag">
                {{ name }}
                <button
                  type="button"
                  class="task-upsert__tag-remove"
                  aria-label="Удалить"
                  @click="removeAssignee(name)"
                >
                  ×
                </button>
              </span>

              <input
                ref="assigneeInputRef"
                v-model="assigneeQueryInput"
                type="text"
                class="task-upsert__assignee-input"
                placeholder="Добавить исполнителя..."
                @focus="assigneeDropdownOpen = true; cancelCloseAssigneeDropdown();"
                @blur="scheduleCloseAssigneeDropdown()"
              />

              <div
                v-show="assigneeDropdownOpen"
                class="task-upsert__assignee-dropdown"
                @mousedown.prevent="cancelCloseAssigneeDropdown()"
              >
                <button
                  v-for="user in filteredDropdownUsers"
                  :key="user"
                  type="button"
                  class="task-upsert__assignee-option"
                  @mousedown.prevent="addAssignee(user)"
                >
                  {{ user }}
                </button>
                <p v-if="filteredDropdownUsers.length === 0" class="task-upsert__assignee-empty">
                  Нет доступных исполнителей
                </p>
              </div>
            </div>
          </label>
        </div>

        <div class="task-upsert__field">
          <label class="task-upsert__label">
            Приоритет
            <select v-model="form.priority" class="task-upsert__input">
              <option v-for="opt in PRIORITY_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="task-upsert__field">
          <label class="task-upsert__label">
            Статус *
            <select
              v-model="form.status"
              class="task-upsert__input"
              :class="{ 'task-upsert__input--error': errors.status }"
            >
              <option value="">Выберите статус</option>
              <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </label>
          <p v-if="errors.status" class="task-upsert__error">{{ errors.status }}</p>
        </div>

        <div class="task-upsert__field">
          <label class="task-upsert__label">
            Срок выполнения *
            <input
              v-model="form.dueDate"
              type="date"
              class="task-upsert__input"
              :class="{ 'task-upsert__input--error': errors.dueDate }"
            />
          </label>
          <p v-if="errors.dueDate" class="task-upsert__error">{{ errors.dueDate }}</p>
        </div>

        <footer class="task-upsert__modal-footer">
          <button type="button" class="task-upsert__btn task-upsert__btn--ghost" @click="close">
            Отмена
          </button>
          <button
            type="submit"
            class="task-upsert__btn task-upsert__btn--primary"
            :disabled="isSubmitting"
          >
            {{ submitLabel }}
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

<style scoped>
.task-upsert__backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}

.task-upsert__modal {
  width: 480px;
  max-width: 100%;
  background-color: #ffffff;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.2),
    0 10px 10px -5px rgba(15, 23, 42, 0.04);
}

.task-upsert__modal-header {
  padding: 1rem 1.25rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.task-upsert__modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.task-upsert__modal-body {
  padding: 1rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-upsert__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.task-upsert__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.task-upsert__label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-upsert__char-counter {
  font-size: 0.75rem;
  color: #6b7280;
  opacity: 0.5;
}

.task-upsert__input {
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  padding: 0.4rem 0.65rem;
  font-size: 0.875rem;
}

.task-upsert__input--error {
  border-color: #ef4444;
}

.task-upsert__assignee-wrap {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  background-color: #fff;
}

.task-upsert__assignee-wrap--focused {
  border-color: #111827;
  outline: 2px solid rgba(17, 24, 39, 0.2);
  outline-offset: 0;
}

.task-upsert__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.15rem 0.35rem;
  font-size: 0.8rem;
  border-radius: 999px;
  background-color: #e5e7eb;
  color: #374151;
}

.task-upsert__tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  margin-left: 0.1rem;
  width: 1rem;
  height: 1rem;
  border: none;
  border-radius: 999px;
  background: none;
  color: #6b7280;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.task-upsert__tag-remove:hover {
  color: #111827;
  background-color: #d1d5db;
}

.task-upsert__assignee-input {
  flex: 1;
  min-width: 120px;
  padding: 0.2rem 0;
  border: none;
  font-size: 0.875rem;
  background: transparent;
  outline: none;
}

.task-upsert__assignee-input::placeholder {
  color: #9ca3af;
}

.task-upsert__assignee-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  background-color: #fff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -2px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.task-upsert__assignee-option {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  font-size: 0.875rem;
  text-align: left;
  color: #111827;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.task-upsert__assignee-option:hover {
  background-color: #f3f4f6;
}

.task-upsert__assignee-empty {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
}

.task-upsert__error {
  font-size: 0.75rem;
  color: #b91c1c;
  margin: 0;
}

.task-upsert__modal-footer {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.task-upsert__btn {
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0.4rem 1.1rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.task-upsert__btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.task-upsert__btn--ghost {
  background-color: transparent;
  border-color: #d1d5db;
  color: #374151;
}

.task-upsert__btn--primary {
  background-color: #111827;
  color: #ffffff;
}
</style>

