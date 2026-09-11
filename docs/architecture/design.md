# Product design

> Status: VoidMix cross-platform AI workbench target direction, September 11, 2026.

The canonical visual specification is [`DESIGN.md`](../../DESIGN.md); the product and delivery boundaries are in [`PRODUCT.md`](../../PRODUCT.md) and [`voidmix-delivery-goal.md`](./voidmix-delivery-goal.md). This document explains how the design applies across surfaces. It is a target specification, not a claim that every current CSS token has migrated.

## Surface roles

- **Desktop** is the Pi execution room: local project authorization, multi-Agent cowork, terminal/logs, workflow editing, files and previews. It defaults to `#0B1020`, uses denser 12–24px spacing and collapsible multi-panel rails.
- **Web** is the cloud management and sharing surface: project/task overview, device state, remote commands, schedules, team permissions, templates, usage and share links. It defaults to `#F7F9FC`, uses wider 16–32px spacing and expands detail views on demand.
- Marketing may use a soft blue→violet→cyan gradient and restrained glow around a product mockup; operational views stay calm, flat and evidence-led.

## Shared language

Both clients use the same Inter/SF Pro/Segoe UI/Noto Sans SC stack, Phosphor icon vocabulary, blue `#5865F2`, violet `#8B6CFF`, cyan `#36C5D8`, role colours (PM/Dev/QA/Designer/Data), status labels, and terminology (`Project`, `Task`, `Workflow`, `Agent`, `Artifact`, `Device`). Components carry text and icon semantics in addition to colour. See the token and state tables in [`DESIGN.md`](../../DESIGN.md).

## Information architecture and focal patterns

The desktop cowork view keeps the conversation timeline central, with agent roles and artifacts visible beside it; the Web task detail uses the same event model in a compressed, shareable layout. Remote control and scheduled tasks always name the target device, authorization scope and resulting state. Empty, loading, offline, failed and unavailable states preserve layout and explain the next action. Preview fixtures are visibly labelled and never presented as live execution. A paused run uses the canonical `waiting_for_approval` state and may show the friendlier “Paused” label only alongside it.

## Accessibility and motion

Target WCAG 2.2 AA, visible keyboard focus, semantic landmarks and 44px touch targets on mobile. Desktop may be information-dense, but it must remain zoomable and keyboard navigable. Motion represents arrival, progress or feedback only; `prefers-reduced-motion` removes translations and looping effects. Light/dark theme changes preserve contrast, labels and state meaning.

## Current implementation boundary

Reusable primitives and tokens belong in `packages/ui`; page composition remains in `apps/desktop` and `apps/web`. The existing runtime can still contain neutral/achromatic CSS while migration proceeds. Pi owns execution/session events; VoidMix owns orchestration, authorization, persistence, synchronization and presentation. This separation prevents visual previews from implying unavailable local models, credentials or devices.
