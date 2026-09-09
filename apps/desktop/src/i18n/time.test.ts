import { describe, expect, it, vi } from "vite-plus/test";

import { formatCloudTime } from "./time";

const now = new Date("2026-09-09T12:00:00.000Z");

function createFormatter() {
  return {
    relativeTime: vi.fn(
      (
        value: number,
        unit: Intl.RelativeTimeFormatUnit,
        format?: "numeric" | Intl.RelativeTimeFormatOptions,
      ) => `${value}:${unit}:${typeof format === "string" ? format : "options"}`,
    ),
    dateTime: vi.fn(() => "absolute date"),
  };
}

describe("cloud timestamp formatting", () => {
  it("preserves minute and hour relative labels", () => {
    const formatter = createFormatter();

    expect(formatCloudTime(formatter, new Date("2026-09-09T11:52:00.000Z"), now)).toBe(
      "-8:minute:numeric",
    );
    expect(formatCloudTime(formatter, new Date("2026-09-09T10:00:00.000Z"), now)).toBe(
      "-2:hour:numeric",
    );
    expect(formatter.dateTime).not.toHaveBeenCalled();
  });

  it("keeps recent cross-day values relative and older values absolute", () => {
    const formatter = createFormatter();

    expect(formatCloudTime(formatter, new Date("2026-09-08T12:00:00.000Z"), now)).toBe(
      "-1:day:numeric",
    );
    expect(formatCloudTime(formatter, new Date("2026-08-30T12:00:00.000Z"), now)).toBe(
      "absolute date",
    );
    expect(formatter.dateTime).toHaveBeenCalledWith(new Date("2026-08-30T12:00:00.000Z"), "short");
  });
});
