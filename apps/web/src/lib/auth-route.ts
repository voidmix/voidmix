import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

const sessionCookiePattern = /(?:^|;\s*)(?:__Secure-)?better-auth[.-]session_token(?:=|\.|;|$)/;

export const hasServerSessionCookie = createServerFn({ method: "GET" }).handler(() =>
  sessionCookiePattern.test(getRequestHeaders().get("cookie") ?? ""),
);
