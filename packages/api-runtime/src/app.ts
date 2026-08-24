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
import type { UserRepository } from "@voidmix/domain";
import { createLoggerConfig, toMiddlewareOptions, type EvlogConfig } from "@voidmix/logger";
import { evlog as honoEvlog, type EvlogVariables } from "@voidmix/logger/hono";
import { withEvlog } from "@voidmix/logger/orpc";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

import { createApiRouter, type ApiContext } from "./router.js";
import type { SessionResolver } from "./session.js";

export interface CreateApiAppOptions {
  users: UserRepository;
  resolveSession: SessionResolver;
  allowedOrigins: readonly string[];
  authHandler: (request: Request) => Promise<Response>;
  now?: () => Date;
  id?: () => string;
  loggerConfig?: EvlogConfig;
}

type ApiEnv = {
  Variables: EvlogVariables["Variables"] & {
    requestId: string;
  };
};

export function createApiApp(options: CreateApiAppOptions) {
  const router = createApiRouter({
    users: options.users,
    ...(options.now ? { now: options.now } : {}),
    ...(options.id ? { id: options.id } : {}),
  });
  const loggerConfig = options.loggerConfig ?? createLoggerConfig({ service: "api" });
  const middlewareOptions = {
    ...toMiddlewareOptions(loggerConfig),
    routes: { "/**": { service: "api" } },
  };
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
      ...middlewareOptions,
      include: ["/rpc/**"],
    },
  );
  const origins = new Set(options.allowedOrigins);
  const app = new Hono<ApiEnv>();

  app.use("*", requestId());
  app.use("*", honoEvlog({ ...middlewareOptions, exclude: ["/rpc/**"] }));
  app.use("*", async (context, next) => {
    const log = context.get("log");
    if (log) {
      log.set({
        operation: context.req.path,
        requestId: context.get("requestId"),
        user: null,
        permissionResult: "not_checked",
      });
    }
    await next();
  });
  app.use(
    "/rpc/*",
    cors({
      origin: (origin) => (origins.has(origin) ? origin : null),
      allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      credentials: true,
    }),
  );
  app.use(
    "/api/auth/*",
    cors({
      origin: (origin) => (origins.has(origin) ? origin : null),
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      credentials: true,
    }),
  );
  app.on(["GET", "POST"], "/api/auth/*", (context) => options.authHandler(context.req.raw));
  app.get("/health", (context) => {
    context.header("Cache-Control", "no-store");
    return context.json({
      status: "ok",
      timestamp: (options.now?.() ?? new Date()).toISOString(),
    });
  });
  app.use("/rpc/*", async (context, next) => {
    const requestId = context.get("requestId");
    const request = context.req.raw;
    const { matched, response } = await handler.handle(request, {
      prefix: "/rpc",
      context: {
        requestId,
        session: await options.resolveSession(request),
      },
    });

    if (matched) return context.newResponse(response.body, response);
    await next();
  });
  app.notFound((context) => context.json({ error: "NOT_FOUND" }, 404));
  app.onError((error, context) => {
    context.get("log")?.error(error);
    return context.json(
      { error: "INTERNAL_SERVER_ERROR", requestId: context.get("requestId") },
      500,
    );
  });

  return app;
}
