import { COMMON_ERROR_STATUS_MAP, ORPCError, RPCSerializer } from "@orpc/server";
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
import { resolveRequestLocaleHint } from "@voidmix/i18n/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { nanoid } from "nanoid";

import { createApiRouter, type ApiContext } from "./router.js";
import { createApiRequestAuthContext, type ApiRequestAuthContext } from "./context.js";
import type { ApiModules } from "./modules.js";
import type { SessionResolver } from "./session.js";
import { createProblemDetails, problemContentType } from "./problem.js";

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
    locale?: import("@voidmix/i18n/types").Locale;
    auth: ApiRequestAuthContext;
  };
};

// The contract currently names mutations with verbs that are safe to classify
// at the transport boundary. Keep this list explicit: GET requests are
// subject to CSRF protection and may be batched/deduplicated by the client.
const mutationProcedureNames = new Set([
  "create",
  "updateStatus",
  "update",
  "sendTest",
  "commitVersion",
  "complete",
  "resolveConflict",
  "transition",
  "acquireLease",
  "heartbeat",
  "archive",
  "restore",
  "resolve",
  "cancel",
  "retry",
]);

const rpcSerializer = new RPCSerializer();

function isRpcPath(path: string): boolean {
  return path === "/rpc" || path.startsWith("/rpc/");
}

function rpcErrorResponse(
  code: string,
  status: 404 | 500,
  data: Record<string, unknown> = { error: { code } },
): Response {
  const error = new ORPCError(code, { data });
  const serialized = rpcSerializer.serialize(error.toJSON());
  if (serialized && typeof serialized === "object" && "json" in serialized) {
    const json = serialized.json;
    if (json && typeof json === "object" && "data" in json) {
      const payload = json as { data?: Record<string, unknown> };
      payload.data = {
        ...(payload.data ?? {}),
        problem: createProblemDetails(
          code,
          status,
          typeof data.requestId === "string" ? data.requestId : "unknown",
        ),
      };
    }
  }
  return Response.json(serialized, { status });
}

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
      allowMethods: (method, _procedure, path) => {
        const isMutation = mutationProcedureNames.has(path.at(-1) ?? "");
        return isMutation ? method === "POST" : method === "GET" || method === "POST";
      },
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
      allowHeaders: ["Content-Type", "Authorization", "X-Request-ID", "Accept-Language"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      credentials: true,
    }),
  );
  app.use(
    "/api/auth/*",
    cors({
      origin: (origin) => (origins.has(origin) ? origin : null),
      allowHeaders: ["Content-Type", "Authorization", "Accept-Language"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      credentials: true,
    }),
  );
  app.on(["GET", "POST"], "/api/auth/*", (context) => {
    const request = context.req.raw;
    const headers = new Headers(request.headers);
    headers.set("x-request-id", context.get("requestId"));
    return options.authHandler(new Request(request, { headers }));
  });
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
    const locale = resolveRequestLocaleHint(request.headers);
    const { matched, response } = await handler.handle(request, {
      prefix: "/rpc",
      context: {
        requestId,
        ...(locale ? { locale } : {}),
        auth: context.get("auth"),
      },
    });

    if (matched) return context.newResponse(response.body, response);
    await next();
  });
  app.notFound((context) =>
    isRpcPath(context.req.path)
      ? rpcErrorResponse("NOT_FOUND", 404)
      : problemContentType(
          context.json(
            {
              code: "NOT_FOUND",
              data: { error: { code: "NOT_FOUND" } },
              problem: createProblemDetails("NOT_FOUND", 404, context.get("requestId")),
            },
            404,
          ),
        ),
  );
  app.onError((error, context) => {
    context.get("log")?.error(error);
    if (isRpcPath(context.req.path)) {
      return rpcErrorResponse("INTERNAL_SERVER_ERROR", 500, {
        error: { code: "INTERNAL_SERVER_ERROR" },
        requestId: context.get("requestId"),
      });
    }
    return problemContentType(
      context.json(
        {
          code: "INTERNAL_SERVER_ERROR",
          data: { error: { code: "INTERNAL_SERVER_ERROR" } },
          problem: createProblemDetails("INTERNAL_SERVER_ERROR", 500, context.get("requestId")),
          requestId: context.get("requestId"),
        },
        500,
      ),
    );
  });

  return app;
}
