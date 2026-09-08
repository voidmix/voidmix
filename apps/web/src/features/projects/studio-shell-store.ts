import { createStore, useStore } from "@tanstack/react-store";

const projectStudioShellStore = createStore({ collapsed: false });

export function useProjectStudioShellCollapsed() {
  return useStore(projectStudioShellStore, (state) => state.collapsed);
}

export function toggleProjectStudioShell() {
  projectStudioShellStore.setState((state) => ({ collapsed: !state.collapsed }));
}

export function resetProjectStudioShell() {
  projectStudioShellStore.setState(() => ({ collapsed: false }));
}
