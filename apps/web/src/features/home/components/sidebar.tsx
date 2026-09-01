import { ArrowRight, Bell, Gear, Plus, UsersThree } from "@phosphor-icons/react";
import { useTranslations } from "@voidmix/i18n/client";
import { Avatar } from "@voidmix/ui/avatar";
import { Button } from "@voidmix/ui/components/ui/button";
import { Logo } from "@voidmix/ui/logo";

import {
  navigation,
  navigationClassName,
  navigationHref,
  recentThreads,
  type WorkspaceSectionId,
} from "../data";

export function HomeSidebar({
  activeSection = "overview",
}: {
  activeSection?: WorkspaceSectionId;
}) {
  const t = useTranslations("home");

  return (
    <aside
      aria-label={t("workspace")}
      className="sticky top-0 flex h-dvh min-h-0 flex-col overflow-y-auto border-r border-border bg-muted px-3 py-[1.15rem] pb-[0.9rem] max-[1180px]:px-2.5 max-[760px]:hidden"
    >
      <div className="flex flex-col gap-5">
        <a
          aria-label="Voidmix home"
          className="inline-flex w-fit px-1.5 text-foreground max-[1180px]:px-0"
          href="/"
        >
          <Logo className="text-[1.08rem] max-[1180px]:[&>span]:hidden [&>img]:size-6" />
        </a>
        <Button
          aria-label={t("switchWorkspace")}
          className="min-h-[3.1rem] w-full justify-start gap-2.5 rounded-[0.55rem] border border-border bg-card px-2.5 py-2.5 text-left transition-colors hover:border-input hover:bg-primary/10 max-[1180px]:size-10 max-[1180px]:min-h-0 max-[1180px]:justify-center max-[1180px]:gap-0 max-[1180px]:px-0"
          variant="ghost"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary text-[0.72rem] font-extrabold text-primary-foreground">
            N
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-[0.78rem] font-bold max-[1180px]:hidden">
            <small className="text-[0.7rem] font-medium text-muted-foreground">
              {t("workspace")}
            </small>
            Northstar
          </span>
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 rotate-90 text-muted-foreground max-[1180px]:hidden"
          />
        </Button>
      </div>

      <Button
        aria-label={t("newTask")}
        className="mt-5 w-full max-[1180px]:size-10 max-[1180px]:min-h-0 max-[1180px]:px-0"
        onClick={() => {
          window.location.hash = "ask-voidmix";
        }}
        size="lg"
        variant="secondary"
      >
        <Plus aria-hidden="true" data-icon="inline-start" weight="bold" />
        <span className="max-[1180px]:hidden">{t("newTask")}</span>
      </Button>

      <nav aria-label={t("workspace")} className="mt-7 flex flex-col gap-0.5">
        <p className="mb-1.5 px-2.5 text-[0.7rem] font-semibold tracking-[0.025em] text-muted-foreground max-[1180px]:hidden">
          {t("workspace")}
        </p>
        {navigation.map((item) => {
          const Icon = item.icon;
          const current = activeSection === item.id;

          return (
            <a
              aria-current={current ? "page" : undefined}
              aria-label={t(item.messageKey)}
              className={navigationClassName({ current })}
              href={navigationHref(item)}
              key={item.label}
            >
              <Icon aria-hidden="true" weight={current ? "fill" : "regular"} />
              <span className="max-[1180px]:hidden">{t(item.messageKey)}</span>
              {"count" in item && item.count ? (
                <b className="ml-auto flex min-w-[1.15rem] items-center justify-center rounded-full bg-input px-1 text-[0.65rem] font-bold text-secondary-foreground">
                  {item.count}
                </b>
              ) : null}
            </a>
          );
        })}
      </nav>

      <div className="mt-7 flex flex-col gap-0.5 border-t border-border pt-[1.15rem] max-[1180px]:hidden">
        <p className="mb-1.5 px-2.5 text-[0.7rem] font-semibold tracking-[0.025em] text-muted-foreground">
          {t("recent")}
        </p>
        {recentThreads.map((thread) => (
          <a
            className="flex min-h-9 items-center gap-2.5 overflow-hidden rounded-md px-2.5 text-[0.72rem] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            href="#thread"
            key={thread}
          >
            <span className="size-1.5 shrink-0 rounded-full bg-input" />
            {thread}
          </a>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
        <a aria-label={t("team")} className={navigationClassName({ current: false })} href="#team">
          <UsersThree aria-hidden="true" />
          <span className="max-[1180px]:hidden">{t("team")}</span>
        </a>
        <a
          aria-label={t("settings")}
          className={navigationClassName({ current: false })}
          href="#settings"
        >
          <Gear aria-hidden="true" />
          <span className="max-[1180px]:hidden">{t("settings")}</span>
        </a>
        <div className="mt-2 flex items-center gap-2.5 border-t border-border px-1 py-3 max-[1180px]:justify-center">
          <Avatar className="max-[1180px]:hidden" name="Alex Morgan" size="small" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 max-[1180px]:hidden">
            <strong className="truncate text-[0.72rem]">Alex Morgan</strong>
            <small className="text-[0.7rem] font-medium text-muted-foreground">{t("admin")}</small>
          </span>
          <Bell aria-label={t("notifications")} className="size-4 text-muted-foreground" />
        </div>
      </div>
    </aside>
  );
}
