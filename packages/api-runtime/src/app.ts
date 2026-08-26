import { COMMON_ERROR_STATUS_MAP } from "@orpc/server";
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
import { createLoggerConfig, toMiddlewareOptions, type EvlogConfig } from "@voidmix/logger";
import { evlog as honoEvlog, type EvlogVariables } from "@voidmix/logger/hono";
import { withEvlog } from "@voidmix/logger/orpc";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { nanoid } from "nanoid";

import { createApiRouter, type ApiContext } from "./router.js";
import { createApiRequestAuthContext, type ApiRequestAuthContext } from "./context.js";
import type { ApiModules } from "./modules.js";
import type { SessionResolver } from "./session.js";

export interface CreateApiAppOptions {
  modules: ApiModules;
  resolveSession: SessionResolver;
  allowedOrigins: readonly string[];
  authHandler: (request: Request) => Promise<Response>;
  now?: () => Date;
  loggerConfig?: EvlogConfig;
  invalidateAuthSettings?: () => Promise<void>;
}

type ApiEnv = {
  Variables: EvlogVariables["Variables"] & {
    requestId: string;
    auth: ApiRequestAuthContext;
  };
};

export function createApiApp(options: CreateApiAppOptions) {
  const router = createApiRouter({
    modules: options.modules,
    ...(options.now ? { now: options.now } : {}),
    ...(options.invalidateAuthSettings
      ? { invalidateAuthSettings: options.invalidateAuthSettings }
      : {}),
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
        method === "POST" ||
        (method === "GET" && !["updateStatus", "update", "sendTest"].includes(path.at(-1) ?? "")),
      errorStatusMap: { ...COMMON_ERROR_STATUS_MAP, MAIL_NOT_CONFIGURED: 503 },
    }),
    {
      ...middlewareOptions,
      include: ["/rpc/**"],
    },
  );
  const origins = new Set(options.allowedOrigins);
  const app = new Hono<ApiEnv>();

  app.use("*", requestId({ generator: () => nanoid() }));
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
    context.set("auth", createApiRequestAuthContext(await options.resolveSession(context.req.raw)));
    await next();
  });
  app.use("/rpc/*", async (context, next) => {
    const requestId = context.get("requestId");
    const request = context.req.raw;
    const { matched, response } = await handler.handle(request, {
      prefix: "/rpc",
      context: {
        requestId,
        auth: context.get("auth"),
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
