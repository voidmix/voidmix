# Voidmix

Bun workspace 全栈项目，包含 TanStack Start Web、Nitro Node 服务、Hono/oRPC API，以及可切换 Tauri 2 / Electron 的 Desktop PoC。

## 本地启动

需要 Bun 1.4、Node 24.11+ 和 Docker Compose。工具链通过 `bun.lock` 固定；无需全局安装 Vite+。

```sh
bun install --frozen-lockfile
cp .env.example .env
# 将 BETTER_AUTH_SECRET 换成随机值，例如 openssl rand -base64 48
# .env 仅供本地使用，不提交到仓库。
docker compose up -d
bun run db:migrate
bun run dev
```

在第二个终端启动后台任务：

```sh
bun run worker
```

Web：<http://localhost:3000>；邮件收件箱：<http://localhost:8025>；MinIO 控制台：<http://localhost:9001>。首次注册后打开 Mailpit 中的验证邮件再登录。邮件由 worker 发送，API 只入队。MinIO 初始化容器自动建立私有 `voidmix` bucket。

GitHub OAuth 可选：在 `.env` 填写两个 `OAUTH_GITHUB_*` 字段，回调地址为 `http://localhost:3000/api/auth/callback/github`；配置后页面显示 GitHub 登录按钮。

## 结构与边界

```text
apps/web          TanStack Start + Nitro Vite plugin，Node preset
apps/desktop      Vite/React UI + Electron/Tauri 两个可运行 host
packages/domain   纯业务逻辑和存储/仓储接口
packages/contracts Zod DTO、分页、错误和任务协议
packages/rpc      oRPC procedure 与浏览器安全 client
packages/db       Drizzle schema、真实 SQL migration 和 repositories
packages/auth     Better Auth、Drizzle adapter、邮箱/OAuth/设备授权
packages/storage  unstorage S3 driver + AWS SDK 签名、HEAD、复制
packages/jobs     PostgreSQL 持久队列、租约、重试、幂等键
packages/observability evlog 请求事件、request/trace id、脱敏
packages/desktop-bridge 原生边界和共用设备授权流程
packages/ui       shadcn/ui + Tailwind v4，Web/Desktop 共用组件与主题
packages/config   显式 server/client/desktop 配置入口
```

Hono 在 `apps/web/src/server.ts` 中承接请求，并将页面交给 TanStack Start SSR。Nitro 通过 **显式 Vite 插件**输出 `.output/server/index.mjs`；当前 TanStack Start 不会自行生成 Nitro 部署产物。Nitro `3.0.260903-beta` 和 Vite+ `0.3.1` 已固定。

内部业务使用 `/api/rpc/*`；Better Auth 保留 `/api/auth/*` 协议；文件签名和完成回调使用普通 HTTP。`/health` 检查进程，`/ready` 检查数据库 schema 与存储 bucket。oRPC 和 Better Auth 保留各自 wire format，HTTP 错误使用 `error`，认证错误额外提供 `errorEnvelope`，共同使用业务错误码和 `X-Request-Id`。

## 共享 UI

`packages/ui` 使用 shadcn/ui 的 **New York / Radix** 组件、Tailwind CSS 4 和 Lucide 图标。已接入 Button、Input、Label、Alert、Badge、Skeleton、AlertDialog，登录、密码重置、设备授权与文件列表共用同一套样式。删除确认支持键盘操作、失败重试和关闭后的焦点恢复。

组件源码位于 `packages/ui/src/components`，业务组合组件位于 `packages/ui/src`。主题在 `packages/ui/src/styles.css` 中以语义变量维护，默认沿用蓝色浅色主题；给根元素添加 `.dark` 可使用配套暗色变量。默认按钮和输入框高度为 44px，动画遵循系统的减少动态效果设置。

从根目录按需增加组件：

```sh
bun run ui:add separator
# 先预览上游变更，不覆盖已有定制：
bun run ui:add button --dry-run
```

CLI 固定为 `shadcn@4.21.0`。三个 workspace 的 `components.json` 都指向共享目录，组件只生成一份；新增依赖后按项目惯例固定版本并提交 `bun.lock`。基础组件可从 `@voidmix/ui/components/button` 等子路径导入，现有业务组件从 `@voidmix/ui` 导入。生成组件后，将类名合并函数的导入统一为 `@voidmix/ui/lib/utils`。

Web 与 Desktop 都启用了 `@tailwindcss/vite`。共享 CSS 显式扫描两端源码和 UI 包，使用静态完整类名，避免动态拼接导致生产构建缺少样式。未来新增应用时需增加对应 `@source` 和 Vite+ bundle 缓存输入。

Desktop 的 CSP 允许内联样式，用于 Vite 开发时注入 CSS 和 Radix 弹窗的滚动锁定；脚本仍限制为同源。

## 文件与后台任务

支持 PNG、JPEG、WebP、PDF、TXT；默认上限 25 MiB，可通过 `UPLOAD_MAX_BYTES` 调整，最大 1 GiB。

