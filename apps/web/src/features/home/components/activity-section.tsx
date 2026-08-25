import { ArrowRight, Pulse } from "@phosphor-icons/react";
import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { cn } from "@voidmix/ui/lib/utils";

import { activityIndicatorClassName, activityItems, activityStateClassName } from "../data";

export function ActivitySection() {
  const t = useTranslations("home");

  return (
    <section
      aria-labelledby="continue-title"
      className="min-w-0 min-[1181px]:col-start-1 min-[1181px]:row-start-2"
    >
      <div className="mb-3.5 flex items-end justify-between gap-4">
        <div>
          <span className="text-[0.72rem] text-muted-foreground">{t("liveSignal")}</span>
          <h2
            className="mt-1.5 text-[1.1rem] leading-tight tracking-[-0.02em] text-balance"
            id="continue-title"
          >
            {t("continueWhereLeftOff")}
          </h2>
        </div>
        <Button variant="link">{t("viewAll")}</Button>
      </div>

      <div className="border-t border-border" aria-label={t("recentWorkspaceActivity")}>
        {activityItems.map((item) => {
          const isFeatured = "featured" in item && item.featured;

          return (
            <article
              className={cn(
                "grid min-h-[4.75rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-border py-3 max-[760px]:grid-cols-[auto_minmax(0,1fr)] max-[760px]:items-start max-[760px]:py-3.5",
                isFeatured && "min-h-28 bg-primary/5 px-3.5 max-[760px]:px-2.5",
              )}
              key={item.title}
            >
              <span className={activityIndicatorClassName(item.tone, isFeatured)}>
                {isFeatured ? <Pulse aria-hidden="true" weight="bold" /> : null}
              </span>
              <div className="min-w-0">
                {"meta" in item ? (
                  <span className="mb-1 block text-[0.7rem] text-muted-foreground">
                    {t(item.metaKey)}
                  </span>
                ) : null}
                <strong className="block text-[0.82rem]">{t(item.titleKey)}</strong>
                <p className="mt-1 text-[0.72rem] leading-[1.45] text-muted-foreground text-pretty">
                  {t(item.detailKey)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 max-[760px]:col-start-2 max-[760px]:w-full max-[760px]:flex-row max-[760px]:items-center max-[760px]:justify-between">
                <span className={activityStateClassName(item.tone)}>{t(item.stateKey)}</span>
                {isFeatured ? (
                  <Button className="h-auto p-0" variant="link">
                    {t("openThread")}
                    <ArrowRight aria-hidden="true" data-icon="inline-end" weight="bold" />
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
