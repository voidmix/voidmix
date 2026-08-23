import {
  HeadContent,
  Scripts,
  createRootRoute,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import { initClientLogger } from "@voidmix/logger/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { Toaster } from "@voidmix/ui/components/ui/toast";
import "@voidmix/ui/styles.css";
import { ThemeProvider, ThemeScript } from "@voidmix/ui/theme";
import { env } from "../env.js";
import {
  CHUNK_RECOVERY_STORAGE_KEY,
  createChunkRecoveryRecord,
  isChunkLoadError,
  shouldRetryChunkLoad,
} from "../lib/chunk-recovery";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  errorComponent: RootErrorPage,
  notFoundComponent: NotFoundPage,
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        title: "Voidmix | Creative work, one live signal",
      },
      {
        name: "description",
        content:
          "Voidmix keeps briefs, feedback, decisions, people, and delivery visible in one live creative workspace.",
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootErrorPage({ error, reset }: ErrorComponentProps) {
  const chunkLoadFailed = isChunkLoadError(error);
  const [isRecovering, setIsRecovering] = useState(chunkLoadFailed);

  useEffect(() => {
    if (!chunkLoadFailed || typeof window === "undefined") {
      return;
    }

    const url = window.location.href;
    let previous: string | null;

    try {
      previous = window.sessionStorage.getItem(CHUNK_RECOVERY_STORAGE_KEY);
    } catch {
      setIsRecovering(false);
      return;
    }

    const attemptedAt = Date.now();
    if (!shouldRetryChunkLoad({ now: attemptedAt, previous, url })) {
      setIsRecovering(false);
      return;
    }

    try {
      window.sessionStorage.setItem(
        CHUNK_RECOVERY_STORAGE_KEY,
        createChunkRecoveryRecord(url, attemptedAt),
      );
    } catch {
      setIsRecovering(false);
      return;
    }

    window.location.reload();
  }, [chunkLoadFailed]);

  if (isRecovering) {
    return (
      <main
        aria-live="polite"
        className="flex min-h-dvh items-center justify-center bg-background px-6 py-16 text-foreground"
      >
        <p className="text-sm text-muted-foreground">Refreshing Voidmix…</p>
      </main>
    );
  }

  const title = chunkLoadFailed ? "This page needs a refresh" : "Something went wrong";
  const description = chunkLoadFailed
    ? "A newer version of this page is available. Reload it to continue."
    : "The page could not finish loading. Try again or return to the home page.";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-16 text-foreground">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Voidmix
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={chunkLoadFailed ? () => window.location.reload() : reset}
            variant="primary"
          >
            {chunkLoadFailed ? "Reload page" : "Try again"}
          </Button>
          <Button nativeButton={false} render={<a href="/" />} variant="outline">
            Return home
          </Button>
        </div>
      </section>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-16 text-foreground">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Voidmix
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The workspace page you requested does not exist.
        </p>
        <a
          className="mt-6 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          href="/"
        >
          Return home
        </a>
      </section>
    </main>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider disableScript defaultTheme="system" disableTransitionOnChange>
          <ClientLogger />
          {children}
          <Toaster />
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  );
}

function ClientLogger() {
  useEffect(() => {
    initClientLogger({
      service: "web",
      pretty: env.VITE_LOG_PRETTY ?? env.NODE_ENV === "development",
      minLevel: env.VITE_LOG_LEVEL ?? (env.NODE_ENV === "development" ? "debug" : "info"),
    });
  }, []);

  return null;
}
