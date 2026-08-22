# @voidmix/ui

## Purpose

Shared visual primitives and design-system utilities for every renderer surface.
Page layout and product-specific composition stay in the owning application.

## Interface

| Path                   | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `.`                    | `Button`, `Badge`, `Avatar`, `BrandMark`, and their prop types |
| `./styles.css`         | what applications import: tokens plus the `vm-` rules          |
| `./styles/globals.css` | the shadcn-owned Tailwind entry and oklch token block          |
| `./components/*`       | generated shadcn components                                    |
| `./lib/*`              | `cn` and CVA helpers                                           |

## Ownership

- Own Base UI interactive primitives, shadcn `base-nova` conventions, Phosphor
  icons, Tailwind v4 tokens, and the `cn`/CVA composition helpers.
- Own the design vocabulary documented in the root [`DESIGN.md`](../../DESIGN.md):
  Void, Cloud, Signal Lime, semantic states, focus, radius, and motion.
- Own no page layout, route tree, or application navigation.

## Constraints

- Use Base UI, shadcn `base-nova`, Tailwind CSS v4, CVA, and Phosphor Icons. **Do
  not introduce Radix primitives or Lucide icons** without a recorded
  architecture decision.
- Maintain keyboard behavior, focus states, reduced-motion support, and useful
  accessible names on every interactive primitive.
- There are **two file layouts, and picking wrong loses work**:
  - hand-written primitives are flat kebab-case files in `src/` (copy `badge.tsx`);
  - shadcn-generated components live in `src/components/ui/` with a one-line
    re-export shim at `src/<name>.tsx` (see `button.tsx`).
- **`bun run shadcn:update` passes `--overwrite`.** `src/components/ui/button.tsx`
  carries substantial hand edits (a `vm-button` base class, the
  `primary`/`secondary`/`danger` variants, aliased sizes, a `type="button"`
  default) that the refresh will silently destroy. Diff after every run.
- Primitives are plain functions with no `forwardRef` (React 19). Props re-expose
  variants as named unions rather than spreading `VariantProps`.
- `className` composes as `cn(variants({...}), "vm-<name>", modifiers, className)`
  — Tailwind utilities from CVA **plus** a `vm-` class hooking into the
  hand-written CSS. Caller `className` always merges last.
- Register every export in the `src/index.ts` barrel, alphabetically, value and
  type together.
- **`vitest.config.ts` only collects `src/**/*.component.test.tsx`.** A plain
  `*.test.tsx` here never runs, and `--passWithNoTests` hides that. Component
  tests also need the file-level `/** @vitest-environment jsdom */` directive.
- Running `shadcn add` from an application writes into that app's `@/components`,
  not here. Reusable primitives belong in this package.

## Verification

```bash
bun run --cwd packages/ui check
bun run --cwd packages/ui test:component   # the only script that collects tests
git diff packages/ui                        # after any shadcn:update
```
