import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  AsyncI18nProvider,
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

function AsyncProbe() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useTranslations("home");
  return (
    <div>
      <output data-testid="async-locale">{locale}</output>
      <output data-testid="async-message">{t("greeting", { name: "Ada" })}</output>
      <button onClick={() => void setLocale("en").catch(() => undefined)}>English</button>
      <button onClick={() => void setLocale("zh").catch(() => undefined)}>中文</button>
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

    expect(write).toHaveBeenCalledWith("zh");

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
    expect(document.cookie).toContain("locale=en");
    expect(document.cookie).not.toContain("voidmix_locale=");

    const localStorage = createLocalStorageLocaleStorage();
    localStorage.write("zh");
    expect(localStorage.read()).toBe("zh");
  });
});

describe("AsyncI18nProvider", () => {
  it("renders the initial catalog without loading another locale", () => {
    const loadCatalog = vi.fn(async (locale: keyof typeof messages) => messages[locale]);

    render(
      <AsyncI18nProvider locale="en" messages={messages.en} loadCatalog={loadCatalog}>
        <AsyncProbe />
      </AsyncI18nProvider>,
    );

    expect(screen.getByTestId("async-locale").textContent).toBe("en");
    expect(screen.getByTestId("async-message").textContent).toBe("Hello Ada");
    expect(loadCatalog).not.toHaveBeenCalled();
  });

  it("adopts a new locale and catalog when the provider props change", async () => {
    const loadCatalog = vi.fn(async (locale: keyof typeof messages) => messages[locale]);
    const { rerender } = render(
      <AsyncI18nProvider locale="en" messages={messages.en} loadCatalog={loadCatalog}>
        <AsyncProbe />
      </AsyncI18nProvider>,
    );

    rerender(
      <AsyncI18nProvider locale="zh" messages={messages.zh} loadCatalog={loadCatalog}>
        <AsyncProbe />
      </AsyncI18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("async-locale").textContent).toBe("zh");
      expect(screen.getByTestId("async-message").textContent).toBe("你好，Ada");
    });
    expect(loadCatalog).not.toHaveBeenCalled();
  });

  it("ignores a pending switch after newer provider props arrive", async () => {
    let resolveChinese: ((catalog: typeof messages.zh) => void) | undefined;
    const chinesePromise = new Promise<typeof messages.zh>((resolve) => {
      resolveChinese = resolve;
    });
    const loadCatalog = vi.fn(() => chinesePromise);
    const refreshedEnglish = { home: { greeting: "Hello refreshed {name}" } };
    const { rerender } = render(
      <AsyncI18nProvider locale="en" messages={messages.en} loadCatalog={loadCatalog}>
        <AsyncProbe />
      </AsyncI18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "中文" }));
    rerender(
      <AsyncI18nProvider locale="en" messages={refreshedEnglish} loadCatalog={loadCatalog}>
        <AsyncProbe />
      </AsyncI18nProvider>,
    );
    resolveChinese?.(messages.zh);

    await waitFor(() => {
      expect(screen.getByTestId("async-locale").textContent).toBe("en");
      expect(screen.getByTestId("async-message").textContent).toBe("Hello refreshed Ada");
    });
  });

  it("loads a target catalog once and commits locale and messages together", async () => {
    const write = vi.fn();
    const loadCatalog = vi.fn(async (locale: keyof typeof messages) => messages[locale]);

    render(
      <AsyncI18nProvider
        locale="en"
        messages={messages.en}
        loadCatalog={loadCatalog}
        storage={{ read: () => "en", write }}
      >
        <AsyncProbe />
      </AsyncI18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "中文" }));

    await waitFor(() => {
      expect(screen.getByTestId("async-locale").textContent).toBe("zh");
      expect(screen.getByTestId("async-message").textContent).toBe("你好，Ada");
    });
    expect(loadCatalog).toHaveBeenCalledTimes(1);
    expect(loadCatalog).toHaveBeenCalledWith("zh");
    expect(write).toHaveBeenCalledWith("zh");
  });

  it("shares the pending catalog promise across concurrent requests", async () => {
    let resolveCatalog: ((catalog: typeof messages.zh) => void) | undefined;
    const catalogPromise = new Promise<typeof messages.zh>((resolve) => {
      resolveCatalog = resolve;
    });
    const loadCatalog = vi.fn(() => catalogPromise);

    render(
      <AsyncI18nProvider locale="en" messages={messages.en} loadCatalog={loadCatalog}>
        <AsyncProbe />
      </AsyncI18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "中文" }));
    await waitFor(() => expect(loadCatalog).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "中文" }));
    expect(loadCatalog).toHaveBeenCalledTimes(1);

    resolveCatalog?.(messages.zh);
    await waitFor(() => expect(screen.getByTestId("async-locale").textContent).toBe("zh"));
  });

  it("keeps the current locale after a load failure and retries later", async () => {
    const loadCatalog = vi
      .fn<() => Promise<typeof messages.zh>>()
      .mockRejectedValueOnce(new Error("catalog unavailable"))
      .mockResolvedValueOnce(messages.zh);

    render(
      <AsyncI18nProvider locale="en" messages={messages.en} loadCatalog={loadCatalog}>
        <AsyncProbe />
      </AsyncI18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "中文" }));
    await waitFor(() => expect(loadCatalog).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("async-locale").textContent).toBe("en");

    fireEvent.click(screen.getByRole("button", { name: "中文" }));
    await waitFor(() => expect(screen.getByTestId("async-locale").textContent).toBe("zh"));
    expect(loadCatalog).toHaveBeenCalledTimes(2);
  });

  it("does not commit a stale catalog after a newer locale request", async () => {
    let resolveChinese: ((catalog: typeof messages.zh) => void) | undefined;
    const chinesePromise = new Promise<typeof messages.zh>((resolve) => {
      resolveChinese = resolve;
    });
    const loadCatalog = vi.fn(() => chinesePromise);
    const write = vi.fn();

    render(
      <AsyncI18nProvider
        locale="en"
        messages={messages.en}
        loadCatalog={loadCatalog}
        storage={{ read: () => "en", write }}
      >
        <AsyncProbe />
      </AsyncI18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "中文" }));
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    resolveChinese?.(messages.zh);

    await waitFor(() => expect(screen.getByTestId("async-locale").textContent).toBe("en"));
    expect(screen.getByTestId("async-message").textContent).toBe("Hello Ada");
    expect(write).not.toHaveBeenCalled();
  });
});
