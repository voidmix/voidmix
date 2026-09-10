import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import styleUrl from '@voidmix/ui/styles.css?url'
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: 'Voidmix' },
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [{ rel: 'stylesheet', href: styleUrl }],
  }),
  component: () => (
    <html lang="zh-CN">
      <head>
        <HeadContent />
      </head>
      <body>
        <a className="skip" href="#main">
          跳转到主要内容
        </a>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
  notFoundComponent: () => (
    <main className="shell">
      <h1>页面不存在</h1>
      <a href="/">返回 Voidmix</a>
    </main>
  ),
})
