import { BodyLimitPlugin, RPCHandler } from "@orpc/server/fetch";
import {
  BatchHandlerPlugin,
  GetMethodCsrfProtectionHandlerPlugin,
  RequestCompressionHandlerPlugin,
  RequestHeadersHandlerPlugin,
  ResponseCompressionHandlerPlugin,
  ResponseHeadersHandlerPlugin,
  TimeoutHandlerPlugin,
} from "@orpc/server/plugins";
import { InMemoryUserRepository } from "@voidmix/db";
import type { User, UserRepository } from "@voidmix/domain";
import { createLoggerConfig, toMiddlewareOptions, type EvlogConfig } from "@voidmix/logger";
import { evlog as honoEvlog, type EvlogVariables } from "@voidmix/logger/hono";
import { withEvlog } from "@voidmix/logger/orpc";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

import { createApiRouter, type ApiContext } from "./router.js";
import { resolveHeaderSession, type SessionResolver } from "./session.js";

export interface CreateApiAppOptions {
  users?: UserRepository;
  resolveSession?: SessionResolver;
  allowedOrigins?: readonly string[];
  now?: () => Date;
  id?: () => string;
  onError?: (error: unknown) => void;
  loggerConfig?: EvlogConfig;
}

type ApiEnv = {
  Variables: EvlogVariables["Variables"] & {
    requestId: string;
  };
};

export function createApiApp(options: CreateApiAppOptions = {}) {
  const users = options.users ?? createDevelopmentRepository();
  const router = createApiRouter({
    users,
    ...(options.now ? { now: options.now } : {}),
    ...(options.id ? { id: options.id } : {}),
  });
  const loggerConfig = options.loggerConfig ?? createLoggerConfig({ service: "api" });
  const handler = withEvlog(
    new RPCHandler(router, {
      plugins: [
        new BodyLimitPlugin<ApiContext>({ maxBodySize: 1_048_576 }),
        new RequestHeadersHandlerPlugin<ApiContext>(),
        new ResponseHeadersHandlerPlugin<ApiContext>(),
        new RequestCompressionHandlerPlugin<ApiContext>(),
        new ResponseCompressionHandlerPlugin<ApiContext>({ threshold: 1024 }),
        new BatchHandlerPlugin<ApiContext>({ maxSize: 10 }),
        new GetMethodCsrfProtectionHandlerPlugin<ApiContext>(),
        new TimeoutHandlerPlugin<ApiContext>({ timeout: 15_000 }),
      ],
      allowMethods: (method, _procedure, path) =>
        method === "POST" || (method === "GET" && path.at(-1) !== "updateStatus"),
    }),
    {
      ...toMiddlewareOptions(loggerConfig),
      include: ["/rpc/**"],
    },
  );
  const resolveSession = options.resolveSession ?? resolveHeaderSession;
  const origins = new Set(
    options.allowedOrigins ?? ["http://localhost:3000", "http://localhost:3001"],
  );
  const app = new Hono<ApiEnv>();

  app.use("*", requestId());
  app.use("*", honoEvlog({ ...toMiddlewareOptions(loggerConfig), exclude: ["/rpc/**"] }));
  app.use("*", async (context, next) => {
    const log = context.get("log");
    if (log) {
      log.set({
        operation: context.req.path,
        requestId: context.get("requestId"),
        user: context.req.header("x-voidmix-user-id")
          ? { id: context.req.header("x-voidmix-user-id") }
          : null,
        permissionResult: "not_checked",
      });
    }
    await next();
  });
  app.use(
    "/rpc/*",
    cors({
      origin: (origin) => (origins.has(origin) ? origin : null),
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "X-Voidmix-User-Id",
        "X-Voidmix-Role",
        "X-Voidmix-Email",
      ],
      credentials: true,
    }),
  );
  app.get("/health", (context) =>
    context.json({ status: "ok", timestamp: (options.now?.() ?? new Date()).toISOString() }),
  );
  app.use("/rpc/*", async (context, next) => {
    const requestId = context.get("requestId");
    const request = context.req.raw;
    const { matched, response } = await handler.handle(request, {
      prefix: "/rpc",
      context: {
        requestId,
        session: await resolveSession(request),
      },
    });

    if (matched) return context.newResponse(response.body, response);
    await next();
  });
  app.notFound((context) => context.json({ error: "NOT_FOUND" }, 404));
  app.onError((error, context) => {
    options.onError?.(error);
    return context.json(
      { error: "INTERNAL_SERVER_ERROR", requestId: context.get("requestId") },
      500,
    );
  });

  return app;
}

export function createDevelopmentRepository(): InMemoryUserRepository {
  const seed: User[] = [
    {
      id: "owner-local",
      email: "owner@voidmix.local",
      displayName: "Local Owner",
      role: "owner",
      status: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "user-local",
      email: "user@voidmix.local",
      displayName: "Local User",
      role: "user",
      status: "active",
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    },
  ];
  return new InMemoryUserRepository(seed);
}
