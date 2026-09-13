import { describe, expect, it } from "vite-plus/test";

import { checkCatalogPair, checkSourceFile } from "./checks.js";

function catalog(locale: "en" | "zh", content: string, surface = "web" as const) {
  return {
    content,
    locale,
    location: `apps/${surface}/messages/${locale}.json`,
    surface,
  };
}

function source(content: string, location = "apps/web/src/example.tsx") {
  return { content, location };
}

describe("i18n catalog checks", () => {
  it("reports missing keys", () => {
    const findings = checkCatalogPair(
      catalog("en", '{"home":{"title":"Home","subtitle":"Welcome"}}'),
      catalog("zh", '{"home":{"title":"首页"}}'),
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: "catalog.parity",
          message: "zh is missing home.subtitle",
        }),
      ]),
    );
  });

  it("reports catalog node type changes", () => {
    const findings = checkCatalogPair(
      catalog("en", '{"home":{"title":"Home"}}'),
      catalog("zh", '{"home":{"title":{"value":"首页"}}}'),
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: "catalog.parity",
          message: "home.title changes node type between en and zh",
        }),
      ]),
    );
  });

  it("reports ICU argument mismatches", () => {
    const findings = checkCatalogPair(
      catalog("en", '{"greeting":"Hello, {name}"}'),
      catalog("zh", '{"greeting":"你好，{user}"}'),
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: "catalog.parity",
          message: "greeting changes ICU arguments between en and zh",
        }),
      ]),
    );
  });

  it("ignores select and plural branch words when comparing ICU arguments", () => {
    const findings = checkCatalogPair(
      catalog(
        "en",
        '{"status":"{state, select, active {Active} suspended {Suspended} other {Unknown}} {count, plural, one {# file} other {# files}}"}',
      ),
      catalog(
        "zh",
        '{"status":"{state, select, active {启用} suspended {停用} other {未知}} {count, plural, one {# 个文件} other {# 个文件}}"}',
      ),
    );

    expect(findings).toEqual([]);
  });

  it("keeps arguments after ordinary apostrophes visible", () => {
    const findings = checkCatalogPair(
      catalog("en", '{"date":"Today\'s {date}"}'),
      catalog("zh", '{"date":"今天是 {day}"}'),
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: "catalog.parity",
          message: "date changes ICU arguments between en and zh",
        }),
      ]),
    );
  });
});

