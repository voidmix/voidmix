import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Button } from "@voidmix/ui/components/button"
import { Icon, type IconName } from "@voidmix/ui/components/icon"
import { Kbd } from "@voidmix/ui/components/kbd"
import { Logo } from "@voidmix/ui/components/logo"
import { RiskBadge, type RiskLevel } from "@voidmix/ui/components/risk-badge"
import { StatusPill, type AgentStatus } from "@voidmix/ui/components/status-pill"
import { ThemeToggle } from "@voidmix/ui/components/theme-toggle"
import { cn } from "@voidmix/ui/lib/utils"

export const Route = createFileRoute("/workbench")({
  head: () => ({ meta: [{ title: "收件箱 · Voidmix" }] }),
  component: Workbench,
})

// Static sample data: this screen demonstrates the visual direction and calls no backend.
type DiffLine = { kind: "context" | "added" | "removed"; text: string }
type Detail =
  | { kind: "command"; command: string; cwd: string }
  | {
      kind: "file"
      directory: string
      file: string
      added: number
      removed: number
      diff: DiffLine[]
    }
  | { kind: "network"; method: string; host: string; path: string; purpose: string }

interface ApprovalRequest {
  id: number
  action: string
  icon: IconName
  risk: RiskLevel
  detail: Detail
  impact: string
  reason: string
  agent: string
  node: string
  nodeIcon: IconName
  age: string
  time: string
}

const requests: ApprovalRequest[] = [
  {
    id: 1,
    action: "执行命令",
    icon: "terminal",
    risk: "high",
    detail: { kind: "command", command: "bun run db:migrate", cwd: "~/Git/voidmix" },
    impact: "会修改数据库结构，执行后无法自动回滚。",
    reason: "新增了审批记录表，需要先应用迁移才能继续验证接口。",
    agent: "Coder",
    node: "MacBook Pro",
    nodeIcon: "laptop",
    age: "2 分钟前",
    time: "今天 14:32",
  },
  {
    id: 2,
    action: "修改文件",
    icon: "file",
    risk: "medium",
    detail: {
      kind: "file",
      directory: "apps/api/src/",
      file: "config.ts",
      added: 12,
      removed: 3,
      diff: [
        { kind: "context", text: "export function loadApiConfig(env: Environment) {" },
        { kind: "removed", text: "  const redisUrl = process.env.REDIS_URL" },
        { kind: "added", text: "  const redisUrl = env.REDIS_URL?.trim() || undefined" },
        { kind: "added", text: "  const approvalTimeout = seconds(env.APPROVAL_TIMEOUT, 300)" },
        { kind: "context", text: "  return {" },
      ],
    },
    impact: "改动服务端配置加载，只影响工作区内的文件。",
    reason: "把配置读取改成不依赖进程环境的纯函数，方便测试。",
    agent: "Coder",
    node: "MacBook Pro",
    nodeIcon: "laptop",
    age: "8 分钟前",
    time: "今天 14:26",
  },
  {
    id: 3,
    action: "访问网络",
    icon: "globe",
    risk: "low",
    detail: {
      kind: "network",
      method: "GET",
      host: "api.github.com",
      path: "/repos/voidmix/voidmix",
      purpose: "读取仓库的公开信息，不发送请求体。",
    },
    impact: "只读请求，不携带任何凭据。",
    reason: "需要仓库的默认分支和最近更新时间来完成对比。",
    agent: "Researcher",
    node: "VPS 新加坡",
    nodeIcon: "server",
    age: "11 分钟前",
    time: "今天 14:23",
  },
]

interface Agent {
  name: string
  role: string
  status: AgentStatus
  task: string
  /** What the agent is doing right now; shown under the task. */
  step: string
  model: string
  cost: string
  /** Elapsed seconds at page load; live agents keep counting. */
  seconds: number
  steps: [number, number]
  tint: string
}

