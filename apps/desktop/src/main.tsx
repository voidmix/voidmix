import * as React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { I18nProvider, createLocalStorageLocaleStorage } from "@voidmix/i18n/client";
import { normalizeLocale } from "@voidmix/i18n";
import { messages } from "./i18n/messages";
import { router } from "./router";

const storage = createLocalStorageLocaleStorage();
const initialLocale =
  storage.read() ??
  normalizeLocale(typeof navigator === "undefined" ? undefined : navigator.language) ??
  "en";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider messages={messages} locale={initialLocale} storage={storage}>
      <RouterProvider router={router} />
    </I18nProvider>
  </React.StrictMode>,
);
