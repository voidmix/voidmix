import { createFormatter as createIntlFormatter } from "use-intl/core";

import { formats } from "./formats.js";
import type { Locale } from "./types.js";

export type FormatterOptions = {
  timeZone?: string;
};

export interface Formatter {
  dateTime(
    value: Date | number,
    format?: keyof typeof formats.dateTime | Intl.DateTimeFormatOptions,
  ): string;
  list(
    values: Iterable<string>,
    format?: keyof typeof formats.list | Intl.ListFormatOptions,
  ): string;
  number(
    value: bigint | number,
    format?: keyof typeof formats.number | Intl.NumberFormatOptions,
  ): string;
  relativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    format?: keyof typeof formats.relativeTime | Intl.RelativeTimeFormatOptions,
  ): string;
}

const formatterCache = new Map<string, Formatter>();

export function createFormatter(locale: Locale, options: FormatterOptions = {}): Formatter {
  const timeZone = options.timeZone ?? "UTC";
  const cacheKey = `${locale}:${timeZone}`;
  const cached = formatterCache.get(cacheKey);
  if (cached) return cached;

  const intlFormatter = createIntlFormatter({
    locale,
    timeZone,
    formats: {
      dateTime: formats.dateTime,
      list: formats.list,
      number: formats.number,
    },
  });
  const dateTime = intlFormatter.dateTime as unknown as (
    value: Date | number,
    format?: keyof typeof formats.dateTime | Intl.DateTimeFormatOptions,
  ) => string;
  const list = intlFormatter.list as unknown as (
    values: Iterable<string>,
    format?: keyof typeof formats.list | Intl.ListFormatOptions,
  ) => string;
  const number = intlFormatter.number as unknown as (
    value: bigint | number,
    format?: keyof typeof formats.number | Intl.NumberFormatOptions,
  ) => string;
  const relativeTime = (
    format?: keyof typeof formats.relativeTime | Intl.RelativeTimeFormatOptions,
  ) =>
    new Intl.RelativeTimeFormat(
      locale,
      typeof format === "string" ? formats.relativeTime[format] : format,
    );

  const formatter: Formatter = {
    dateTime: (value, format) => dateTime(value, format),
    list: (values, format) => list(values, format),
    number: (value, format) => number(value, format),
    relativeTime: (value, unit, format) => relativeTime(format).format(value, unit),
  };

  formatterCache.set(cacheKey, formatter);
  return formatter;
}
