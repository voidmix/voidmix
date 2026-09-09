import { describe, expect, it } from "vite-plus/test";

import { assertMessageCatalogParity } from "@voidmix/i18n/testing";
import { createTranslator } from "@voidmix/i18n/server";
import { previewAssets, previewProjects } from "../lib/project-studio";
import { messages } from "./messages";

describe("desktop i18n catalogs", () => {
  it("loads every supported locale synchronously", () => {
    expect(messages.en).toBeDefined();
    expect(messages.zh).toBeDefined();
  });

  it("keeps recursive message keys, node types, and ICU arguments aligned", () => {
    expect(() => assertMessageCatalogParity(messages.en, messages.zh, "en", "zh")).not.toThrow();
  });

  it.each(["en", "zh"] as const)("keeps preview content translatable in %s", (locale) => {
    const projects = createTranslator({
      locale,
      messages: messages[locale],
      namespace: "projects",
    });
    const library = createTranslator({ locale, messages: messages[locale], namespace: "library" });

    for (const project of previewProjects) {
      expect(projects(project.titleKey)).not.toBe(project.titleKey);
      expect(projects(project.descriptionKey)).not.toBe(project.descriptionKey);
    }
    for (const asset of previewAssets) {
      expect(projects(asset.projectTitleKey)).not.toBe(asset.projectTitleKey);
      expect(
        library("previewFileDetail", {
          project: projects(asset.projectTitleKey),
          size: "1 MB",
        }),
      ).not.toContain("previewFileDetail");
    }
  });
});
