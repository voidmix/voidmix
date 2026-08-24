import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import {
  BatchLinkPlugin,
  DedupeLinkPlugin,
  RequestCompressionLinkPlugin,
  ResponseCompressionLinkPlugin,
  RetryAfterLinkPlugin,
  TimeoutLinkPlugin,
} from "@orpc/client/plugins";
import type { ContractRouterClient } from "@orpc/contract";
import { apiContract } from "@voidmix/contracts";

export type ApiClient = ContractRouterClient<typeof apiContract>;

export type ApiHeaders = Record<string, string | undefined>;

export interface CreateApiClientOptions {
  baseUrl?: string;
  headers?: ApiHeaders | (() => ApiHeaders | Promise<ApiHeaders>);
  fetch?: typeof globalThis.fetch;
}

export function createApiClient(options: CreateApiClientOptions = {}): ApiClient {
  const toHeaders = (value: ApiHeaders): Headers => {
    const entries = Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    );
    return new Headers(entries);
  };
  const configuredHeaders = options.headers;
  const readRequestGroup = {
    condition: ({ request }: { request: { method: string } }) =>
      request.method === "GET" || request.method === "QUERY",
    context: (items: Array<{ context: object }>) => items[0]?.context ?? {},
  };
  const baseUrl = options.baseUrl?.replace(/\/$/, "");
  const link = new RPCLink({
    url: "/rpc",
    ...(baseUrl ? { origin: baseUrl } : {}),
    method: (_requestOptions, path) => (path.at(-1) === "updateStatus" ? "POST" : "GET"),
    plugins: [
      new DedupeLinkPlugin({ groups: [readRequestGroup] }),
      new BatchLinkPlugin({ groups: [readRequestGroup], maxSize: 10, mode: "buffered" }),
      new RequestCompressionLinkPlugin({ threshold: 1024 }),
      new ResponseCompressionLinkPlugin(),
      new RetryAfterLinkPlugin({
        condition: (response, { request }) =>
          (request.method === "GET" || request.method === "QUERY") &&
          (response.status === 429 || response.status === 503),
        maxAttempts: 2,
        timeout: 5_000,
      }),
      new TimeoutLinkPlugin({ timeout: 15_000 }),
    ],
    ...(configuredHeaders
      ? {
          headers: async () =>
            toHeaders(
              typeof configuredHeaders === "function"
                ? await configuredHeaders()
                : configuredHeaders,
            ),
        }
      : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  return createORPCClient(link);
}
