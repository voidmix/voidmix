import { useTranslations } from "../../i18n/client";
import { cn } from "@voidmix/ui/lib/utils";
import type { PiSessionView } from "../projects/types";

export function RunTimeline({ session }: { session: PiSessionView }) {
  const t = useTranslations("workspaceUi");
  return (
    <ol className="my-[26px]" aria-label={t("running")}>
      {(["understand", "context", "create"] as const).map((step, index) => {
        const done = session.steps.includes(step);
        const running = session.status === "running" && index === session.steps.length;
        return (
          <li
            key={step}
            className="relative flex items-center gap-4 py-3.5 before:absolute before:top-[-14px] before:left-[15px] before:h-[30px] before:w-px before:bg-border before:content-[''] first:before:hidden"
          >
            <span
              className={cn(
                "z-[1] grid size-[30px] shrink-0 place-items-center rounded-full border border-border bg-background text-xs",
                running && "border-foreground bg-foreground text-background",
              )}
              aria-hidden="true"
            >
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
