import type { NamespaceLoader } from "@voidmix/i18n/types";

import { loadNamespace } from "../generated/i18n/messages/_namespaces/636f6d6d6f6e/loader.sync.js";

export const loadCommonMessages = loadNamespace as NamespaceLoader;
