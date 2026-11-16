# Desktop guidance

- Use MyGo and Go, with TanStack Start in SPA mode. Read `README.md` before changing dev/build paths.
- MyGo embeds only `dist/client`; `dist/server` generates the shell at build time. Keep the shell output at `index.html` for static route fallback.
- The root document mounts route content with `ClientOnly` after shell hydration. Keep native bridge detection out of prerendered content.
- Do not add server routes/functions that require a persistent JavaScript server in the installed application.
- Expose Go methods through MyGo and regenerate `src/mygo.gen.ts`. Do not hand-edit generated bindings or the route tree.
- Remote login runs in a separate untrusted WebView without IPC. Go owns device codes, redemption, keyring credentials, and authenticated remote operations; JS gets public codes and profiles only.
- Keep origin-isolated keyring storage, cancellation/supersession guards, and revocation when local persistence fails. Do not fall back to plaintext credentials.
- Keep MyGo module, CLI, and runtime versions compatible. Run `gofmt`, Go race tests, SPA build/E2E, and a native package build for native changes.
- Report real native verification separately from the simulated bridge browser test.
