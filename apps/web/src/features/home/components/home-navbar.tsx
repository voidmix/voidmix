import { Link } from "@tanstack/react-router";
import { useTranslations } from "@voidmix/i18n/client";
import { Logo } from "@voidmix/ui/logo";

import { LanguageSwitcher } from "../../../components/language-switcher";
import { ThemeSwitcher } from "../../../components/theme-switcher";
import { AuthActions } from "./auth-actions";

export function HomeNavbar() {
  const t = useTranslations("home");

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-card">
      <div className="mx-auto flex min-h-16 w-full max-w-4xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="Voidmix home"
            className="inline-flex h-9 shrink-0 items-center rounded-lg px-1.5 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-[380px]:[&_[data-slot=logo]>span]:sr-only"
            to="/"
          >
            <Logo className="text-sm" />
          </Link>

          <div className="hidden min-w-0 items-center gap-2.5 border-l border-border pl-3 sm:flex">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary text-[0.72rem] font-extrabold text-primary-foreground">
              N
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[0.66rem] leading-tight text-muted-foreground">
                {t("workspace")}
              </span>
              <strong className="truncate text-[0.76rem] leading-tight">
                {t("northstarWorkspace")}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AuthActions />
          <div className="hidden h-5 w-px bg-border sm:block" />
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
