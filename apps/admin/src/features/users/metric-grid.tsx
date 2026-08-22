import { Button } from "@voidmix/ui/components/ui/button";
import { cn } from "@voidmix/ui/lib/utils";

export function MetricGrid() {
  return (
    <section aria-label="User metrics" className="metric-grid">
      <MetricCard change="+8.2%" detail="vs. last month" label="Total users" value="2,416" />
      <MetricCard change="+12.4%" detail="last 30 days" label="Active users" value="1,892" />
      <MetricCard change="24 waiting" detail="72% accepted" label="Pending invites" value="68" />
      <MetricCard change="0.8%" detail="within target" label="Suspension rate" value="19" warning />
    </section>
  );
}

function MetricCard({
  label,
  value,
  change,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  change: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <article className="metric-card">
      <div>
        <span>{label}</span>
        <Button
          aria-label={`More options for ${label}`}
          className="metric-menu"
          size="icon-sm"
          variant="ghost"
        >
          •••
        </Button>
      </div>
      <strong>{value}</strong>
      <p className={cn(warning && "warning")}>
        {change} <span>{detail}</span>
      </p>
    </article>
  );
}
