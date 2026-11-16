# @voidmix/ui

React components shared by Web and MyGo desktop. The package uses shadcn's `base-nova` style, `@base-ui/react` interactions, Tailwind CSS 4, and Hugeicons. Mobile uses React Native components instead of this DOM package.

## Imports and styles

Declare `@voidmix/ui` in the consuming workspace and import component subpaths:

```tsx
import { Input } from "@voidmix/ui/components/input"
import { Label } from "@voidmix/ui/components/label"

export function NameField() {
  return (
    <div className="space-y-2">
      <Label htmlFor="name">Name</Label>
      <Input id="name" name="name" autoComplete="name" />
    </div>
  )
}
```

Both Start applications link `@voidmix/ui/globals.css?url` from their root document. Their content wrapper establishes an isolated stacking context so portal content layers correctly. The source is compiled by each consumer; no separate UI build is required. Consumers provide React and React DOM through peer dependencies.

Available primitives include Button, Input, Textarea, Label, Card, Badge, Separator, Dialog, Select, and Checkbox. Import `cn` from `@voidmix/ui/lib/utils`.

## Theme and page frame

The Soft light product direction is light by default: a warm off-white page, opaque white cards, near-black text, generous 14–16px corners, and diffuse low-opacity shadows. Primary actions use neutral pill buttons, with light gray secondary actions. The backdrop is flat, without a glow or dot grid. Geist provides text and Geist Mono provides codes and agent usage lines. Dark mode uses warm charcoal surfaces, light text, and an inverted neutral primary action.

Each root document renders `<html>` without a dark class and inlines `themeScript` from `@voidmix/ui/lib/theme` in `<head>`. Only a stored `dark` choice enables `.dark` before first paint. Missing, invalid, or inaccessible storage keeps the light default. `ThemeToggle` uses the same light server snapshot, switches and persists the choice, and treats the `<html>` class as the source of truth. The desktop window's `BackgroundColor` in `apps/desktop/main.go` matches the default light background (`#f7f7f5`).

```tsx
import { AppShell, Surface } from "@voidmix/ui/components/app-shell"

;<AppShell brandHref="/">
  <Surface className="max-w-sm">…</Surface>
</AppShell>
```

`AppShell` provides the backdrop, top bar with the theme toggle, and a centered column; pass `brandHref` to show the wordmark link, and omit it where the page's own heading is the brand. `Surface` and `Card` share the opaque `surface` utility. The `app-backdrop` and `surface` utilities behind them live in `globals.css`. `Logo` is decorative and needs visible text beside it. `Icon` exposes named decorative Hugeicons without requiring applications to depend on the icon library.

Color communicates state through paired tint and foreground tokens, exposed through `@theme inline` as `bg-status-running`, `text-status-running-foreground`, and corresponding classes for every state. `StatusPill` always includes a label; `RiskBadge` does the same for risk. Low, medium, and high risk reuse the done, waiting, and failed pairs respectively. All pairs provide at least 4.5:1 text contrast in both themes.

| Token pair       | Light tint / foreground | Dark tint / foreground |
| ---------------- | ----------------------- | ---------------------- |
| `status-running` | `#eaf2ff` / `#285ba6`   | `#23344b` / `#aecbfa`  |
| `status-waiting` | `#fff2d6` / `#805716`   | `#40351f` / `#efd08e`  |
| `status-done`    | `#e8f5ec` / `#286441`   | `#213b2b` / `#a6dabb`  |
| `status-failed`  | `#fceceb` / `#a13c36`   | `#452a29` / `#f3b2ac`  |
| `risk-low`       | `#e8f5ec` / `#286441`   | `#213b2b` / `#a6dabb`  |
| `risk-medium`    | `#fff2d6` / `#805716`   | `#40351f` / `#efd08e`  |
| `risk-high`      | `#fceceb` / `#a13c36`   | `#452a29` / `#f3b2ac`  |

The Web `/workbench` route demonstrates the theme with a responsive sidebar, approval inbox, and agent cards. Its sample requests, filters, and decisions are local component state with no loader or API calls. The processed count includes 12 historical sample requests; only decisions made in the current page session appear in its processed list.

### Scale borrowed from affectUI

Colors, type, radii, shadows, focus, and control heights follow the tokens published at
affectui.com/design-system, mapped onto this package's token names.

| Aspect  | Values                                                                                                   |
| ------- | -------------------------------------------------------------------------------------------------------- |
| Type    | Inter; 13px body at 1.43 line height (`text-sm`), 12px small, 24px/600 page titles; system mono          |
| Radius  | 5px chips (`rounded-sm`), 7px controls (`rounded-md`), 10px cards and panels (`rounded-lg`)              |
| Shadow  | `shadow-surface` for cards (includes a half-pixel edge), `shadow-popover` for floating layers            |
| Spacing | 2px grid: gaps of 4, 6, or 8; 12px inside rows and fields; 16px card padding; 24px between sections      |
| Heights | Buttons 24 / 28 / 32px (`sm`, default, `lg`); inputs 32px; coarse pointers grow to 36–40px and 16px text |
| Focus   | Keyboard only: 2px solid outline, 2px offset. Text fields show no ring; their border firms up            |

Muted text and the light-theme running, waiting, and done foregrounds are slightly darker than the
source so small text keeps a 4.5:1 contrast ratio.

## Icons and composition

```tsx
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"

export function SearchIcon() {
  return <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" className="size-4" />
}
```

Use named imports, stroke width 2, and hidden decorative icons. Icon buttons need an accessible name. All three `components.json` files select `hugeicons`. Applications that import icons directly must declare those dependencies themselves.

Base UI composes elements through `render`, for example `DialogTrigger` with `render={<Button />}`. Preserve keyboard interaction, focus management, accessible titles/descriptions, and disabled states when customizing primitives.

## Adding components

```sh
bun run ui:add tooltip
bun run ui:add dropdown-menu popover
# App-owned blocks stay in the app, while primitive aliases point here.
bun run --cwd apps/web ui:add login-01
```

The CLI updates this package's components, dependencies, and styles. Maintain shared tokens and cross-workspace Tailwind source paths in `src/styles/globals.css`; `.dark` enables the dark theme. Keep routing, auth, and business data in application components.

Run root `bun run check`, build Web and desktop, and verify the changed interaction with keyboard and responsive layouts.
