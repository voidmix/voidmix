import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {},
  // Opt in locally with `vp hooks enable`; `core.hooksPath` stays uncommitted.
  staged: {
    "*.{ts,tsx,json,md,css,toml}": ["vp fmt --write", "vp lint --fix"],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
    },
  },
});
