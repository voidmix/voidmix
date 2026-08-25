import { Link } from "@tanstack/react-router";
import { Logo } from "@voidmix/ui/logo";

import { LanguageSwitcher } from "../../../components/language-switcher";
import { ThemeSwitcher } from "../../../components/theme-switcher";
import { AuthActions } from "./auth-actions";

export function HomeNavbar() {
  return (
    <header className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-card px-2.5 py-2 sm:px-3">
      <Link
        aria-label="Voidmix home"
        className="inline-flex h-9 items-center rounded-lg px-1.5 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-[380px]:[&_[data-slot=logo]>span]:sr-only"
        to="/"
      >
        <Logo className="text-sm" />
      </Link>

      <div className="flex items-center gap-1">
        <AuthActions />
        <LanguageSwitcher />
        <div className="ml-1">
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
