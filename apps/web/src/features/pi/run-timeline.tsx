import { useTranslations } from "@voidmix/i18n/client";
import type { PiSessionView } from "../projects/types";

export function RunTimeline({ session }: { session: PiSessionView }) {
  const t = useTranslations("workspaceUi");
  return (
    <ol className="signal-run-timeline" aria-label={t("running")}>
      {(["understand", "context", "create"] as const).map((step, index) => {
        const done = session.steps.includes(step);
        const running = session.status === "running" && index === session.steps.length;
        return (
          <li key={step} data-active={running}>
            <span className="signal-run-node" aria-hidden="true">
              {done ? "✓" : running ? "◐" : index + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{t(step === "create" ? "createStep" : step)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  done
                    ? "completed"
                    : running
                      ? "running"
                      : session.status === "cancelled"
                        ? "cancelled"
                        : "idle",
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
