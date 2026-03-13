import { createApp } from "vue";
import { createPinia } from "pinia";
import "./style.css";
import App from "./App.vue";

const app = createApp(App);

const pinia = createPinia();

pinia.use(({ store }) => {
  if (typeof window === "undefined") return;

  const storageKey = `spa_test_task:store:${store.$id}`;

  const fromStorage = window.localStorage.getItem(storageKey);
  if (fromStorage) {
    try {
      store.$patch(JSON.parse(fromStorage));
    } catch (error) {
      console.error("Failed to restore store from localStorage", error);
    }
  }

  store.$subscribe(
    (_mutation, state) => {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    },
    { detached: true },
  );
});

app.use(pinia);

app.mount("#app");
