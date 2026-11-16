import { ClientOnly, HeadContent, Link, Scripts, createRootRoute } from "@tanstack/react-router"

import { AppShell } from "@voidmix/ui/components/app-shell"
import appCss from "@voidmix/ui/globals.css?url"
import { themeScript } from "@voidmix/ui/lib/theme"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Voidmix" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: () => (
    <AppShell>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">未找到页面</h1>
        <Link className="text-sm text-muted-foreground underline underline-offset-4" to="/">
          返回首页
        </Link>
      </div>
    </AppShell>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // Dark is the prerendered default; the inline script applies a stored light choice before paint.
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        <div className="isolate">
          {/* Mount the route tree after shell hydration; native bridge detection is client-only. */}
          <ClientOnly>{children}</ClientOnly>
        </div>
        <Scripts />
      </body>
    </html>
  )
}
