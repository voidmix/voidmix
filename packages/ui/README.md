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

The theme is dark by default: cool-tinted neutrals with one indigo accent, Geist for text and Geist Mono for codes and output. Each root document renders `<html class="dark">` and inlines `themeScript` from `@voidmix/ui/lib/theme` in `<head>`, which applies a stored light choice before first paint. `ThemeToggle` switches and persists the choice; the `<html>` class is the single source of truth.

```tsx
import { AppShell, Surface } from "@voidmix/ui/components/app-shell"

;<AppShell brandHref="/">
  <Surface className="max-w-sm">…</Surface>
</AppShell>
```

`AppShell` provides the backdrop, top bar with the theme toggle, and a centered column; pass `brandHref` to show the wordmark link, and omit it where the page's own heading is the brand. `Surface` is the raised panel for a page's primary content. The `app-backdrop` and `surface` utilities behind them live in `globals.css`. `Logo` is decorative and needs visible text beside it.

`primary` carries white text at AA contrast but is too dark for body-size text on dark surfaces, so links use the foreground color. Keep the desktop window's `BackgroundColor` in `apps/desktop/main.go` equal to the dark background to avoid a white flash.

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
