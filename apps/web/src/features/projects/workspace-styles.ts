const workspaceSurfaceClass = "border border-border bg-background";

const workspaceFocusRingClass =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const workspaceTransitionClass = "transition-colors motion-reduce:transition-none";

export const workspaceInputClass = `min-h-9 w-full rounded-lg ${workspaceSurfaceClass} px-3 py-2 text-sm ${workspaceTransitionClass} ${workspaceFocusRingClass} disabled:cursor-not-allowed disabled:opacity-50`;

export const workspaceContextSelectClass = `min-h-8 w-auto min-w-0 max-w-60 truncate rounded-md ${workspaceSurfaceClass} px-2 py-1 text-xs text-muted-foreground ${workspaceTransitionClass} ${workspaceFocusRingClass}`;

export const workspaceFieldClass = "grid gap-2 text-xs text-muted-foreground";

export const workspaceLabelClass = "text-xs font-medium text-muted-foreground";

export const workspaceSearchRowClass = `flex items-center gap-3 rounded-md p-3 text-sm [overflow-wrap:anywhere] ${workspaceTransitionClass} hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`;

export const workspaceProjectGridClass =
  "grid grid-cols-3 gap-3.5 max-[1100px]:grid-cols-2 max-[520px]:grid-cols-1";
