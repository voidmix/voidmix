import { ArrowUpRight, Sparkle } from "@phosphor-icons/react";
import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { useEffect, useState } from "react";
import { Composer } from "../../chat/components/composer";
import { quickTemplates } from "../data";

export function HomeCommandCenter({
  draft,
  onDraftChange,
  onSubmit,
  disabled,
  focusKey,
  onNewTask,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled: boolean;
  focusKey: number;
  onNewTask: () => void;
}) {
  const t = useTranslations("home");
  const [execution, setExecution] = useState(false);
  useEffect(() => {
    if (!execution) return;
    const timer = window.setTimeout(() => setExecution(false), 1800);
    return () => window.clearTimeout(timer);
  }, [execution]);
  function submit(value: string) {
    setExecution(true);
    onSubmit(value);
  }
  return (
    <section aria-labelledby="command-title" className="grid gap-8 text-foreground sm:gap-9">
      <div className="text-center">
        <p className="text-xs font-medium text-muted-foreground">{t("signalRoom")}</p>
        <h1
          className="mx-auto mt-4 max-w-2xl text-balance text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.15] tracking-[-0.04em]"
          id="command-title"
        >
          {t("startTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
          {t("startDescription")}
        </p>
      </div>
      <div className="grid gap-4">
        <Composer
          disabled={disabled}
          focusKey={focusKey}
          onSubmit={submit}
          onValueChange={onDraftChange}
          value={draft}
          variant="launcher"
        />
        <div
          className="flex flex-wrap items-center justify-center gap-2"
          aria-label={t("quickActions")}
        >
          {quickTemplates.map((template) => (
            <Button
              className="border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              key={template.label}
              onClick={() => onDraftChange(t(template.prompt))}
              size="sm"
              variant="secondary"
            >
              <Sparkle data-icon="inline-start" />
              {t(template.label)}
            </Button>
          ))}
          <Button className="text-muted-foreground" onClick={onNewTask} size="sm" variant="ghost">
            {t("newTask")}
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </div>
        {execution ? (
          <p aria-live="polite" className="text-center text-xs text-muted-foreground">
            {t("executionLoading")}
          </p>
        ) : null}
      </div>
      <p className="text-center text-xs text-muted-foreground">{t("demoWorkspace")}</p>
    </section>
  );
}
