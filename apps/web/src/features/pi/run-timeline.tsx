import { useTranslations } from "../../i18n/client";
import { cn } from "@voidmix/ui/lib/utils";
import { CheckCircle, CircleNotch, FileText, Gear, UserCircle } from "@phosphor-icons/react";
import type { PiSessionView } from "../projects/types";

const events = [
  { step: "understand", role: "rolePm", icon: UserCircle },
  { step: "context", role: "roleDev", icon: Gear },
  { step: "create", role: "roleQa", icon: FileText },
] as const;
export function RunTimeline({ session }: { session: PiSessionView }) {
  const t = useTranslations("workspaceUi");
  const liveEvents = session.events ?? [];
  const hasLiveEvents = liveEvents.length > 0;
  return (
    <section
      className="my-7 rounded-xl border border-border bg-card p-5"
      aria-label={t("activityLog")}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">
            {hasLiveEvents ? t("activityLog") : t("previewEvents")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("eventNote")}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {hasLiveEvents
            ? `${liveEvents.length} events`
            : t("stepsComplete", { count: session.steps.length })}
        </span>
      </div>
      <ol
        className={cn("grid gap-2", hasLiveEvents ? "md:grid-cols-1" : "md:grid-cols-3")}
        aria-label={t("running")}
      >
        {hasLiveEvents
          ? liveEvents.map((event) => {
              const payload = event.payload;
              const text =
                typeof payload.text === "string"
                  ? payload.text
                  : typeof payload.message === "string"
                    ? payload.message
                    : JSON.stringify(payload);
              const role =
                typeof payload.role === "string"
                  ? payload.role
                  : typeof payload.agent === "string"
                    ? payload.agent
                    : "Pi";
              const kind = event.type.replaceAll("_", " ");
              return (
                <li key={event.id} className="rounded-lg border border-border/70 bg-background p-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-primary">{role}</span>
                    <time
                      className="text-muted-foreground"
                      dateTime={event.createdAt.toISOString()}
                    >
                      {event.createdAt.toLocaleTimeString()}
                    </time>
                  </div>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {kind}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
                    {text}
                  </p>
                  {Array.isArray(payload.files) ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {payload.files
                        .filter((file): file is string => typeof file === "string")
                        .map((file) => (
                          <span key={file} className="rounded bg-muted px-2 py-1 text-[11px]">
                            {file}
                          </span>
                        ))}
                    </div>
                  ) : null}
                </li>
              );
            })
          : events.map(({ step, role, icon: Icon }, i) => {
              const done = session.steps.includes(step);
              const active = session.status === "running" && i === session.steps.length;
              return (
                <li
                  key={step}
                  className={cn(
                    "rounded-lg border border-border/70 bg-background p-3",
                    active && "border-primary/50 bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs font-medium">{t(role)}</span>
                    {done ? (
                      <CheckCircle className="ml-auto text-primary" aria-label={t("completed")} />
                    ) : active ? (
                      <CircleNotch
                        className="ml-auto animate-spin text-primary"
                        aria-label={t("running")}
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-medium">
                    {t(step === "create" ? "createStep" : step)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      done
                        ? "completed"
                        : active
                          ? "running"
                          : session.status === "cancelled"
                            ? "cancelled"
                            : "idle",
                    )}
                  </p>
                </li>
              );
            })}
      </ol>
    </section>
  );
}
