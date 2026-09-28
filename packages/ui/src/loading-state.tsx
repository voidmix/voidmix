export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col gap-5 py-8">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div aria-hidden="true" className="flex flex-col gap-4 motion-safe:animate-pulse">
        <div className="h-7 w-48 rounded-md bg-muted" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
