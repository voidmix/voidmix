import { createStore, useStore } from "@tanstack/react-store";

const workspaceShellStore = createStore({ collapsed: false });

export function useWorkspaceShellCollapsed() {
  return useStore(workspaceShellStore, (state) => state.collapsed);
}

export function toggleWorkspaceShell() {
  workspaceShellStore.setState((state) => ({ collapsed: !state.collapsed }));
}

export function resetWorkspaceShell() {
  workspaceShellStore.setState(() => ({ collapsed: false }));
}
