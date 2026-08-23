import { Button } from "@voidmix/ui/components/ui/button";

export function MetricGrid() {
  return (
    <section
      aria-label="User metrics"
      className="mb-7 grid grid-cols-4 border-y max-[1050px]:grid-cols-2 max-[480px]:grid-cols-1"
    >
      <MetricCard
        change="+8.2%"
        className="border-r max-[1050px]:border-b max-[480px]:border-r-0"
        detail="vs. last month"
        label="Total users"
        value="2,416"
      />
      <MetricCard
        change="+12.4%"
        className="border-r max-[1050px]:border-r-0 max-[1050px]:border-b"
        detail="last 30 days"
        label="Active users"
        value="1,892"
      />
      <MetricCard
        change="24 waiting"
        className="border-r max-[480px]:border-r-0 max-[480px]:border-b"
        detail="72% accepted"
        label="Pending invites"
        value="68"
      />
      <MetricCard change="0.8%" detail="within target" label="Suspension rate" value="19" warning />
    </section>
  );
}

function MetricCard({
  label,
  value,
  change,
  detail,
  className,
  warning = false,
}: {
  label: string;
  value: string;
  change: string;
  detail: string;
  className?: string;
  warning?: boolean;
}) {
  return (
    <article className={`min-h-32 p-5 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <Button aria-label={`More options for ${label}`} size="icon-sm" variant="ghost">
          •••
        </Button>
      </div>
      <strong className="mt-4 block text-[clamp(1.65rem,3vw,2.25rem)] font-bold tracking-[-0.04em]">
        {value}
      </strong>
      <p
        className={`mt-2 font-mono text-[0.7rem] ${warning ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}
      >
        {change} <span className="ml-1 text-muted-foreground">{detail}</span>
      </p>
    </article>
  );
}
