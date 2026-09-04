import { createStore, useStore } from "@tanstack/react-store";

export const sidebarStore = createStore({ open: true });

export function useSidebarOpen() {
  return useStore(sidebarStore, (state) => state.open);
}

export function toggleSidebar() {
  sidebarStore.setState((state) => ({ open: !state.open }));
}

export function resetSidebar() {
  sidebarStore.setState(() => ({ open: true }));
}
