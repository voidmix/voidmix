import { formats } from "./formats.js";
import type { Locale } from "./types.js";

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

const formatterCache = new Map<Locale, Formatter>();

export function createFormatter(locale: Locale): Formatter {
  const cached = formatterCache.get(locale);
  if (cached) return cached;

  const dateTime = createIntlCache<Intl.DateTimeFormatOptions, Intl.DateTimeFormat>(
    locale,
    formats.dateTime,
    (activeLocale, options) => new Intl.DateTimeFormat(activeLocale, options),
  );
  const list = createIntlCache<Intl.ListFormatOptions, Intl.ListFormat>(
    locale,
    formats.list,
    (activeLocale, options) => new Intl.ListFormat(activeLocale, options),
  );
  const number = createIntlCache<Intl.NumberFormatOptions, Intl.NumberFormat>(
    locale,
    formats.number,
    (activeLocale, options) => new Intl.NumberFormat(activeLocale, options),
  );
  const relativeTime = createIntlCache<Intl.RelativeTimeFormatOptions, Intl.RelativeTimeFormat>(
    locale,
    formats.relativeTime,
    (activeLocale, options) => new Intl.RelativeTimeFormat(activeLocale, options),
  );

  const dateTimePresets = formats.dateTime as Readonly<Record<string, Intl.DateTimeFormatOptions>>;
  const listPresets = formats.list as Readonly<Record<string, Intl.ListFormatOptions>>;
  const numberPresets = formats.number as Readonly<Record<string, Intl.NumberFormatOptions>>;
  const relativeTimePresets = formats.relativeTime as Readonly<
    Record<string, Intl.RelativeTimeFormatOptions>
  >;

  const formatter: Formatter = {
    dateTime: (value, format) =>
      dateTime(typeof format === "string" ? dateTimePresets[format] : format).format(value),
    list: (values, format) =>
      list(typeof format === "string" ? listPresets[format] : format).format(values),
    number: (value, format) =>
      number(typeof format === "string" ? numberPresets[format] : format).format(value),
    relativeTime: (value, unit, format) =>
      relativeTime(typeof format === "string" ? relativeTimePresets[format] : format).format(
        value,
        unit,
      ),
  };

  formatterCache.set(locale, formatter);
  return formatter;
}

function createIntlCache<Options extends object, Instance>(
  locale: Locale,
  presets: Readonly<Record<string, Options>>,
  create: (locale: Locale, options?: Options) => Instance,
) {
  let defaultInstance: Instance | undefined;
  const namedInstances = new Map<string, Instance>();
  const customInstances = new WeakMap<Options, Instance>();

  return (format?: string | Options) => {
    if (!format) {
      defaultInstance ??= create(locale);
      return defaultInstance;
    }
    if (typeof format === "string") {
      const cached = namedInstances.get(format);
      if (cached) return cached;
      const instance = create(locale, presets[format]);
      namedInstances.set(format, instance);
      return instance;
    }
    const cached = customInstances.get(format);
    if (cached) return cached;
    const instance = create(locale, format);
    customInstances.set(format, instance);
    return instance;
  };
}
