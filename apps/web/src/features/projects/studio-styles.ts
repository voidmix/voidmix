const studioSurfaceClass = "border border-border bg-background";

const studioFocusRingClass =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const studioTransitionClass = "transition-colors motion-reduce:transition-none";

export const studioInputClass = `min-h-9 w-full rounded-lg ${studioSurfaceClass} px-3 py-2 text-sm ${studioTransitionClass} ${studioFocusRingClass} disabled:cursor-not-allowed disabled:opacity-50`;

export const studioContextSelectClass = `min-h-8 w-auto min-w-0 max-w-60 truncate rounded-md ${studioSurfaceClass} px-2 py-1 text-xs text-muted-foreground ${studioTransitionClass} ${studioFocusRingClass}`;

export const studioFieldClass = "grid gap-2 text-xs text-muted-foreground";

export const studioLabelClass = "text-xs font-medium text-muted-foreground";

export const studioSearchRowClass = `flex items-center gap-3 rounded-md p-3 text-sm [overflow-wrap:anywhere] ${studioTransitionClass} hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`;

export const studioProjectGridClass =
  "grid grid-cols-3 gap-3.5 max-[1100px]:grid-cols-2 max-[520px]:grid-cols-1";
