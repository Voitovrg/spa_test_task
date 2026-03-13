<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  modelValue: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "confirm"): void;
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

const close = () => {
  isOpen.value = false;
};

const handleConfirm = () => {
  emit("confirm");
};
</script>

<template>
  <div v-if="isOpen" class="confirm-delete__backdrop" @click.self="close">
    <div class="confirm-delete__modal" @click.stop>
      <header class="confirm-delete__header">
        <h2 class="confirm-delete__title">{{ title }}</h2>
      </header>

      <div v-if="description" class="confirm-delete__body">
        <p class="confirm-delete__description">{{ description }}</p>
      </div>

      <footer class="confirm-delete__footer">
        <button type="button" class="confirm-delete__btn confirm-delete__btn--ghost" @click="close">
          {{ cancelText ?? "Отмена" }}
        </button>
        <button type="button" class="confirm-delete__btn confirm-delete__btn--danger" @click="handleConfirm">
          {{ confirmText ?? "Удалить" }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.confirm-delete__backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 80;
}

.confirm-delete__modal {
  width: 420px;
  max-width: 100%;
  background: #fff;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.2),
    0 10px 10px -5px rgba(15, 23, 42, 0.04);
}

.confirm-delete__header {
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.confirm-delete__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
}

.confirm-delete__body {
  padding: 0.9rem 1.25rem;
}

.confirm-delete__description {
  margin: 0;
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.45;
}

.confirm-delete__footer {
  padding: 0.75rem 1.25rem 1.1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.confirm-delete__btn {
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0.4rem 1.05rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.confirm-delete__btn--ghost {
  background: transparent;
  border-color: #d1d5db;
  color: #374151;
}

.confirm-delete__btn--danger {
  background: #b91c1c;
  color: #fff;
}

.confirm-delete__btn--danger:hover {
  background: #991b1b;
}
</style>

