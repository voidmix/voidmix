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
