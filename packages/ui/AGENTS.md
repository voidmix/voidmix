# @voidmix/ui

## Purpose

Shared visual primitives and design-system utilities for every renderer surface.
Page layout and product-specific composition stay in the owning application.

## Interface

| Path                                                  | Purpose                                               |
| ----------------------------------------------------- | ----------------------------------------------------- |
| `./components/ui/*`                                   | Tree-shakable generated shadcn components             |
| `./avatar`, `./logo`                                  | Compatibility/product-specific wrapper exports        |
| `./toast`                                             | Lazy Toast manager and `AsyncToaster` wrapper         |
| `.`                                                   | Empty compatibility entrypoint                        |
| `./styles.css`                                        | what applications import: the shared base-nova tokens |
| `./styles/globals.css`                                | the shadcn-owned Tailwind entry and oklch token block |
| `./page-header`, `./section-heading`, `./empty-state` | Generic heading and actionable empty-state primitives |
| `./status-badge` and `./components/ui/switch`         | Text status and accessible boolean control            |
| `./lib/*`                                             | `cn` and CVA helpers                                  |

## Ownership

- Own Base UI interactive primitives, shadcn `base-nova` conventions, Phosphor
  icons, Tailwind v4 tokens, and the `cn`/CVA composition helpers.
- Own the base-nova design vocabulary: semantic tokens, focus, radius, and
  motion.
- Own the lazy Toast manager bridge so renderer applications can defer the Toast
  implementation until the first notification without duplicating lifecycle
  logic.
- Own no page layout, route tree, or application navigation.
- Keep project cards, task lists, activity entries and Pi run timelines in Web:
  their domain-specific props are not part of this primitive package.

## Constraints

- Use Base UI, shadcn `base-nova`, Tailwind CSS v4, CVA, and Phosphor Icons. **Do
  not introduce Radix primitives or Lucide icons** without a recorded
  architecture decision.
- Maintain keyboard behavior, focus states, reduced-motion support, and useful
  accessible names on every interactive primitive.
- There are **two file layouts, and picking wrong loses work**:
  - hand-written primitives are flat kebab-case files in `src/` (for example
    `avatar.tsx` and `logo.tsx`);
  - shadcn-generated components live directly in `src/components/ui/` and are
    imported by consumers through `@voidmix/ui/components/ui/<name>`.
- Use package-local `imports` aliases (`#lib/*`, `#hooks/*`, `#components/*`)
  for deep internal imports and package self-references. Nearby relative imports
  remain valid; consumers continue to use the public `exports` paths.
- **`bun run shadcn:update` passes `--overwrite`.** `src/components/ui/button.tsx`
  carries the repository's `primary`/`secondary`/`danger` variants and a
  `type="button"` default; its size names stay aligned with base-nova. Diff
  after every run.
- Primitives are plain functions with no `forwardRef` (React 19). Props re-expose
  variants as named unions rather than spreading `VariantProps`.
- `className` composes as `cn(variants({...}), modifiers, className)`.
  Caller `className` always merges last.
- Add every public component to `package.json` as an explicit subpath export;
  keep `src/index.ts` empty so consumers do not pull a component barrel.
- Keep `src/toast/index.tsx` as the public lazy Toast wrapper and
  `src/components/ui/toast.tsx` as the concrete Toast implementation. Consumers
  that need deferred Toast behavior import `@voidmix/ui/toast`.
- **`vitest.config.ts` includes all `src/**/*.{test,spec}.{ts,tsx}` files.** The
  four layer scripts select unit, integration, component, or coverage runs;
  `--passWithNoTests` can still hide a filter that matches nothing. Component
  tests need the file-level `/** @vitest-environment jsdom */` directive.
- Running `shadcn add` from an application writes into that app's `@/components`,
  not here. Reusable primitives belong in this package.
- Keep `components.json` aliases aligned with `package.json#imports` so shadcn
  generates package-local imports. The current CLI resolves these mappings
  directly; no duplicate `tsconfig.paths` entries are needed. Verify its
  `resolvedPaths` with `bunx shadcn@latest info --cwd packages/ui --json` after
  changing aliases; components must still land in `src/components/ui/`.

## Verification

```bash
bun run --cwd packages/ui check
bun run --cwd packages/ui test:component   # the only script that collects tests
git diff packages/ui                        # after any shadcn:update
```
