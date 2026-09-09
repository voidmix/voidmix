import { ArrowRight, CaretDown, CaretUp, CheckCircle, CircleNotch } from "@phosphor-icons/react";
import { useTranslations } from "../../../i18n/client";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Button } from "@voidmix/ui/components/ui/button";
import { useState } from "react";
import type { SignalItem } from "../data";

export function TodayWorkList({
  items,
  onOpenItem,
  onCompleteItem,
}: {
  items: readonly SignalItem[];
  onOpenItem: (item: SignalItem) => void;
  onCompleteItem: (item: SignalItem) => void;
}) {
  const t = useTranslations("home");
  const [expanded, setExpanded] = useState(false);
  const visibleItems = items.filter((item) => item.status !== "complete").slice(0, 3);
  return (
    <section aria-labelledby="today-work-title" className="border-t border-border pt-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
            {t("todayQueue")}
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight" id="today-work-title">
            {t("todayWorkDescription")}
          </h2>
        </div>
        <Button
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          size="sm"
          variant="ghost"
        >
          {expanded ? t("hideQueue") : t("showQueue")}
          {expanded ? <CaretUp data-icon="inline-end" /> : <CaretDown data-icon="inline-end" />}
        </Button>
      </div>
      {expanded ? (
        <div className="mt-4 grid gap-2">
          {visibleItems.map((item) => (
            <TodayWorkRow
              item={item}
              key={item.id}
              onComplete={() => onCompleteItem(item)}
              onOpen={() => onOpenItem(item)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          {visibleItems.length} {t("queueItemsReady")}
        </p>
      )}
    </section>
  );
}

function TodayWorkRow({
  item,
  onOpen,
  onComplete,
}: {
  item: SignalItem;
  onOpen: () => void;
  onComplete: () => void;
}) {
  const t = useTranslations("home");
  const statusKey =
    item.status === "blocked" ? "blocked" : item.status === "working" ? "working" : "pending";
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-card px-3 py-3">
      <span className="text-muted-foreground">
        {item.status === "working" ? (
          <CircleNotch className="animate-spin motion-reduce:animate-none" />
        ) : (
          <CheckCircle
            className="text-muted-foreground"
            weight={item.status === "complete" ? "fill" : "regular"}
          />
        )}
      </span>
      <button className="min-w-0 text-left" onClick={onOpen}>
        <strong className="block truncate text-sm hover:underline">{t(item.titleKey)}</strong>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {item.ownerKey ? t(item.ownerKey) : item.owner} ·{" "}
          {t("minutesAgo", { count: item.timestamp })}
        </span>
      </button>
      <div className="flex items-center gap-2">
        <Badge variant={item.status === "blocked" ? "destructive" : "secondary"}>
          {t(statusKey)}
        </Badge>
        <Button aria-label={t("openDetails")} onClick={onOpen} size="icon-sm" variant="ghost">
          <ArrowRight />
        </Button>
        <Button aria-label={t("markDone")} onClick={onComplete} size="icon-sm" variant="ghost">
          <CheckCircle />
        </Button>
      </div>
    </div>
  );
}
