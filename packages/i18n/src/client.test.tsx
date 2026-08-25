import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  I18nProvider,
  createBrowserLocaleStorage,
  createLocalStorageLocaleStorage,
  useLocale,
  useSetLocale,
  useTranslations,
} from "./client.js";
import type { MessagesByLocale } from "./types.js";

const messages = {
  en: { home: { greeting: "Hello {name}" } },
  zh: { home: { greeting: "你好，{name}" } },
} satisfies MessagesByLocale;

afterEach(cleanup);

function Probe() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useTranslations("home");
  return (
    <div>
      <output data-testid="locale">{locale}</output>
      <output data-testid="message">{t("greeting", { name: "Ada" })}</output>
      <button onClick={() => void setLocale("zh").catch(() => undefined)}>切换</button>
    </div>
  );
}

describe("I18nProvider", () => {
  it("renders a complete static catalog without suspending and switches locale", async () => {
    const write = vi.fn();
    render(
      <I18nProvider locale="en" messages={messages} storage={{ read: () => "en", write }}>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("message").textContent).toBe("Hello Ada");

    fireEvent.click(screen.getByRole("button", { name: "切换" }));

    expect((await screen.findByTestId("locale")).textContent).toBe("zh");
    expect(screen.getByTestId("message").textContent).toBe("你好，Ada");
    expect(write).toHaveBeenCalledWith("zh");
  });

  it("keeps the locale and storage update when the side-effect callback fails", async () => {
    const write = vi.fn();
    const onLocaleChange = vi.fn(async () => {
      throw new Error("document update failed");
    });

    render(
      <I18nProvider
        locale="en"
        messages={messages}
        onLocaleChange={onLocaleChange}
        storage={{ read: () => "en", write }}
      >
        <Probe />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "切换" }));

    expect((await screen.findByTestId("locale")).textContent).toBe("zh");
    expect(screen.getByTestId("message").textContent).toBe("你好，Ada");
    expect(write).toHaveBeenCalledWith("zh");
    expect(onLocaleChange).toHaveBeenCalledWith("zh");
  });

  it("uses the shared cookie and localStorage locale adapters", () => {
    document.cookie = "voidmix_locale=zh";
    const browserStorage = createBrowserLocaleStorage();
    expect(browserStorage.read()).toBe("zh");
    browserStorage.write("en");
    expect(document.cookie).toContain("voidmix_locale=en");

    const localStorage = createLocalStorageLocaleStorage();
    localStorage.write("zh");
    expect(localStorage.read()).toBe("zh");
  });
});
