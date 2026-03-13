<script setup lang="ts">
import { computed, ref } from "vue";
import { useTasksStore } from "../stores/tasks";
import { useProjectsStore } from "../stores/projects";
import type { TaskPriority, TaskStatus } from "../services/tasks";

type SortDirection = "asc" | "desc";

const props = defineProps<{
  assigneeQuery?: string;
  statusFilter?: TaskStatus | "";
  priorityFilter?: TaskPriority | "";
}>();

const emit = defineEmits<{
  "update:statusFilter": [value: TaskStatus | ""];
  "update:priorityFilter": [value: TaskPriority | ""];
}>();

const tasksStore = useTasksStore();
const projectsStore = useProjectsStore();

const sortDirection = ref<SortDirection>("asc");

const setFilter = (value: TaskStatus | "") => {
  emit("update:statusFilter", value);
};

const setPriorityFilter = (value: TaskPriority | "") => {
  emit("update:priorityFilter", value);
};

const onPrioritySelect = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value;
  setPriorityFilter(v === "" ? "" : (Number(v) as TaskPriority));
};

const toggleSort = () => {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
};

const counts = computed(() => {
  const selectedId = projectsStore.selectedProjectId;
  let source =
    selectedId != null
      ? tasksStore.tasks.filter(
          (task) => Number(task.projectId) === Number(selectedId),
        )
      : tasksStore.tasks;

  if (props.assigneeQuery) {
    const q = props.assigneeQuery.toLowerCase();
    source = source.filter((t) =>
      (t.assignee ?? "").toLowerCase().includes(q),
    );
  }
  if (props.statusFilter) {
    source = source.filter((t) => t.status === props.statusFilter);
  }
  if (props.priorityFilter) {
    const p = props.priorityFilter;
    source = source.filter((t) => (t.priority ?? 1) === p);
  }

  const todo = source.filter((t) => t.status === "todo").length;
  const inProgress = source.filter((t) => t.status === "in_progress").length;
  const done = source.filter((t) => t.status === "done").length;
  const total = todo + inProgress + done || 1;

  return {
    todo,
    inProgress,
    done,
    total,
    todoPct: (todo / total) * 100,
    inProgressPct: (inProgress / total) * 100,
    donePct: (done / total) * 100,
  };
});

type StatusKey = "todo" | "in_progress" | "done";

const orderedItems = computed(() => {
  const baseItems: {
    key: StatusKey;
    count: number;
    pct: number;
    label: string;
    segmentClass: string;
    dotClass: string;
  }[] = [
    {
      key: "todo",
      count: counts.value.todo,
      pct: counts.value.todoPct,
      label: "To do",
      segmentClass: "stats__segment--todo",
      dotClass: "stats__dot--todo",
    },
    {
      key: "in_progress",
      count: counts.value.inProgress,
      pct: counts.value.inProgressPct,
      label: "In progress",
      segmentClass: "stats__segment--in-progress",
      dotClass: "stats__dot--in-progress",
    },
    {
      key: "done",
      count: counts.value.done,
      pct: counts.value.donePct,
      label: "Done",
      segmentClass: "stats__segment--done",
      dotClass: "stats__dot--done",
    },
  ];

  const items = baseItems.filter((i) => i.count > 0);

  if (sortDirection.value === "asc") {
    items.sort((a, b) => a.count - b.count);
  } else {
    items.sort((a, b) => b.count - a.count);
  }
  return items;
});

