# Desktop application

MyGo and Go with a TanStack Start SPA, file routes, and shared Base UI components. The installed application embeds static client assets and does not run a JavaScript SSR server.

## Development and builds

```sh
bun run dev:desktop             # Native window plus Web/API
bun run dev:desktop:web         # Browser-only desktop development, port 1420
bun run build --filter=@voidmix/desktop
bun run preview:desktop        # Static production preview, port 1420
bun run build:desktop -skip-dmg # macOS .app without a DMG
```

Native development starts the Vite frontend, regenerates Go bindings, and restarts the window on Go changes. Browser and native frontend development share port 1420; run one at a time. The preview port can be changed with `DESKTOP_PORT`.

`vite.config.ts` enables Start SPA mode and writes the shell to `dist/client/index.html`. `src/routes/__root.tsx` owns the document, head, stylesheet, and scripts; `ClientOnly` mounts the route tree after shell hydration. `src/routes/index.tsx` renders the desktop UI. No handwritten `index.html` or React root entry is needed.

Start creates `dist/server` for build-time shell generation. MyGo's `frontendDist` points only to `dist/client`. The native file server supports extensionless route fallback to `index.html`. The preview command serves the static client directory without loading Start's server output.

## Native and route ownership

`main.go` registers services and creates the main window. `mygo.config.ts` owns dev/build/packaging settings. `src/routes` contains frontend routes; `src/router.ts` creates the router. Generated `src/routeTree.gen.ts` and `src/mygo.gen.ts` are committed but tool-owned.

```sh
bun run --cwd apps/desktop generate
bun run --cwd apps/desktop generate-routes
```

Browser previews disable native buttons. Authentication opens a separate untrusted WebView without Go bindings. Go owns device-code redemption and credentials in the OS keyring; the SPA sees public codes and profiles, never tokens. Keep authenticated remote business calls in Go. Linux requires a working Secret Service.

Set the public API origin through build-time `VITE_API_URL`; production requires HTTPS. Business functionality uses HTTP or Go IPC, rather than desktop routes requiring a persistent Start server. See [authentication](../../packages/auth/README.md).

## Distribution and verification

```sh
bun run build:desktop
bun run build:desktop -platform linux/amd64 -skip-installer
bun run test:go
E2E_DATABASE_URL=postgresql://.../voidmix_e2e bun run test:e2e -- --project=desktop-web
```

Artifacts live under `build/<os>-<arch>/`. macOS defaults to local ad-hoc signing; configure signing, notarization, and update settings for distribution. `.mygo` is generated and ignored. Keep the Go module, MyGo CLI, and runtime versions aligned.

E2E verifies static shell rendering, client startup, counters, route fallback/refresh, and simulated native bridge calls. It does not replace real WebView, keyring, or native backend verification. Test native login, cancel/reopen, restore, and sign-out on supported platforms.
