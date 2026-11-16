# @voidmix/typescript-config

Shared strict TypeScript configuration. Workspaces extend `base.json` for server/tool code or `react.json` for DOM React code and add only runtime-specific settings locally.

`base.json` uses modern ECMAScript, bundler module resolution, no emitted output, strict checking, and workspace-friendly package exports. `react.json` adds the React JSX transform and DOM libraries. Expo uses its own base configuration where required by its toolchain.

Compiler configuration has no runtime entry point or build task. After changing a shared default, run root `bun run typecheck` and `bun run build` to check every consumer. Avoid per-workspace copies of shared compiler options.