const agents: Agent[] = [
  {
    name: "Coder",
    role: "开发代理",
    status: "waiting",
    task: "把配置加载改成纯函数，并补上迁移。",
    step: "已暂停，等待你确认 2 个操作",
    model: "Sonnet 5.5",
    cost: "$0.42",
    seconds: 372,
    steps: [4, 6],
    tint: "bg-chart-4/15 text-chart-4",
  },
  {
    name: "Researcher",
    role: "研究代理",
    status: "running",
    task: "对比两个开源项目的审批机制。",
    step: "正在阅读 docs/approvals.md",
    model: "Opus 5.5",
    cost: "$0.18",
    seconds: 160,
    steps: [2, 5],
    tint: "bg-chart-1/15 text-chart-1",
  },
  {
    name: "Reviewer",
    role: "审查代理",
    status: "done",
    task: "审查界面调整的改动，没有发现问题。",
    step: "已交付审查结论",
    model: "Haiku 5.5",
    cost: "$0.03",
    seconds: 48,
    steps: [3, 3],
    tint: "bg-chart-2/15 text-chart-2",
  },
]

const navigation: { label: string; icon: IconName; href: string }[] = [
  { label: "收件箱", icon: "inbox", href: "#inbox" },
  { label: "会话", icon: "message", href: "#agents" },
  { label: "节点", icon: "computer", href: "#nodes" },
  { label: "审批策略", icon: "shield", href: "#approval-policy" },
]

const nodes: { name: string; icon: IconName; online: boolean; note: string }[] = [
  { name: "MacBook Pro", icon: "laptop", online: true, note: "2 个代理" },
  { name: "VPS 新加坡", icon: "server", online: true, note: "1 个代理" },
  { name: "工作站", icon: "cpu", online: false, note: "离线" },
]

type Decision = "allowed" | "always" | "denied"
type Filter = "pending" | "processed" | "all"

const decisionLabel: Record<Decision, string> = {
  allowed: "已允许",
  always: "已设为始终允许",
  denied: "已拒绝",
}

interface LogEntry {
  key: string
  /** Set for decisions made in this session, which can be undone. */
  requestId?: number
  decision: Decision
  action: string
  agent: string
  when: string
}

const earlierLog: LogEntry[] = [
  {
    key: "earlier-1",
    decision: "allowed",
    action: "读取文件",
    agent: "Reviewer",
    when: "14 分钟前",
  },
  { key: "earlier-2", decision: "denied", action: "推送分支", agent: "Coder", when: "21 分钟前" },
]

/** Search matches what a person sees on the card: action, agent, node, and the detail text. */
function searchText(request: ApprovalRequest) {
  const detail =
    request.detail.kind === "command"
      ? request.detail.command
      : request.detail.kind === "file"
        ? `${request.detail.directory}${request.detail.file}`
        : `${request.detail.method} ${request.detail.host}${request.detail.path}`
  return `${request.action} ${request.agent} ${request.node} ${detail}`.toLowerCase()
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return minutes ? `${minutes} 分 ${seconds % 60} 秒` : `${seconds} 秒`
}

