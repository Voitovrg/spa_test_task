<script setup lang="ts">
import { computed } from "vue";
import { useNotificationsStore } from "../stores/notifications";

const notificationsStore = useNotificationsStore();

const items = computed(() => notificationsStore.items);

const close = (id: number) => {
  notificationsStore.remove(id);
};
</script>

<template>
  <div class="notifications">
    <div
      v-for="item in items"
      :key="item.id"
      v-memo="[item.id, item.message, item.type]"
      class="notifications__item"
      :data-type="item.type"
    >
      <span class="notifications__message">
        {{ item.message }}
      </span>
      <button
        type="button"
        class="notifications__close"
        @click="close(item.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
.notifications {
  position: fixed;
  top: 1rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 50;
}

.notifications__item {
  min-width: 220px;
  max-width: 320px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.9rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.25),
    0 4px 6px -4px rgba(15, 23, 42, 0.2);
  color: #022c22;
  background-color: #ecfdf5;
  border: 1px solid #6ee7b7;
}

.notifications__item[data-type="error"] {
  color: #7f1d1d;
  background-color: #fef2f2;
  border-color: #fecaca;
}

.notifications__item[data-type="info"] {
  color: #1e3a8a;
  background-color: #eff6ff;
  border-color: #bfdbfe;
}

.notifications__message {
  flex: 1;
}

.notifications__close {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
</style>