1. 登录且验证邮箱后请求 `/api/files/init`，校验文件名、扩展名、MIME 和大小。
2. 使用 5 分钟预签名 URL 直传私有 staging key，服务端不接收文件内容。
3. `/api/files/complete` 检查 HEAD 元数据并复制到永久 key，事务提交文件状态、审计和后处理任务。重复完成回调幂等。
4. 永久对象只签发 60 秒下载 URL，使用 attachment 响应；过期上传和临时对象由 worker 清理。
5. 删除先进入 deleting 状态，worker 删除对象后标记 deleted。

队列通过 `FOR UPDATE SKIP LOCKED` 原子认领，60 秒租约、心跳续租、指数退避、最多 5 次尝试；失败任务留在 `jobs` 表。任务语义是至少一次，邮件使用稳定 Message-ID，但 SMTP 本身不保证去重。已完成 payload 会清空，30 天后清理历史。扫描病毒、缩略图、媒体转码尚未启用；`process-upload` 当前验证永久对象存在，不声称进行了内容扫描。

## Desktop PoC

```sh
bun run dev:desktop
# 浏览器预览 http://localhost:1420，token 仅保留在内存中。
```

Electron：在 Desktop UI 开发服务运行时执行：

```sh
VOIDMIX_DESKTOP_DEV=1 bun run --cwd apps/desktop electron
# 或先 bun run build，再执行 bun run --cwd apps/desktop electron
```

Tauri：需要 Rust、系统平台构建依赖；命令自动启动 Desktop UI：

```sh
bun run --cwd apps/desktop tauri
```

两个原生 host 都限制 IPC 的目标 API、使用系统浏览器打开登录页面并保存凭据。Electron 使用 `safeStorage` 加密磁盘文件，Tauri 使用 keyring。系统安全存储不可用时直接失败，不回退明文。原生 API 使用 bearer session，凭据不会放入 localStorage。

设备登录采用 Better Auth device authorization：显示设备码、浏览器显式确认、客户端轮询、一次性兑换会话。因此不需要自行实现 OAuth deep link token 传递。`VOIDMIX_API_URL` 配置 native host；`VITE_API_URL` 配置 Desktop UI，二者应保持一致，远端必须 HTTPS。生产签名、安装包分发和自动更新尚未选定，`bundle.active` 默认关闭。

## 验证与 CI

```sh
bun run check           # Vite+ format/lint、tsc、workspace import boundaries
bun run test            # 合同、配置、文件生命周期、日志、bridge 单测
bun run build           # Vite+ 编排并缓存两个应用的 bundle
bun run db:generate     # 修改 schema 后生成迁移；不会自动写生产数据库
```

集成测试必须提供独立数据库，库名以 `_test` 结尾；测试会重建该库的 public/drizzle schema。测试内部启动临时 S3 兼容服务，并从空库执行两次迁移。

```sh
TEST_DATABASE_URL=postgres://voidmix:voidmix@localhost:5432/voidmix_test bun run test:integration
```

Playwright 覆盖真实登录、直传上传、文件列表、删除确认的键盘焦点与失败重试、退出和移动布局。它需要用同一测试库启动的 Web 和端口 9000 的临时 S3 服务，CI 已包含完整配置。本地已有 Chrome 时可以设置 `PLAYWRIGHT_CHANNEL=chrome`，否则先 `bunx playwright install chromium`。

```sh
node scripts/test-s3.mjs
# 单独终端：使用测试配置启动 Node 产物，然后：
TEST_DATABASE_URL=postgres://voidmix:voidmix@localhost:5432/voidmix_test bun run test:e2e
```

Vite+ 缓存保存在 `node_modules/.vite/task-cache`。仅 `bundle` 与 `types` 等确定性任务启用缓存，开发/数据库迁移/worker 不缓存；源码、workspace 配置、锁文件和环境模板参与 key，运行时密钥不参与 key。包保留普通 scripts，可迁移至其他编排工具。CI 保存本地任务缓存，未接入独立远程缓存服务。

## 部署

先执行数据库迁移，然后部署 `apps/web/.output`，使用 `node .output/server/index.mjs` 启动；环境变量由部署平台注入。Node preset 的 SSR/API 与 worker 使用同一套配置，worker 作为独立进程运行，不能依赖请求结束后的后台线程。

生产配置需要 HTTPS 的 `BETTER_AUTH_URL`、随机认证 secret、PostgreSQL、私有 S3/R2 bucket 和 SMTP。S3/R2 使用服务端凭据；bucket CORS 只允许实际 Web/Desktop origin 的 PUT/GET/HEAD 与必要请求头。预签名 URL 不经过 API 的 CORS 设置。生产反向代理应清洗客户端伪造的 IP 转发头，限制请求体，并终止 TLS。

`packages/config/server` 在启动时校验配置；构建不需要生产密钥。前端只引用公开配置，`scripts/check-boundaries.ts` 阻止共享包/客户端误引入数据库和服务端模块。日志不会记录请求体、cookie、会话 token 或完整签名 URL。

## 保留的决策

Tauri/Electron 最终选择、OAuth provider 的真实凭据、生产对象存储/SMTP、安装包签名与自动更新仍由部署环境决定。Edge preset、多租户、分片上传、离线同步、OpenTelemetry、媒体处理和公开 OpenAPI 暂不启用。
