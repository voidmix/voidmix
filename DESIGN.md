---
name: Voidmix
description: A calm, precise project workbench across Web and Desktop.
---

# Voidmix visual system

The shipped interface centers on projects and tasks. The longer-term product
vision remains in [PRODUCT.md](PRODUCT.md); it must never imply that an
unavailable runtime or data source is already connected.

## Surface roles

- **Public website:** explain the product through actual, clearly labelled
  screenshots. A split hero leads into a project detail view and the three-step
  workflow: create a project, organize tasks, continue on either surface.
- **Authentication:** one brand panel and one 400px form; below 900px only the
  form remains. Registration and password reset follow server capabilities.
- **Web workbench:** a 224px persistent navigation rail, 56px context bar and a
  content area capped at 1400px. Project and Admin pages share this shell.
- **Desktop:** the same vocabulary with 36px controls and an explicitly
  collapsible 224px rail. The native and renderer minimum width is 800px.

## Typography and geometry

Use `Inter, SF Pro Display, Segoe UI, Noto Sans SC, system-ui, sans-serif` with
system fallbacks, without a runtime font download. Marketing headlines range
from 40px on small screens to 64px on large screens. Application headings are
24–28px, section headings 18–20px, body text 14px and metadata at least 12px.
Monospace is reserved for code and identifiers.

Use 4px spacing increments, typically 16–32px between related page sections.
Controls have an 8px radius, panels 12px and dialogs 16px. Web controls are
40px high, Desktop 36px; coarse pointer targets are at least 44px. Structure
lists with horizontal dividers and use surfaces only for meaningful groups.

## Color and interaction

The canonical tokens live in
[globals.css](packages/ui/src/styles/globals.css). Light surfaces use `#F7F9FC`
and white; dark surfaces use `#0B1020` and `#151D31`. Brand blue `#5865F2`
and violet `#8B6CFF` remain identity colors. The light action token is a darker
blue `#4D58D8` for accessible small text. Semantic success, warning, info and
error tokens have separate light/dark foreground pairs.

Use color together with labels and, for status, icons. Inputs, links and buttons
retain visible focus. Motion lasts 150–200ms and communicates state changes;
reduced motion removes animation and translation. Avoid decorative live dots,
fake metrics, redundant cards, and controls without handlers.

## Page patterns

Project lists show name, description, stage, ownership kind and update date.
Creation is a labelled modal. Details combine tasks with a 288px information
column; the information reflows above tasks on narrow layouts. Task creation is
progressively disclosed and respects the returned project access capability.

Admin prioritizes filters and the table. The total comes from the API; selection,
batch actions and export remain current-page-only. Mobile rows retain selection,
identity, role, status and actions. Unknown activity is never labelled online.

Loading states preserve content geometry. Background refresh keeps current
content visible. Empty, filtered-empty, failed, forbidden and unavailable states
are distinct. Desktop overview and device data exist only after a valid remote
response. Activity recording is explicitly unavailable until it is connected.

## Responsive and ownership

Web collapses the rail below 1024px and uses a modal navigation drawer below
768px. Layouts support 375px without page-level horizontal scrolling. The public
site, authentication and workbench all support English/Chinese and light/dark.

Shared components and tokens belong in `packages/ui`. Business composition and
navigation stay in each application. Loaders own server data, URL search owns
filters/cursors, scoped Zustand owns Admin selection and feedback, and local
React state owns forms and overlays. Device preferences retain validation,
migration and delayed hydration.

See [product design](docs/architecture/design.md) and the
[visual implementation audit](docs/development/visual-audit.md) for verification.
