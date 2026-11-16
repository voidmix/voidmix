import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Badge } from "@voidmix/ui/components/badge"
import { Button } from "@voidmix/ui/components/button"
import { Card, CardContent } from "@voidmix/ui/components/card"
import { Icon, type IconName } from "@voidmix/ui/components/icon"
import { Logo } from "@voidmix/ui/components/logo"
import { RiskBadge, type RiskLevel } from "@voidmix/ui/components/risk-badge"
import { StatusPill, type AgentStatus } from "@voidmix/ui/components/status-pill"
import { ThemeToggle } from "@voidmix/ui/components/theme-toggle"
import { cn } from "@voidmix/ui/lib/utils"

export const Route = createFileRoute("/workbench")({
  head: () => ({ meta: [{ title: "收件箱 · Voidmix" }] }),
  component: Workbench,
})

const requests: {
  id: number
  action: string
  icon: IconName
  risk: RiskLevel
  detail: string
  meta: string
  node: string
}[] = [
  {
    id: 1,
    action: "执行命令",
    icon: "terminal",
    risk: "high",
    detail: "bun run db:migrate",
    meta: "Coder · MacBook Pro · 2 分钟前",
    node: "MacBook Pro",
  },
  {
    id: 2,
    action: "修改文件",
    icon: "file",
    risk: "medium",
    detail: "apps/api/src/config.ts +12 −3",
    meta: "Coder · MacBook Pro · 8 分钟前",
    node: "MacBook Pro",
  },
  {
    id: 3,
    action: "访问网络",
    icon: "globe",
    risk: "low",
    detail: "GET api.github.com/repos/voidmix/voidmix",
    meta: "Researcher · VPS 新加坡 · 11 分钟前",
    node: "VPS 新加坡",
  },
]

const agents: { name: string; role: string; status: AgentStatus; task: string; usage: string }[] = [
  {
    name: "Coder",
    role: "开发代理",
    status: "waiting",
    task: "把配置加载改成纯函数，并补上迁移。",
    usage: "Sonnet 5.5 · $0.42 · 6 分 12 秒",
  },
  {
    name: "Researcher",
    role: "研究代理",
    status: "running",
    task: "对比两个开源项目的审批机制。",
    usage: "Opus 5.5 · $0.18 · 2 分 40 秒",
  },
  {
    name: "Reviewer",
    role: "审查代理",
    status: "done",
    task: "审查界面调整的改动，没有发现问题。",
    usage: "Haiku 5.5 · $0.03 · 48 秒",
  },
]

const navigation: { label: string; icon: IconName; href: string }[] = [
  { label: "收件箱", icon: "inbox", href: "#inbox" },
  { label: "会话", icon: "message", href: "#agents" },
  { label: "节点", icon: "computer", href: "#nodes" },
  { label: "审批策略", icon: "shield", href: "#approval-policy" },
]

type Decision = "allowed" | "denied"
type Filter = "pending" | "processed" | "all"