describe("i18n source checks", () => {
  it("ignores translated and dynamic JSX children", () => {
    const findings = checkSourceFile(
      source(
        '<span>{t("title")}</span><span>{user.name}</span><span>{" "}</span><span>{done ? "✓" : "◐"}</span><span>{[domainValue]}</span><span>{"Fixed" && value}</span><span className="copy" />',
      ),
    );

    expect(findings).toEqual([]);
  });

  it("reports direct string literals in JSX child expressions", () => {
    const findings = checkSourceFile(source('<div>{"Hard text"}</div>'));

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "JSX contains hardcoded user-facing text: Hard text",
        }),
      ]),
    );
  });

  it("reports conditional and logical literals in JSX child expressions", () => {
    const findings = checkSourceFile(
      source('<div>{ok ? "Good copy" : fallback && "Bad copy"}</div>'),
    );

    expect(findings.filter((item) => item.check === "source.hardcoded")).toHaveLength(2);
    expect(findings.map((item) => item.message)).toEqual([
      "JSX contains hardcoded user-facing text: Good copy",
      "JSX contains hardcoded user-facing text: Bad copy",
    ]);
  });

  it("reports template literals in JSX child expressions", () => {
    const findings = checkSourceFile(source("<div>{`Hard text`}</div>"));

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "JSX contains hardcoded user-facing text: Hard text",
        }),
      ]),
    );
  });

  it("reports string literals returned by JSX render props", () => {
    const findings = checkSourceFile(source('<Comp render={() => "Hard text"} />'));

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "JSX contains hardcoded user-facing text: Hard text",
        }),
      ]),
    );
  });

  it("reports literal text in elements and fragments", () => {
    const findings = checkSourceFile(
      source("const view = <><span>Hello</span><span>hello</span></>;"),
    );

    expect(findings.filter((item) => item.check === "source.hardcoded")).toHaveLength(2);
    expect(findings.map((item) => item.message)).toEqual([
      "JSX contains hardcoded user-facing text: Hello",
      "JSX contains hardcoded user-facing text: hello",
    ]);
  });

  it("allows narrow technical JSX fragments but keeps option copy visible", () => {
    const technical = checkSourceFile(
      source(
        "<div><small>v{version}</small><kbd>K</kbd><span>· ≤512 KB</span><span>Voidmix / Chat</span><span>{workspace} / Chat</span></div>",
      ),
    );
    const option = checkSourceFile(source("<span>English</span>"));

    expect(technical).toEqual([]);
    expect(option).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "JSX contains hardcoded user-facing text: English",
        }),
      ]),
    );
  });

  it("checks user-facing JSX attributes while ignoring structural attributes", () => {
    const findings = checkSourceFile(
      source(
        '<button aria-label="Open" title="Open menu" className="open-button" id="open">Open</button>',
      ),
    );

    expect(findings.filter((item) => item.check === "source.hardcoded")).toHaveLength(3);
    expect(findings.map((item) => item.message)).toEqual([
      "JSX attribute aria-label contains hardcoded user-facing text",
      "JSX attribute title contains hardcoded user-facing text",
      "JSX contains hardcoded user-facing text: Open",
    ]);
  });

  it("keeps JSX attribute checks alive after template-literal expressions", () => {
    const findings = checkSourceFile(
      source(
        'const view = <div className={`a ${open ? "b" : "c"}`}><Link aria-label="Hard text" /></div>;',
      ),
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: "source.hardcoded",
          message: "JSX attribute aria-label contains hardcoded user-facing text",
        }),
      ]),
    );
  });

  it("checks literals inside braced and template JSX attributes", () => {
    const findings = checkSourceFile(
      source(`const view = (
        <div className={\`a \${open ? "b" : "c"}\`}>
          <Link aria-label={"Hard text"} />
          <input placeholder={"Enter email"} />
          <button aria-label={\`Open \${name}\`} />
        </div>
      );`),
    );

    expect(findings.filter((item) => item.check === "source.hardcoded")).toHaveLength(3);
    expect(findings.map((item) => item.message)).toEqual([
      "JSX attribute aria-label contains hardcoded user-facing text",
      "JSX attribute placeholder contains hardcoded user-facing text",
      "JSX attribute aria-label contains hardcoded user-facing text",
    ]);
  });

  it("allows structural email examples while checking real placeholder copy", () => {
    expect(
      checkSourceFile(source('<input placeholder="mail@example.com" type="email" />')),
    ).toEqual([]);
    expect(checkSourceFile(source('<input placeholder="Enter your email" />'))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: "source.hardcoded",
          message: "JSX attribute placeholder contains hardcoded user-facing text",
        }),
      ]),
    );
  });

  it("reports literals in conditional metadata properties", () => {
    const findings = checkSourceFile(
      source(
        `const head = [
          { title: locale === "zh" ? "Voidmix | 创意工作" : "Voidmix | Creative work" },
          { name: "description", content: locale === "zh" ? "中文描述" : "English description" },
        ];`,
        "apps/web/src/routes/__root.tsx",
      ),
    );

    expect(findings.filter((item) => item.check === "source.hardcoded")).toHaveLength(4);
    expect(findings.map((item) => item.message)).toEqual([
      "UI property title contains hardcoded user-facing text",
      "UI property title contains hardcoded user-facing text",
      "UI property content contains hardcoded user-facing text",
      "UI property content contains hardcoded user-facing text",
    ]);
  });

  it("reports literals in conditional UI label variables", () => {
    const findings = checkSourceFile(
      source('const currentLabel = locale === "zh" ? "简体中文" : "English";'),
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: "source.hardcoded",
          message: "UI variable currentLabel contains hardcoded user-facing text",
        }),
      ]),
    );
    expect(findings.filter((item) => item.check === "source.hardcoded")).toHaveLength(2);
  });

  it("does not treat conditional domain properties as UI metadata", () => {
    const findings = checkSourceFile(
      source('const project = { status: locale === "zh" ? "active" : "paused" };'),
    );

    expect(findings).toEqual([]);
  });

  it("enforces the surface translation facade", () => {
    const directImport = checkSourceFile(
      source('import { useTranslations } from "@voidmix/i18n/client";', "apps/web/src/page.tsx"),
    );
    const approvedFacade = checkSourceFile(
      source(
        'import { useTranslations } from "@voidmix/i18n/client";',
        "apps/web/src/i18n/client.ts",
      ),
    );
    const directImplementationSubpath = checkSourceFile(
      source('import { createFormatter } from "use-intl/core";', "apps/web/src/format.ts"),
    );
    const directServerImplementationSubpath = checkSourceFile(
      source('import { getTranslations } from "use-intl/server";', "apps/web/src/server.ts"),
    );

    expect(directImport).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: "source.facade",
          message: "imports useTranslations directly from @voidmix/i18n/client",
        }),
      ]),
    );
    expect(approvedFacade).toEqual([]);
    expect(directImplementationSubpath).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: "source.facade",
          message: "imports the use-intl implementation directly",
        }),
      ]),
    );
    expect(directServerImplementationSubpath).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: "source.facade",
          message: "imports the use-intl implementation directly",
        }),
      ]),
    );
  });

  it("rejects fixed locales in Intl formatting calls", () => {
    const findings = checkSourceFile(
      source('new Intl.DateTimeFormat("en").format(date);', "apps/web/src/format.ts"),
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: "source.locale",
          message: "formatting call hardcodes locale en",
        }),
      ]),
    );
  });
});
