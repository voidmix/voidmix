import { CircleNotch } from "@phosphor-icons/react";
import { useTranslations } from "../../../i18n/client";
import type { WebTranslator } from "../../../i18n/client";
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
  const t = useTranslations("admin");
  return (
    <header className="flex items-end justify-between py-9 pt-14 max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-6 max-[760px]:pt-10">
      <div>
        <span className="text-xs font-semibold text-muted-foreground">
          {t("controlSystemSettings")}
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
  const t = useTranslations("admin");
  return (
    <Card>
      <CardContent className="flex min-h-40 items-center justify-center text-muted-foreground">
        <CircleNotch className="animate-spin" aria-hidden="true" />
        <span className="ml-2">{t("loadingSetting", { label })}</span>
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
  error: ReactNode;
  fallback: string;
  onRetry: () => void;
}) {
  const t = useTranslations("admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{error ?? fallback}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="outline" onClick={onRetry}>
          {t("retry")}
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
  resetLabel,
  source,
}: {
  canWrite?: boolean;
  htmlFor?: string;
  label: string;
  onReset: () => void;
  resetLabel?: string;
  source: SettingSource;
}) {
  const t = useTranslations("admin");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      <SourceBadge source={source} />
      {canWrite && source === "database" ? (
        <Button size="xs" type="button" variant="ghost" onClick={onReset}>
          {resetLabel ?? t("restoreDefault")}
        </Button>
      ) : null}
    </div>
  );
}

export function SourceBadge({ source }: { source: SettingSource }) {
  const t = useTranslations("admin");
  return (
    <Badge variant={source === "database" ? "secondary" : "outline"}>
      {sourceLabel(source, t)}
    </Badge>
  );
}

export function sourceLabel(source: SettingSource, t: WebTranslator<"admin">): string {
  if (source === "database") return t("sourceDatabase");
  if (source === "environment") return t("sourceEnvironment");
  if (source === "default") return t("sourceDefault");
  return t("sourceMissing");
}

export function formatValue(value: unknown, t: WebTranslator<"admin">): string {
  if (value === null || value === "") return t("noValue");
  if (typeof value === "boolean") return value ? t("enabled") : t("disabled");
  return String(value);
}

export function ConfigurationBadge({ state }: { state: "ready" | "disabled" | "incomplete" }) {
  const t = useTranslations("admin");
  if (state === "ready") return <Badge>{t("ready")}</Badge>;
  if (state === "disabled") return <Badge variant="secondary">{t("disabled")}</Badge>;
  return <Badge variant="destructive">{t("incomplete")}</Badge>;
}