function Workbench() {
  const [decisions, setDecisions] = useState<Record<number, Decision>>({})
  const [filter, setFilter] = useState<Filter>("pending")
  const [notice, setNotice] = useState("")
  const pending = requests.filter((request) => !decisions[request.id])
  const processedCount = 12 + Object.keys(decisions).length
  const visible = requests.filter((request) =>
    filter === "all"
      ? true
      : filter === "pending"
        ? !decisions[request.id]
        : !!decisions[request.id],
  )

  function decide(id: number, decision: Decision) {
    setDecisions((previous) => ({ ...previous, [id]: decision }))
    setNotice(
      `${requests.find((request) => request.id === id)?.action}请求已${decision === "allowed" ? "允许" : "拒绝"}。`,
    )
  }

  return (
    <div className="app-backdrop min-h-svh lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
      <a
        href="#inbox"
        className="sr-only z-20 rounded-full bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        跳到待审批
      </a>
      <aside className="flex min-w-0 flex-col border-b bg-sidebar p-4 lg:sticky lg:top-0 lg:h-svh lg:border-r lg:border-b-0 lg:p-6">
        <a
          href="/"
          className="flex w-fit items-center gap-3 rounded-xl text-xl font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo className="size-9" />
          Voidmix
        </a>
        <p className="mt-8 mb-3 px-3 text-xs font-medium text-muted-foreground">个人工作空间</p>
        <nav aria-label="工作空间" className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
          {navigation.map((item, index) => (
            <a
              key={item.label}
              href={item.href}
              aria-current={index === 0 ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring",
                index === 0
                  ? "bg-sidebar-accent font-medium shadow-surface"
                  : "text-muted-foreground",
              )}
            >
              <Icon name={item.icon} className="size-[18px]" />
              {item.label}
              {index === 0 && (
                <span className="ml-auto rounded-md bg-secondary px-1.5 font-mono text-xs text-secondary-foreground">
                  {pending.length}
                </span>
              )}
            </a>
          ))}
        </nav>
        <section id="nodes" aria-labelledby="nodes-heading" className="mt-9 scroll-mt-6">
          <h2 id="nodes-heading" className="px-3 text-xs font-medium text-muted-foreground">
            节点
          </h2>
          <ul className="mt-3 grid gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { name: "MacBook Pro", online: true },
              { name: "VPS 新加坡", online: true },
              { name: "工作站", online: false },
            ].map((node) => (
              <li
                key={node.name}
                className="flex min-h-10 flex-wrap items-center gap-2 px-3 text-xs"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 rounded-full",
                    node.online ? "bg-status-done-foreground" : "bg-muted-foreground",
                  )}
                />
                <span className="font-medium">{node.name}</span>
                <span className="ml-auto text-muted-foreground">
                  {node.online ? "在线" : "离线"}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="mt-6 flex items-center justify-between border-t pt-4 lg:mt-auto">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-card text-xs font-medium"
            >
              Y
            </span>
            <span className="text-xs text-muted-foreground">你的工作空间</span>
          </div>
          <ThemeToggle />
        </div>
      </aside>

      <div className="min-w-0 px-4 pb-6 sm:px-8 xl:px-10">
        <header className="flex h-20 items-center justify-between gap-4 border-b text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>工作台</span>
            <Icon name="arrowRight" className="size-3" />
            <span className="text-foreground">收件箱</span>
          </div>
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-status-done-foreground" />2
            个节点在线
          </span>
        </header>

        <div className="mx-auto grid max-w-[1360px] items-start gap-10 pt-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
          <main id="inbox" className="min-w-0 scroll-mt-6" aria-labelledby="inbox-heading">
            <div className="mb-8">
              <p className="mb-2 text-xs font-medium tracking-[0.14em] text-muted-foreground">
                让每一步，都在掌握之中
              </p>
              <h1
                id="inbox-heading"
                className="text-[1.875rem] leading-tight font-semibold tracking-tight"
              >
                待审批
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {pending.length} 个请求在等你确认，来自{" "}
                {new Set(pending.map((request) => request.node)).size} 个节点。
              </p>
            </div>

            <div
              aria-label="审批筛选"
              className="mb-4 flex flex-wrap gap-1 rounded-full bg-secondary/70 p-1 sm:w-fit"
            >
              {(
                [
                  { value: "pending", label: "待处理", count: pending.length },
                  { value: "processed", label: "已处理", count: processedCount },
                  { value: "all", label: "全部" },
                ] as const
              ).map((tab) => (
                <Button
                  key={tab.value}
                  variant="ghost"
                  size="sm"
                  aria-pressed={filter === tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={cn(
                    "flex-1 gap-2 px-4 sm:flex-none",
                    filter === tab.value
                      ? "bg-card text-foreground shadow-xs hover:bg-card"
                      : "text-muted-foreground",
                  )}
                >
                  {tab.label}
                  {"count" in tab && <span className="font-mono text-xs">{tab.count}</span>}
                </Button>
              ))}
            </div>

            <div className="space-y-4">
              {visible.map((request) => (
                <Card key={request.id} className="gap-0">
                  <CardContent>
                    <article aria-labelledby={`request-${request.id}`}>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <Icon name={request.icon} />
                        </span>
                        <h2 id={`request-${request.id}`} className="text-base font-medium">
                          {request.action}
                        </h2>
                        <RiskBadge risk={request.risk} className="ml-auto" />
                      </div>
                      <p className="rounded-xl bg-background px-3 py-3 font-mono text-[13px] leading-6 break-all">
                        {request.detail}
                      </p>
                      <p className="mt-4 text-xs leading-6 text-muted-foreground">{request.meta}</p>
                      <div className="mt-4 flex items-center justify-end gap-2">
                        {decisions[request.id] ? (
                          <Badge variant="secondary" className="min-h-10 px-4">
                            <Icon name="check" />
                            {decisions[request.id] === "allowed" ? "已允许" : "已拒绝"}
                          </Badge>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              aria-label={`拒绝${request.action}`}
                              onClick={() => decide(request.id, "denied")}
                            >
                              拒绝
                            </Button>
                            <Button
                              aria-label={`允许${request.action}`}
                              onClick={() => decide(request.id, "allowed")}
                            >
                              允许
                            </Button>
                          </>
                        )}
                      </div>
                    </article>
                  </CardContent>
                </Card>
              ))}
              {visible.length === 0 && (
                <div className="surface px-6 py-6 text-center">
                  <Icon name="check" className="mx-auto mb-4 size-8 text-muted-foreground" />
                  <h2 className="font-medium">
                    {filter === "pending" ? "全部处理好了" : "还没有新的处理记录"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {filter === "pending"
                      ? "代理可以继续工作了，稍后再来看看。"
                      : "本次处理的请求会显示在这里。"}
                  </p>
                </div>
              )}
            </div>

            <output className="sr-only">{notice}</output>
            <div
              id="approval-policy"
              className="mt-6 flex scroll-mt-6 items-start gap-2 text-xs leading-6 text-muted-foreground"
            >
              <Icon name="shield" className="mt-1 size-4" />
              <p>
                需要你确认的操作，才会继续执行。
                <br />
                每一次审批，都会留下记录。
              </p>
            </div>
          </main>

          <aside
            id="agents"
            aria-labelledby="agents-heading"
            className="min-w-0 scroll-mt-6 xl:pt-1"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="agents-heading" className="text-base font-semibold">
                运行中
                <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">02</span>
              </h2>
              <span className="text-xs text-muted-foreground">你的代理团队</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {agents.map((agent) => (
                <Card key={agent.name} className="gap-0">
                  <CardContent>
                    <article aria-labelledby={`agent-${agent.name}`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex size-11 items-center justify-center rounded-2xl font-mono text-lg font-medium",
                            agent.name === "Coder"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground",
                          )}
                        >
                          {agent.name[0]}
                        </span>
                        <div>
                          <h3 id={`agent-${agent.name}`} className="text-sm font-semibold">
                            {agent.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">{agent.role}</p>
                        </div>
                        <StatusPill status={agent.status} className="ml-auto" />
                      </div>
                      <p className="mt-4 text-sm leading-7">{agent.task}</p>
                      <p className="mt-4 border-t pt-4 font-mono text-[11px] leading-6 text-muted-foreground">
                        {agent.usage}
                      </p>
                    </article>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
              安心专注，代理会在需要时找到你。
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
