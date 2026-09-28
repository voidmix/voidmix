---
name: Voidmix
description: A precise project workbench using shadcn Neutral across every surface.
---

# Voidmix visual system

The shipped product organizes projects and tasks. The longer-term roadmap in
[PRODUCT.md](PRODUCT.md) does not describe capabilities that the current UI can
promise. Product captures use labelled synthetic examples of actual routes.

## Foundation

Use shadcn `base-nova`, Base UI, Tailwind v4 and Phosphor. The official Neutral
light/dark theme is the baseline in
[globals.css](packages/ui/src/styles/globals.css). Do not add a page-specific
palette or recolor the Logo, favicon or native icons. Light primary actions are
black; dark primary actions are light. Errors use the stock destructive role.
Other business states use neutral badges, text and an appropriate icon.

Use stock component variants, radii, focus rings and sizes. Do not impose a
minimum height on every control or override component colors in page CSS.
Coarse-pointer targets are at least 44px. Forms use Field and InputGroup;
Base UI owns overlays, focus containment, dismissal and keyboard behavior.
Utility actions such as theme, language and window controls use compact icon
buttons with accessible names and hover hints. Keep descriptive copy out of
toolbars; primary business actions retain short, explicit text labels.

Retain the Inter/system Chinese fallback stack without runtime font downloads.
Application headings are 24–28px, sections 18–20px, body 14px and metadata at
least 12px. Marketing headings are 38px on phones and up to 64px on desktop.
Align metadata and use tabular numerals for dates and numbers. Long names remain
accessible in the DOM and through title text when truncated visually.

## Page composition

- **Website:** a 64px navigation bar, centered introduction and a full product
  view capped at 1200px. Standard Tabs select project lists or task details.
  Two focused images explain project organization and task context. Mobile
  shows actual mobile captures; images match locale and theme, including system
  dark mode before hydration. Theme controls move to the footer on phones.
- **Authentication:** a quiet product panel and a form capped at 400px. Below
  900px use one column. Registration and reset follow API capabilities.
- **Web:** one 232px sidebar for projects, details and Admin, a 56px context bar
  and content capped at 1400px. Below 1024px use an icon rail; below 768px use
  a Sheet with focus restoration. The Logo mark remains visible on icon rails.
- **Projects:** divider rows show name, description, stage, ownership and update
  date. Creation uses a Dialog. Details put tasks beside 288px of project
  information; that information moves above tasks on narrow screens.
- **Admin:** a compact header, filtered API total, filters and a table. Standard
  ToggleGroup, Checkbox and Table primitives retain page-scoped selection and
  batch feedback. Mobile rows preserve identity, selection and actions.
- **Desktop:** the same Neutral components, a collapsible 224px navigation rail,
  and an 800px native/renderer minimum. Settings group appearance, devices,
  local folders and preferences. No extra native permissions are introduced.

## State and interaction

Loaders own remote data and retain content during background refresh. URL search
owns filters and cursors. Admin Zustand remains page/account scoped. Forms and
overlays stay local; Desktop preferences retain migration and delayed hydration.

Distinguish initial empty, empty pagination, filtered-empty, permission failure,
request failure and unavailable capabilities. Errors retain drafts and offer
real retry actions. No fabricated data, no-op controls or claimed live activity.

Keep transitions short and purposeful. Reduced motion removes movement and
animation. Use semantic headings, labelled controls, visible focus, and sufficient
contrast. Keep secondary menus and Toast implementations lazy.

## Ownership and maintenance

Shared primitives belong in `packages/ui`; navigation and business composition
belong to their applications. There is one theme and no beUI runtime variant.
The previous [pilot](docs/development/beui-pilot.md) remains historical evidence.

Inspect shadcn upstream diffs before applying an update. Keep the button's safe
`type="button"` default, public prop types, localized Modal wrapper and lazy
Toast bridge. The generator manifest describes the installed component set;
review overwrites as documented in
[the UI workspace](packages/ui/AGENTS.md).

See [product design](docs/architecture/design.md) and
[visual verification](docs/development/neutral-ui.md).
