import {
  HeadContent,
  Scripts,
  createRootRoute,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { I18nProvider, createBrowserLocaleStorage, useLocale } from "@voidmix/i18n/client";
import { useEffect, useState, type ReactNode } from "react";

import { initClientLogger } from "@voidmix/logger/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { Toaster } from "@voidmix/ui/components/ui/toast";
import "@voidmix/ui/styles.css";
import { ThemeProvider, ThemeScript, type UserTheme } from "@voidmix/ui/theme";
import { env } from "../env.js";
import { messages } from "../i18n/messages";
import { createRecoveryTranslator, readDocumentLocale } from "../i18n/recovery-messages";
import { getRequestPreferences } from "../lib/request-preferences";
import {
  CHUNK_RECOVERY_STORAGE_KEY,
  createChunkRecoveryRecord,
  isChunkLoadError,
  shouldRetryChunkLoad,
} from "../lib/chunk-recovery";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  loader: () => getRequestPreferences(),
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
        type: "image/png",
        href: "/favicon.png",
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
  // Static messages on purpose — see recovery-messages.ts. Suspending here would
  // require a chunk from the deployment this page exists to report on.
  const t = createRecoveryTranslator(readDocumentLocale());
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
        <p className="text-sm text-muted-foreground">{t("refreshing")}</p>
      </main>
    );
  }

  const title = chunkLoadFailed ? t("pageNeedsRefresh") : t("somethingWentWrong");
  const description = chunkLoadFailed ? t("newerPageAvailable") : t("pageLoadFailed");

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
            {chunkLoadFailed ? t("reload") : t("tryAgain")}
          </Button>
          <Button nativeButton={false} render={<a href="/" />} variant="outline">
            {t("returnHome")}
          </Button>
        </div>
      </section>
    </main>
  );
}

function NotFoundPage() {
  // Static for the same reason as RootErrorPage: recovery copy must not depend
  // on an application catalog chunk that may have failed to load.
  const t = createRecoveryTranslator(readDocumentLocale());
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-16 text-foreground">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Voidmix
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t("pageNotFound")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("pageNotFoundDescription")}
        </p>
        <a
          className="mt-6 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          href="/"
        >
          {t("returnHome")}
        </a>
      </section>
    </main>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const { locale, theme } = Route.useLoaderData();

  return (
    <I18nProvider locale={locale} messages={messages} storage={createBrowserLocaleStorage()}>
      <LocalizedDocument theme={theme}>{children}</LocalizedDocument>
    </I18nProvider>
  );
}

function LocalizedDocument({ children, theme }: { children: ReactNode; theme: UserTheme }) {
  const locale = useLocale();

  return (
    <html dir="ltr" lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          disableScript
          defaultTheme="system"
          initialTheme={theme}
          disableTransitionOnChange
        >
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