const FILTER_OPTIONS: { value: TaskStatus | ""; label: string }[] = [
  { value: "", label: "Усі" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_FILTER_OPTIONS: { value: TaskPriority | ""; label: string }[] = [
  { value: "", label: "Усі" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
];
</script>

<template>
  <div class="stats">
    <div class="stats__header">
      <span class="stats__title">Статус завдань</span>
      <div class="stats__legend">
        <span
          v-for="item in orderedItems"
          :key="item.key"
          v-memo="[item.key, item.count, item.label]"
          class="stats__legend-item"
        >
          <span class="stats__dot" :class="item.dotClass" />
          {{ item.label }} ({{ item.count }})
        </span>
      </div>
      <div class="stats__header-right">
        <span class="stats__total">{{ counts.total }} всього</span>
        <div class="stats__controls">
          <button
            v-for="opt in FILTER_OPTIONS"
            :key="opt.value || 'all'"
            type="button"
            class="stats__filter-btn"
            :class="{ 'stats__filter-btn--active': props.statusFilter === opt.value }"
            @click="setFilter(opt.value)"
          >
            {{ opt.label }}
          </button>
          <button
            type="button"
            class="stats__sort-btn"
            :title="sortDirection === 'asc' ? 'За зростанням' : 'За зменшенням'"
            @click="toggleSort"
          >
            <span
              class="stats__sort-arrow"
              :class="{
                'stats__sort-arrow--asc': sortDirection === 'asc',
                'stats__sort-arrow--desc': sortDirection === 'desc',
              }"
            />
          </button>
        </div>
        <select
          :value="props.priorityFilter ?? ''"
          class="stats__priority-select"
          aria-label="Пріоритет"
          @change="onPrioritySelect"
        >
          <option
            v-for="opt in PRIORITY_FILTER_OPTIONS"
            :key="'p-' + (opt.value || 'all')"
            :value="opt.value === '' ? '' : opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="stats__bar">
      <div
        v-for="item in orderedItems"
        :key="item.key"
        v-memo="[item.key, item.pct, item.segmentClass]"
        class="stats__segment"
        :class="item.segmentClass"
        :style="{ width: item.pct + '%' }"
      />
    </div>
  </div>
</template>

<style scoped>
.stats {
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background-color: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stats__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
  color: #4b5563;
}

.stats__title {
  font-weight: 500;
}

.stats__legend {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.75rem;
  color: #6b7280;
}

.stats__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.stats__header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stats__controls {
  display: inline-flex;
  align-items: stretch;
  flex-wrap: wrap;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background-color: #ffffff;
  overflow: hidden;
}

.stats__filter-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  border: none;
  border-radius: 0;
  border-right: 1px solid #e5e7eb;
  background-color: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.stats__filter-btn:last-of-type {
  border-right: none;
}

.stats__filter-btn:hover {
  background-color: #f3f4f6;
}

.stats__filter-btn--active {
  background-color: #111827;
  color: #ffffff;
}

.stats__filter-btn--active:hover {
  background-color: #1f2937;
}

.stats__sort-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.5rem;
  border: none;
  border-left: 1px solid #e5e7eb;
  background-color: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.stats__sort-btn:hover {
  background-color: #f3f4f6;
}

.stats__sort-arrow {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
}

.stats__sort-arrow--asc {
  border-bottom: 6px solid #4b5563;
  border-top: none;
}

.stats__sort-arrow--desc {
  border-top: 6px solid #4b5563;
  border-bottom: none;
}

.stats__priority-select {
  padding: 0.25rem 0.5rem 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background-color: #ffffff;
  font-size: 0.7rem;
  color: #374151;
  cursor: pointer;
  min-width: 3rem;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.35rem center;
}

.stats__total {
  opacity: 0.7;
}

.stats__bar {
  height: 0.6rem;
  border-radius: 18px;
  overflow: hidden;
  background-color: #e5e7eb;
  display: flex;
}

.stats__segment {
  height: 100%;
}

.stats__segment--todo {
  background-color: #1d4ed8;
}

.stats__segment--in-progress {
  background-color: #f59e0b;
}

.stats__segment--done {
  background-color: #10b981;
}

.stats__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
}

.stats__dot--todo {
  background-color: #1d4ed8;
}

.stats__dot--in-progress {
  background-color: #f59e0b;
}

.stats__dot--done {
  background-color: #10b981;
}
</style>

