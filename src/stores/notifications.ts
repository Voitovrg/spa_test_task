import { defineStore } from "pinia";

export type NotificationType = "success" | "error" | "info";

export interface NotificationItem {
  id: number;
  type: NotificationType;
  message: string;
}

interface NotificationsState {
  items: NotificationItem[];
  counter: number;
}

export const useNotificationsStore = defineStore("notifications", {
  state: (): NotificationsState => ({
    items: [],
    counter: 0,
  }),

  actions: {
    push(message: string, type: NotificationType = "success", timeoutMs = 3000) {
      const id = ++this.counter;
      this.items.push({ id, type, message });

      if (timeoutMs > 0 && typeof window !== "undefined") {
        window.setTimeout(() => {
          this.remove(id);
        }, timeoutMs);
      }

      return id;
    },

    remove(id: number) {
      this.items = this.items.filter((item) => item.id !== id);
    },
  },
});

