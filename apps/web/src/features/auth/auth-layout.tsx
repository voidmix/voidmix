import { Outlet } from "@tanstack/react-router";

import { ThemeSwitcher } from "../../components/theme-switcher";

export function AuthLayout() {
  return (
    <main className="relative flex min-h-svh items-center justify-center bg-background px-4 py-16 text-foreground sm:px-6">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeSwitcher />
      </div>
      <Outlet />
    </main>
  );
}
