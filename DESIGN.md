---
name: Voidmix
description: A calm Agent Signal Room for a cross-platform AI workbench.
---

# VoidMix visual system

This is the **target design specification** for VoidMix, derived from the cross-platform product brief and the delivery goal ([delivery goal](docs/architecture/voidmix-delivery-goal.md)). It describes the intended visual world; current renderer CSS may still contain neutral/achromatic tokens while migration is in progress.

## Visual direction

VoidMix is a professional AI workbench in which PM, Dev, QA, Designer, and Data agents visibly collaborate. The desktop execution room is dark and dense; the web management surface is light and spacious. A restrained blue-violet-cyan signal marks action, selection, live sync, and role identity. Gradients and glows are reserved for marketing hero/product-demo moments; operational views use flat tonal layers and clear dividers. Every state is carried by text and icon as well as colour.

## Design tokens

| Token          | Value                                | Use                                     |
| -------------- | ------------------------------------ | --------------------------------------- |
| `void.950`     | `#0B1020`                            | Desktop app background                  |
| `void.900`     | `#151D31`                            | Desktop panels/sidebar                  |
| `cloud.50`     | `#F7F9FC`                            | Web background                          |
| `surface.0`    | `#FFFFFF`                            | Web cards/inputs                        |
| `brand.blue`   | `#5865F2`                            | Primary action, focus, selected nav     |
| `brand.violet` | `#8B6CFF`                            | Agent/collab accent, marketing gradient |
| `brand.cyan`   | `#36C5D8`                            | Sync/live signal, secondary accent      |
| `text.strong`  | `#172033` (light) / `#F7F9FC` (dark) | Headings                                |
| `text.default` | `#425066` / `#C6D0E0`                | Body and table text                     |
| `text.muted`   | `#718096` / `#8C99AE`                | Metadata                                |
| `line`         | `#DCE3EF` / `#2B3850`                | Borders/dividers                        |
| `success`      | `#20B486`                            | Done/healthy                            |
| `warning`      | `#E8A33D`                            | Waiting/degraded                        |
| `error`        | `#E45B6B`                            | Failed/destructive                      |
| `info`         | `#4A8BEA`                            | Informational                           |

Agent identity colours: PM `#7C6CF2`, Dev `#3D8BFF`, QA `#20B486`, Designer `#D66BE8`, Data `#E6A23C`. Use a 3px role bar/icon plus role text; never colour-only communication. Check WCAG 2.2 AA contrast for text and focus indicators.

### Typography

Use `Inter, SF Pro Display, Segoe UI, Noto Sans SC, sans-serif`; use `ui-monospace, SFMono-Regular, Consolas, monospace` for code, IDs, timestamps and raw logs. CJK line heights are intentionally looser.

| Level        |     Web | Desktop | Weight/line height        |
| ------------ | ------: | ------: | ------------------------- |
| H1/display   | 48–64px | 28–36px | 700–800 / 1.15 (CJK 1.25) |
| H2           | 32–40px | 22–28px | 700 / 1.2 (CJK 1.3)       |
| H3/title     | 20–24px | 16–20px | 650–700 / 1.3             |
| Body         |    16px |    14px | 400–450 / 1.6 (CJK 1.75)  |
| Label/button |    14px |    13px | 600 / 1.3                 |
| Mono/log     | 13–14px | 12–13px | 400 / 1.5                 |

Spacing uses a 4px base: `4, 8, 12, 16, 24, 32, 48, 64, 96`. Web sections use 64–96px vertical rhythm; Desktop panels use 12–24px padding. Radii: control 8px, card 12px, modal 16px, pill 999px (only tags/status/people). Shadows: `sm 0 2px 8px rgb(23 32 51 / 8%)`, `md 0 8px 24px rgb(23 32 51 / 14%)`; Desktop prefers borders/tonal layers. A single Web marketing product mockup may use `0 24px 64px rgb(35 45 80 / 20%)`.

## Component rules and states

- **Navigation:** fixed; Web uses translucent white then solid on scroll, Desktop uses opaque void panel. Active item has blue left bar/icon and text. Mobile collapses at 768px.
- **Primary button:** blue fill/white text; hover darkens 8% and translates up 2px; active returns/down 1px; focus has a 2px blue ring plus 2px offset. Secondary is transparent/tonal with border. Danger uses error token and requires confirmation for destructive actions.
- **Input/select:** 40px Web or 34px Desktop height, 1px line, 8px radius. Focus ring is always visible; invalid state adds error border and adjacent text. Disabled state lowers contrast while retaining readable label.
- **Cards:** white Web or `void.900` Desktop, 1px line, 12px radius, 16–24px padding; hover raises 2px and uses `sm` shadow only when actionable.
- **Table/list:** sticky header, 44px Web/36px Desktop rows, row hover tint, sortable headers with icon and text. Empty/loading/error rows occupy the same geometry.
- **Agent role card:** avatar/icon, name, role, slogan, model/device metadata, status badge and 3px role bar. Selected card uses blue outline and tinted background.
- **Timeline/log:** conversation blocks identify sender, timestamp, event type, files and progress. New events fade/translate 8px over 180ms. Tool output uses mono; errors use icon + error text. Preview data is labelled “Preview”; unavailable runtime is explicit.
- **Progress/status:** segmented workflow rail with text labels (`Queued`, `Running`, `Waiting`, `Done`, `Failed`, `Cancelled`, `Offline`, `Unavailable`). Never rely on an animated dot alone.
- **Command composer:** large natural-language input with send, upload and “create schedule” affordances; show target device and expected impact before remote execution.
- **Terminal:** near-black inset panel in either theme, mono text, INFO/WARN/ERROR filters, search, collapse and copy actions.

## Page composition

Desktop uses a three-zone shell: project/resource rail (240px), central cowork timeline, right agent/artifact inspector (280–360px), with collapsible rails and a bottom terminal drawer. Web uses a 224px navigation rail and single-column overview; task detail expands to info + timeline + artifact columns. Core pages are project list/detail, task board/detail, multi-agent cowork, workflow editor, agent/template center, remote control, schedules, team/permissions, settings and usage. The marketing/landing page may use a hero (“Your AI agents, coworking on your desktop”), capability cards, workflow demonstration, proof, and CTA; retain the same tokens and keep decorative gradient/glow limited to this stage.

## Responsive and accessibility

At `>=1200px`, use full multi-column layouts. At `768–1199px`, collapse secondary inspectors and use two columns. Below `768px`, stack cards and timelines, turn navigation into a labelled drawer, make CTA/input controls at least 44px tall, and keep task state visible without horizontal scrolling. Keyboard order follows visual order; every icon button has an accessible name; focus is never removed. Respect `prefers-reduced-motion: reduce` by removing translation/parallax and keeping only instant state changes. Support light/dark theme switching without changing terminology or meaning.

## Principles

Show the work, keep density proportional to the surface, reserve chroma for meaning, and state capabilities truthfully. AionUI-inspired coworking, role cards, conversational execution logs, remote control, and scheduled tasks are product references for VoidMix; implementation must use actual Pi/runtime and synchronization state rather than fabricated activity.
