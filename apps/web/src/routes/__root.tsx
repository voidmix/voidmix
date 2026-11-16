import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import { AppShell } from "@voidmix/ui/components/app-shell"
import appCss from "@voidmix/ui/globals.css?url"
import { themeScript } from "@voidmix/ui/lib/theme"

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
        title: "Voidmix",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <AppShell brandHref="/">
      <div className="space-y-2 text-center">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">未找到页面</h1>
        <p className="text-sm text-muted-foreground">
          <a className="underline underline-offset-4" href="/">
            返回首页
          </a>
        </p>
      </div>
    </AppShell>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // Dark is the server default; the inline script switches to a stored light choice before
    // paint, which changes this class ahead of hydration.
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        <div className="isolate">{children}</div>
        <Scripts />
      </body>
    </html>
  )
}
