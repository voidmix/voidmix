import { describe, expect, it } from "vite-plus/test";

import { loadAuthMessages } from "./auth";
import { loadCommonMessages } from "./common";
import { loadErrorMessages } from "./errors";
import { loadHomeMessages } from "./home";

describe("web i18n catalogs", () => {
  it.each([
    ["common", loadCommonMessages, "language"],
    ["home", loadHomeMessages, "askVoidmix"],
    ["auth", loadAuthMessages, "signIn"],
    ["errors", loadErrorMessages, "unknown"],
  ] as const)("loads the %s namespace synchronously", (_namespace, loadMessages, key) => {
    const english = loadMessages("en");
    const chinese = loadMessages("zh");

    expect(english).not.toBeInstanceOf(Promise);
    expect(chinese).not.toBeInstanceOf(Promise);
    expect(key in english).toBe(true);
    expect(key in chinese).toBe(true);
  });
});
