import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { resolveRequestLocale } from "@voidmix/i18n/server";

export const getRequestLocale = createServerFn({ method: "GET" }).handler(() =>
  resolveRequestLocale(getRequestHeaders()),
);
