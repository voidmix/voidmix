import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { initClientLogger } from "@voidmix/logger/client";
import "@voidmix/ui/styles.css";
import { env } from "../env.js";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
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

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClientLogger />
        {children}

        <Scripts />
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
