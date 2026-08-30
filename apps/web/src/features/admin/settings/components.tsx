import { CircleNotch } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Badge } from "@voidmix/ui/components/ui/badge";
import { Button } from "@voidmix/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@voidmix/ui/components/ui/card";
import { FieldLabel } from "@voidmix/ui/components/ui/field";

export type SettingSource = "database" | "environment" | "default" | "missing";

export function SettingsPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="flex items-end justify-between py-9 pt-14 max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-6 max-[760px]:pt-10">
      <div>
        <span className="text-xs font-semibold text-muted-foreground">
          Control / System settings
        </span>
        <h1 className="mt-3 text-[clamp(2.1rem,4vw,3.6rem)] leading-none font-bold tracking-[-0.04em]">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">{description}</p>
      </div>
    </header>
  );
}

export function SettingsLoading({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-40 items-center justify-center text-muted-foreground">
        <CircleNotch className="animate-spin" aria-hidden="true" />
        <span className="ml-2">Loading {label}…</span>
      </CardContent>
    </Card>
  );
}

export function SettingsUnavailable({
  title,
  error,
  fallback,
  onRetry,
}: {
  title: string;
  error: string | null;
  fallback: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{error ?? fallback}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </CardFooter>
    </Card>
  );
}

export function SettingFieldHeading({
  canWrite = true,
  htmlFor,
  label,
  onReset,
  resetLabel = "Restore default",
  source,
}: {
  canWrite?: boolean;
  htmlFor?: string;
  label: string;
  onReset: () => void;
  resetLabel?: string;
  source: SettingSource;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      <SourceBadge source={source} />
      {canWrite && source === "database" ? (
        <Button size="xs" type="button" variant="ghost" onClick={onReset}>
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function SourceBadge({ source }: { source: SettingSource }) {
  return (
    <Badge variant={source === "database" ? "secondary" : "outline"}>{sourceLabel(source)}</Badge>
  );
}

export function sourceLabel(source: SettingSource): string {
  if (source === "database") return "Database override";
  if (source === "environment") return "Environment";
  if (source === "default") return "Default";
  return "Missing";
}

export function formatValue(value: ReactNode): ReactNode {
  if (value === null || value === "") return "no value";
  if (typeof value === "boolean") return value ? "enabled" : "disabled";
  return value;
}

export function ConfigurationBadge({ state }: { state: "ready" | "disabled" | "incomplete" }) {
  if (state === "ready") return <Badge>Ready</Badge>;
  if (state === "disabled") return <Badge variant="secondary">Disabled</Badge>;
  return <Badge variant="destructive">Incomplete</Badge>;
}