function Workbench() {
  const [decisions, setDecisions] = useState<Record<number, Decision>>({})
  const [log, setLog] = useState<LogEntry[]>(earlierLog)
  const [filter, setFilter] = useState<Filter>("pending")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(requests[0]!.id)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [notice, setNotice] = useState("")
  const [elapsed, setElapsed] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const pending = requests.filter((request) => !decisions[request.id])
  const processedCount = 12 + Object.keys(decisions).length
  const needle = query.trim().toLowerCase()
  const visible = requests.filter((request) => {
    const decided = !!decisions[request.id]
    const inTab = filter === "all" || (filter === "pending" ? !decided : decided)
    return inTab && (!needle || searchText(request).includes(needle))
  })
  const actionable = visible.filter((request) => !decisions[request.id])
  const selected = actionable.find((request) => request.id === selectedId) ?? actionable[0]

  function decide(request: ApprovalRequest, decision: Decision) {
    setDecisions((previous) => ({ ...previous, [request.id]: decision }))
    setLog((previous) => [
      {
        key: `session-${request.id}`,
        requestId: request.id,
        decision,
        action: request.action,
        agent: request.agent,
        when: "刚刚",
      },
      ...previous.filter((entry) => entry.requestId !== request.id),
    ])
    setNotice(`${request.action}：${decisionLabel[decision]}。`)
    // Keep the keyboard flow moving: select the next request that still needs a decision.
    const rest = actionable.filter((candidate) => candidate.id !== request.id)
    setSelectedId(rest[0]?.id ?? null)
  }

  function undo(requestId: number) {
    const request = requests.find((candidate) => candidate.id === requestId)
    setDecisions((previous) => {
      const next = { ...previous }
      delete next[requestId]
      return next
    })
    setLog((previous) => previous.filter((entry) => entry.requestId !== requestId))
    setSelectedId(requestId)
    if (request) setNotice(`已撤销对${request.action}的决定。`)
  }

  // Live agents keep counting so the screen reads as running, not as a still.
  useEffect(() => {
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Page-level shortcuts. They never fire while typing, and Escape leaves the search field.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (typing) {
        if (event.key === "Escape") searchRef.current?.blur()
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const index = selected ? actionable.indexOf(selected) : -1
      const key = event.key.toLowerCase()
      if (key === "j" || event.key === "ArrowDown") {
        const next = actionable[Math.min(index + 1, actionable.length - 1)]
        if (next) setSelectedId(next.id)
      } else if (key === "k" || event.key === "ArrowUp") {
        const previous = actionable[Math.max(index - 1, 0)]
        if (previous) setSelectedId(previous.id)
      } else if (!selected) {
        return
      } else if (key === "a") {
        decide(selected, "allowed")
      } else if (key === "d") {
        decide(selected, "denied")
      } else if (key === "e") {
        setExpanded((previous) => ({ ...previous, [selected.id]: !previous[selected.id] }))
      } else {
        return
      }
      event.preventDefault()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  return (
    <div className="app-backdrop min-h-svh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <a
        href="#inbox"
        className="sr-only z-20 rounded-md bg-card px-3 py-2 shadow-popover focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        跳到待审批
      </a>

      <aside className="flex min-w-0 flex-col gap-4 border-b bg-sidebar p-3 lg:sticky lg:top-0 lg:h-svh lg:border-r lg:border-b-0">
        <a
          href="/"
          className="flex h-8 w-fit items-center gap-2 rounded-md px-1.5 text-[0.9375rem] font-semibold tracking-tight outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Logo className="size-5" />
          Voidmix
        </a>

        <label className="flex h-8 items-center gap-2 rounded-md bg-card px-2 text-muted-foreground shadow-surface focus-within:text-foreground pointer-coarse:h-10">
          <Icon name="search" className="size-3.5" />
          <span className="sr-only">搜索请求</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索请求…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-base [&::-webkit-search-cancel-button]:hidden"
          />
          <span aria-hidden="true" className="flex gap-0.5 pointer-coarse:hidden">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </label>

        <nav
          aria-label="工作空间"
          className="grid grid-cols-2 gap-0.5 sm:grid-cols-4 lg:grid-cols-1"
        >
          {navigation.map((item, index) => (
            <a
              key={item.label}
              href={item.href}
              aria-current={index === 0 ? "page" : undefined}
              className={cn(
                "flex h-7 items-center gap-2 rounded-md px-2 text-sm outline-none transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring pointer-coarse:h-10",
                index === 0 ? "bg-sidebar-accent font-medium" : "text-muted-foreground",
              )}
            >
              <Icon name={item.icon} className="size-4" />
              {item.label}
              {index === 0 && pending.length > 0 && (
                <span className="ml-auto min-w-4 rounded-sm bg-primary px-1 text-center font-mono text-[0.6875rem] leading-4 font-medium text-primary-foreground tabular-nums">
                  {pending.length}
                </span>
              )}
            </a>
          ))}
        </nav>

        <section id="nodes" aria-labelledby="nodes-heading" className="scroll-mt-4">
          <div className="flex items-center justify-between px-2 pb-1.5">
            <h2 id="nodes-heading" className="text-xs font-medium text-muted-foreground">
              节点
            </h2>
            <span className="font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
              {nodes.filter((node) => node.online).length}/{nodes.length}
            </span>
          </div>
          <ul className="grid gap-0.5 sm:grid-cols-3 lg:grid-cols-1">
            {nodes.map((node) => (
              <li
                key={node.name}
                className={cn(
                  "flex h-7 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-sidebar-accent",
                  !node.online && "text-muted-foreground",
                )}
              >
                <span className="relative flex">
                  <Icon name={node.icon} className="size-4 text-muted-foreground" />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full ring-2 ring-sidebar",
                      node.online ? "bg-status-done-foreground" : "bg-muted-foreground",
                    )}
                  />
                </span>
                <span className="truncate">{node.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{node.note}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-auto flex items-center gap-2 border-t pt-3">
          <span
            aria-hidden="true"
            className="flex size-6 items-center justify-center rounded-full bg-chart-5/15 text-[0.6875rem] font-semibold text-chart-5"
          >
            Y
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">个人工作空间</span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex h-12 items-center justify-between gap-4 border-b px-4 text-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <span>工作台</span>
            <Icon name="arrowRight" className="size-3" />
            <span className="truncate font-medium text-foreground">收件箱</span>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-sm bg-status-done px-1.5 py-0.5 text-xs font-medium text-status-done-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />2 个节点在线
          </span>
        </header>

        <div className="mx-auto grid max-w-[1200px] items-start gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main id="inbox" className="min-w-0 scroll-mt-4" aria-labelledby="inbox-heading">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <h1 id="inbox-heading" className="text-2xl font-semibold tracking-[-0.5px]">
                  待审批
                </h1>
                <p className="mt-1 text-muted-foreground">
                  {pending.length} 个请求在等你确认，来自{" "}
                  {new Set(pending.map((request) => request.node)).size} 个节点。
                </p>
              </div>
              <dl className="flex gap-5 text-xs">
                <Stat label="今日已处理" value={String(processedCount)} />
                <Stat label="今日花费" value="$0.63" />
              </dl>
            </div>

            <div className="mt-4 mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="sr-only">审批筛选</legend>
                <div className="inline-flex gap-0.5 rounded-md bg-secondary p-0.5">
                  {(
                    [
                      { value: "pending", label: "待处理", count: pending.length },
                      { value: "processed", label: "已处理", count: processedCount },
                      { value: "all", label: "全部" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      aria-pressed={filter === tab.value}
                      onClick={() => setFilter(tab.value)}
                      className={cn(
                        "flex h-6 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring pointer-coarse:h-9",
                        filter === tab.value
                          ? "bg-card text-foreground shadow-surface"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tab.label}
                      {"count" in tab && (
                        <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </fieldset>
              {/* Shortcut legend: hidden on touch devices, where there is no keyboard to use it. */}
              <p className="flex items-center gap-3 text-xs text-muted-foreground pointer-coarse:hidden">
                <span className="flex items-center gap-1">
                  <Kbd>J</Kbd>
                  <Kbd>K</Kbd>
                  切换
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>A</Kbd>
                  允许
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>D</Kbd>
                  拒绝
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>E</Kbd>
                  展开
                </span>
              </p>
            </div>

            <div className="grid gap-3">
              {visible.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  decision={decisions[request.id]}
                  selected={selected?.id === request.id}
                  expanded={!!expanded[request.id]}
                  onSelect={() => setSelectedId(request.id)}
                  onToggle={() =>
                    setExpanded((previous) => ({
                      ...previous,
                      [request.id]: !previous[request.id],
                    }))
                  }
                  onDecide={(decision) => decide(request, decision)}
                  onUndo={() => undo(request.id)}
                />
              ))}
              {visible.length === 0 && (
                <div className="surface px-4 py-10 text-center">
                  <span className="mx-auto mb-3 flex size-8 items-center justify-center rounded-md bg-status-done text-status-done-foreground">
                    <Icon name={needle ? "search" : "check"} className="size-4" />
                  </span>
                  <h2 className="font-medium">
                    {needle
                      ? "没有匹配的请求"
                      : filter === "pending"
                        ? "全部处理好了"
                        : "还没有新的处理记录"}
                  </h2>
                  <p className="mt-1 text-muted-foreground">
                    {needle
                      ? "换个关键词，或清空搜索再看看。"
                      : filter === "pending"
                        ? "代理可以继续工作了，有新请求时会出现在这里。"
                        : "本次处理的请求会显示在这里。"}
                  </p>
                </div>
              )}
            </div>

            <output className="sr-only">{notice}</output>
            <p
              id="approval-policy"
              className="mt-4 flex scroll-mt-4 items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Icon name="shield" className="size-3.5" />
              命令执行、文件修改和网络访问需要你确认后才会继续，每次决定都会留下记录。
            </p>
          </main>

          <aside className="grid min-w-0 gap-6">
            <section id="agents" aria-labelledby="agents-heading" className="scroll-mt-4">
              <div className="flex h-8 items-center justify-between">
                <h2 id="agents-heading" className="font-medium">
                  运行中
                </h2>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {agents.filter((agent) => agent.status !== "done").length}/{agents.length}
                </span>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.name}
                    agent={agent}
                    elapsed={elapsed}
                    pendingCount={pending.filter((request) => request.agent === agent.name).length}
                  />
                ))}
              </div>
            </section>

            <section aria-labelledby="log-heading">
              <div className="flex h-8 items-center justify-between">
                <h2 id="log-heading" className="font-medium">
                  最近记录
                </h2>
                <span className="text-xs text-muted-foreground">今天</span>
              </div>
              <ol className="surface mt-2 divide-y">
                {log.map((entry) => (
                  <li key={entry.key} className="flex items-center gap-2.5 px-3 py-2.5">
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full",
                        entry.decision === "denied"
                          ? "bg-status-failed text-status-failed-foreground"
                          : "bg-status-done text-status-done-foreground",
                      )}
                    >
                      <Icon
                        name={entry.decision === "denied" ? "close" : "check"}
                        className="size-3"
                      />
                    </span>
                    <p className="min-w-0 flex-1">
                      <span className="font-medium">{decisionLabel[entry.decision]}</span>{" "}
                      {entry.action}
                      <span className="block text-xs text-muted-foreground">
                        {entry.agent} · {entry.when}
                      </span>
                    </p>
                    {entry.requestId !== undefined && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`撤销对${entry.action}的决定`}
                        onClick={() => undo(entry.requestId!)}
                      >
                        <Icon name="undo" className="size-3.5" />
                        撤销
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-medium tabular-nums">{value}</dd>
    </div>
  )
}

/** A quiet inline chip pairing a small icon with a label, used for agent and node context. */
function MetaChip({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon name={icon} className="size-3.5" />
      {children}
    </span>
  )
}

/** The icon tile takes the risk tint, so severity reads before the badge text does. */
const riskTile: Record<RiskLevel, string> = {
  low: "bg-secondary text-muted-foreground",
  medium: "bg-risk-medium text-risk-medium-foreground",
  high: "bg-risk-high text-risk-high-foreground",
}

function RequestCard({
  request,
  decision,
  selected,
  expanded,
  onSelect,
  onToggle,
  onDecide,
  onUndo,
}: {
  request: ApprovalRequest
  decision: Decision | undefined
  selected: boolean
  expanded: boolean
  onSelect: () => void
  onToggle: () => void
  onDecide: (decision: Decision) => void
  onUndo: () => void
}) {
  const [copied, setCopied] = useState(false)
  const { detail } = request
  const copyable = detail.kind === "command" ? detail.command : undefined
  const panelId = `request-${request.id}-details`

  async function copy() {
    if (!copyable) return
    try {
      await navigator.clipboard.writeText(copyable)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied; the command stays selectable as text.
    }
  }

  return (
    <article
      aria-labelledby={`request-${request.id}`}
      onPointerDown={decision ? undefined : onSelect}
      className={cn(
        "surface overflow-hidden transition-[box-shadow,opacity]",
        decision && "opacity-70",
        // The selected request is the target of the page shortcuts.
        selected && "outline-2 outline-offset-2 outline-ring",
      )}
    >
      <div className="flex items-center gap-2.5 px-4 pt-3.5">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            riskTile[request.risk],
          )}
        >
          <Icon name={request.icon} className="size-4" />
        </span>
        <h2 id={`request-${request.id}`} className="font-medium">
          {request.action}
        </h2>
        <RiskBadge risk={request.risk} />
        <time
          title={request.time}
          className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
        >
          <Icon name="clock" className="size-3.5" />
          {request.age}
        </time>
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 rounded-md bg-muted py-2 pr-1.5 pl-3 font-mono text-[0.8125rem]">
          <p className="min-w-0 flex-1 break-all">
            {detail.kind === "command" && (
              <>
                <span aria-hidden="true" className="mr-2 text-muted-foreground select-none">
                  $
                </span>
                {detail.command}
              </>
            )}
            {detail.kind === "file" && (
              <>
                <span className="text-muted-foreground">{detail.directory}</span>
                {detail.file}
              </>
            )}
            {detail.kind === "network" && (
              <>
                <span className="mr-2 rounded-sm bg-status-running px-1 py-px text-[0.6875rem] font-medium text-status-running-foreground">
                  {detail.method}
                </span>
                {detail.host}
                <span className="text-muted-foreground">{detail.path}</span>
              </>
            )}
          </p>
          {detail.kind === "file" && <DiffStat added={detail.added} removed={detail.removed} />}
          {copyable && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={copied ? "已复制" : "复制命令"}
              onClick={copy}
            >
              <Icon name={copied ? "check" : "copy"} className="size-3.5" />
            </Button>
          )}
        </div>

        <div className="mt-2 flex items-start gap-2">
          <p className="min-w-0 flex-1 text-muted-foreground">
            {request.risk === "high" && (
              <Icon
                name="alert"
                className="mr-1 inline size-3.5 align-[-2px] text-risk-high-foreground"
              />
            )}
            {request.impact}
          </p>
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={onToggle}
            className="-mr-1.5 shrink-0 text-muted-foreground"
          >
            {expanded ? "收起" : "详情"}
            <Icon
              name="arrowDown"
              className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
            />
          </Button>
        </div>

        {expanded && (
          <div id={panelId} className="mt-2 grid gap-2">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">原因</dt>
              <dd>{request.reason}</dd>
              {detail.kind === "command" && (
                <>
                  <dt className="text-muted-foreground">工作目录</dt>
                  <dd className="flex items-center gap-1 font-mono">
                    <Icon name="folder" className="size-3.5 text-muted-foreground" />
                    {detail.cwd}
                  </dd>
                </>
              )}
              {detail.kind === "network" && (
                <>
                  <dt className="text-muted-foreground">用途</dt>
                  <dd>{detail.purpose}</dd>
                </>
              )}
            </dl>
            {detail.kind === "file" && (
              <pre className="overflow-x-auto rounded-md border font-mono text-xs leading-5">
                {detail.diff.map((line, index) => (
                  <span
                    key={index}
                    className={cn(
                      "block px-3",
                      line.kind === "added" && "bg-status-done text-status-done-foreground",
                      line.kind === "removed" && "bg-status-failed text-status-failed-foreground",
                      line.kind === "context" && "text-muted-foreground",
                    )}
                  >
                    <span aria-hidden="true" className="mr-2 inline-block w-2 select-none">
                      {line.kind === "added" ? "+" : line.kind === "removed" ? "−" : ""}
                    </span>
                    {line.text}
                  </span>
                ))}
              </pre>
            )}
          </div>
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-muted/60 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <MetaChip icon="message">{request.agent}</MetaChip>
          <MetaChip icon={request.nodeIcon}>{request.node}</MetaChip>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {decision ? (
            <>
              <span
                className={cn(
                  "flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium",
                  decision === "denied"
                    ? "bg-status-failed text-status-failed-foreground"
                    : "bg-status-done text-status-done-foreground",
                )}
              >
                <Icon name={decision === "denied" ? "close" : "check"} className="size-3.5" />
                {decisionLabel[decision]}
              </span>
              <Button variant="ghost" aria-label={`撤销对${request.action}的决定`} onClick={onUndo}>
                <Icon name="undo" className="size-3.5" />
                撤销
              </Button>
            </>
          ) : (
            <>
              {/* High-risk actions are confirmed every time, so no standing grant is offered. */}
              {request.risk !== "high" && (
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  aria-label={`始终允许${request.action}`}
                  onClick={() => onDecide("always")}
                >
                  始终允许
                </Button>
              )}
              <Button
                variant="secondary"
                aria-label={`拒绝${request.action}`}
                onClick={() => onDecide("denied")}
              >
                拒绝
                {selected && <Kbd className="pointer-coarse:hidden">D</Kbd>}
              </Button>
              <Button aria-label={`允许${request.action}`} onClick={() => onDecide("allowed")}>
                允许
                {selected && (
                  <Kbd className="bg-white/15 text-(--button-text) shadow-none pointer-coarse:hidden">
                    A
                  </Kbd>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

/** Line counts with a five-block bar split in the same proportion. */
function DiffStat({ added, removed }: { added: number; removed: number }) {
  const addedBlocks = Math.round((added / (added + removed)) * 5)
  return (
    <span className="flex shrink-0 items-center gap-1.5 pr-1.5 text-xs tabular-nums">
      <span className="text-status-done-foreground">+{added}</span>
      <span className="text-status-failed-foreground">−{removed}</span>
      <span aria-hidden="true" className="flex gap-px">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={cn(
              "size-1.5 rounded-[1px]",
              index < addedBlocks ? "bg-status-done-foreground" : "bg-status-failed-foreground",
            )}
          />
        ))}
      </span>
    </span>
  )
}

function AgentCard({
  agent,
  elapsed,
  pendingCount,
}: {
  agent: Agent
  elapsed: number
  pendingCount: number
}) {
  const [done, total] = agent.steps
  // Only a running agent accrues time; one waiting on approval is paused.
  const seconds = agent.seconds + (agent.status === "running" ? elapsed : 0)
  return (
    <article aria-labelledby={`agent-${agent.name}`} className="surface p-4">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
            agent.tint,
          )}
        >
          {agent.name[0]}
        </span>
        <div className="min-w-0">
          <h3 id={`agent-${agent.name}`} className="leading-4 font-medium">
            {agent.name}
          </h3>
          <p className="text-xs text-muted-foreground">{agent.role}</p>
        </div>
        <StatusPill status={agent.status} className="ml-auto" />
      </div>

      <p className="mt-3">{agent.task}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {agent.status === "waiting"
          ? pendingCount > 0
            ? `已暂停，等待你确认 ${pendingCount} 个操作`
            : "已收到你的决定，准备继续"
          : agent.step}
      </p>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <progress
          aria-label={`${agent.name} 进度`}
          max={total}
          value={done}
          className={cn(
            "h-1 flex-1 appearance-none overflow-hidden rounded-full bg-secondary [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full",
            agent.status === "done"
              ? "[&::-moz-progress-bar]:bg-status-done-foreground [&::-webkit-progress-value]:bg-status-done-foreground"
              : "[&::-moz-progress-bar]:bg-foreground/70 [&::-webkit-progress-value]:bg-foreground/70",
          )}
        />
        <span className="font-mono tabular-nums">
          {done}/{total} 步
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 font-mono text-xs text-muted-foreground tabular-nums">
        <MetaChip icon="cpu">{agent.model}</MetaChip>
        <MetaChip icon="coins">{agent.cost}</MetaChip>
        <MetaChip icon="timer">{formatDuration(seconds)}</MetaChip>
      </div>

      {pendingCount > 0 && (
        <a
          href="#inbox"
          className="mt-3 flex h-7 items-center justify-between rounded-md bg-status-waiting px-2 text-xs font-medium text-status-waiting-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          等你批准 {pendingCount} 个请求
          <Icon name="arrowRight" className="size-3.5" />
        </a>
      )}
    </article>
  )
}
