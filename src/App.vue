<script setup lang="ts">
import SideBar from "./components/SideBar.vue";
import TasksView from "./components/TasksView.vue";
import Notifications from "./components/Notifications.vue";
</script>

<template>
  <div class="app-layout">
    <aside class="app-layout__sidebar">
      <SideBar />
    </aside>

    <main class="app-layout__content">
      <TasksView />
    </main>

    <Notifications />
  </div>
</template>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  min-height: 100vh;
}

.app-layout__sidebar {
  border-right: 1px solid #e5e7eb;
}

.app-layout__content {
  padding: 1.5rem;
}
</style>
