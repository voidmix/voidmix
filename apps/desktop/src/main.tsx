import * as React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { I18nProvider, createLocalStorageLocaleStorage } from "@voidmix/i18n/client";
import { normalizeLocale } from "@voidmix/i18n";
import { loadCommonMessages } from "./i18n/common";
import { router } from "./router";

const storage = createLocalStorageLocaleStorage();
const initialLocale =
  storage.read() ??
  normalizeLocale(typeof navigator === "undefined" ? undefined : navigator.language) ??
  "en";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider loaders={{ common: loadCommonMessages }} locale={initialLocale} storage={storage}>
      <RouterProvider router={router} />
    </I18nProvider>
  </React.StrictMode>,
);
