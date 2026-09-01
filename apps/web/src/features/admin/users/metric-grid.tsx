import type { AdminUser } from "./types";

export function MetricGrid({
  users,
  isLoading,
}: {
  users: readonly AdminUser[];
  isLoading: boolean;
}) {
  const activeUsers = users.filter((user) => user.status === "active").length;
  const suspendedUsers = users.filter((user) => user.status === "suspended").length;
  const elevatedUsers = users.filter((user) => user.role !== "user").length;
  const activeRate = users.length ? Math.round((activeUsers / users.length) * 100) : 0;

  return (
    <section
      aria-label="User metrics"
      className="mb-7 grid grid-cols-4 border-y max-[1050px]:grid-cols-2 max-[480px]:grid-cols-1"
    >
      <MetricCard
        change="Current view"
        className="border-r max-[1050px]:border-b max-[480px]:border-r-0"
        detail="matching accounts"
        label="Users in view"
        value={isLoading ? "—" : String(users.length)}
      />
      <MetricCard
        change={`${activeRate}% of view`}
        className="border-r max-[1050px]:border-r-0 max-[1050px]:border-b"
        detail="currently active"
        label="Active users"
        value={isLoading ? "—" : String(activeUsers)}
      />
      <MetricCard
        change="Needs review"
        className="border-r max-[480px]:border-r-0 max-[480px]:border-b"
        detail="suspended accounts"
        label="Suspended users"
        value={isLoading ? "—" : String(suspendedUsers)}
      />
      <MetricCard
        change="Owner + admin"
        detail="elevated access"
        label="Elevated roles"
        value={isLoading ? "—" : String(elevatedUsers)}
      />
    </section>
  );
}

function MetricCard({
  label,
  value,
  change,
  detail,
  className,
}: {
  label: string;
  value: string;
  change: string;
  detail: string;
  className?: string;
}) {
  return (
    <article className={`min-h-32 p-5 ${className ?? ""}`}>
      <div>
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <strong className="mt-4 block text-[clamp(1.65rem,3vw,2.25rem)] font-bold tracking-[-0.04em]">
        {value}
      </strong>
      <p className="mt-2 font-mono text-[0.7rem] text-muted-foreground">
        {change} <span className="ml-1 text-muted-foreground">{detail}</span>
      </p>
    </article>
  );
}
