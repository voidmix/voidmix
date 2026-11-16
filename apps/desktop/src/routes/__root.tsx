import { ClientOnly, HeadContent, Link, Scripts, createRootRoute } from "@tanstack/react-router"

import appCss from "@voidmix/ui/globals.css?url"

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
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">未找到页面</h1>
      <Link className="underline underline-offset-4" to="/">
        返回首页
      </Link>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
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
