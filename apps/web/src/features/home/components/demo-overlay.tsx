import { X, ArrowRight, Check, Gear, MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import { useTranslations } from "../../../i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { useEffect, useRef } from "react";
import { signals, type SignalItem } from "../data";

export type DemoOverlayState = {
  kind: "search" | "workspace" | "team" | "settings" | "item";
  item?: SignalItem;
} | null;

export function DemoOverlay({
  state,
  onClose,
  onComplete,
}: {
  state: DemoOverlayState;
  onClose: () => void;
  onComplete?: (item: SignalItem) => void;
}) {
  const t = useTranslations("home");
  const commonT = useTranslations("common");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!state) return;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, state]);
  if (!state) return null;
  const item = state.kind === "item" ? state.item : undefined;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-label={
          item
            ? t(item.titleKey)
            : t(
                state.kind === "search"
                  ? "quickSearch"
                  : state.kind === "workspace"
                    ? "switchWorkspace"
                    : state.kind === "team"
                      ? "team"
                      : "settings",
              )
        }
        aria-modal="true"
        className="w-full max-w-lg rounded-lg border border-border bg-background p-5 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-foreground">
              {state.kind === "search" ? (
                <MagnifyingGlass />
              ) : state.kind === "team" ? (
                <UsersThree />
              ) : state.kind === "settings" ? (
                <Gear />
              ) : (
                <span className="font-mono text-xs">N</span>
              )}
            </span>
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                {t("signalRoom")}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">
                {item
                  ? t(item.titleKey)
                  : t(
                      state.kind === "search"
                        ? "quickSearch"
                        : state.kind === "workspace"
                          ? "switchWorkspace"
                          : state.kind === "team"
                            ? "team"
                            : "settings",
                    )}
              </h2>
            </div>
          </div>
          <Button
            ref={closeRef}
            aria-label={t("closePanel")}
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X />
          </Button>
        </div>
        {state.kind === "search" ? (
          <SearchPanel />
        ) : item ? (
          <ItemPanel item={item} onComplete={onComplete} onClose={onClose} />
        ) : state.kind === "workspace" ? (
          <div className="mt-6 grid gap-3">
            <div className="rounded-md border border-primary bg-primary/5 p-4">
              <strong>{t("northstarWorkspace")}</strong>
              <p className="mt-1 text-sm text-muted-foreground">{t("workspaceSummary")}</p>
            </div>
            <p className="text-sm text-muted-foreground">{t("sampleOnly")}</p>
          </div>
        ) : state.kind === "team" ? (
          <p className="mt-6 text-sm leading-6 text-muted-foreground">{t("teamDescription")}</p>
        ) : (
          <div className="mt-6 grid gap-3 text-sm">
            <p className="text-muted-foreground">{t("settingsDescription")}</p>
            <div className="flex justify-between border-t border-border pt-3">
              <span>{t("preferencesLanguage")}</span>
              <span className="text-muted-foreground">{commonT("english")}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <span>{t("preferencesTheme")}</span>
              <span className="text-muted-foreground">{commonT("themeSystem")}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
function SearchPanel() {
  const t = useTranslations("home");
  return (
    <div className="mt-6">
      <input
        autoFocus
        aria-label={t("quickSearch")}
        className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder={t("searchPlaceholder")}
      />
      <div className="mt-4 grid gap-1">
        {signals.slice(0, 3).map((item) => (
          <div
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
            key={item.id}
          >
            <span>{t(item.titleKey)}</span>
            <ArrowRight className="text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}
function ItemPanel({
  item,
  onComplete,
  onClose,
}: {
  item: SignalItem;
  onComplete?: ((item: SignalItem) => void) | undefined;
  onClose: () => void;
}) {
  const t = useTranslations("home");
  return (
    <div className="mt-6">
      <p className="text-sm leading-6 text-muted-foreground">{t(item.detailKey)}</p>
      <div className="mt-5 grid gap-2 border-y border-border py-4 text-xs">
        <div className="flex justify-between">
          <span>{t("ownerLabel")}</span>
          <strong>{item.ownerKey ? t(item.ownerKey) : item.owner}</strong>
        </div>
        <div className="flex justify-between">
          <span>{t("projectUpdated")}</span>
          <span>{t("minutesAgo", { count: item.timestamp })}</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            onComplete?.(item);
            onClose();
          }}
          variant="primary"
        >
          <Check data-icon="inline-start" />
          {t(item.status === "complete" ? "handled" : "markDone")}
        </Button>
        <Button onClick={onClose} variant="secondary">
          {t("openDetails")}
        </Button>
      </div>
    </div>
  );
}
