# Product Design

> Status: implemented baseline, updated August 17, 2026.

Voidmix uses one visual language across Web, Admin, and Desktop, with intensity
calibrated to the job of each surface. The strategic source is
[`PRODUCT.md`](../../PRODUCT.md); the machine-readable and narrative visual
specification is [`DESIGN.md`](../../DESIGN.md).

## Design posture

The creative north star is **The Live Signal Room**. Voidmix should look like a
system already in motion: strong hierarchy, precise rules, realistic state,
and one rare high-energy accent. It does not use generic purple AI gradients,
decorative glass effects, editorial serif styling, or mascot-led storytelling.

## Surface intensity

- **Web** is the brand surface. It may use dramatic scale, asymmetry, a staged
  product demonstration, and one purposeful arrival animation.
- **Admin** is a dark control surface. Density, operational status, and table
  scanability take precedence over visual spectacle.
- **Desktop** is a light field workstation. It uses the same geometry and
  Signal Lime vocabulary while remaining comfortable for long sessions.

## Shared vocabulary

- Void `#0B0E0C` and Cloud `#F4F6F1` form the primary dark and light fields.
- Signal Lime `#D7FF45` identifies primary actions, current selection, and
  genuinely live state. Product screens keep its surface coverage below 12%.
- Avenir Next, Segoe UI, and Helvetica Neue form the main sans-serif stack.
  Monospace is limited to time, IDs, status, and machine metadata.
- Permanent product panels use tonal layering and one-pixel rules. Large soft
  shadows are reserved for the single Web product stage.
- Shared components use compact 4 to 12 pixel radii. Pill geometry is reserved
  for people or compact state tokens.

## Ownership

`@voidmix/ui` owns reusable primitives, focus behavior, base tokens, and the
brand mark. Each application owns its page composition and calibrated density.
App-specific visuals must use the shared palette and component vocabulary
without moving product-specific layouts into the shared package prematurely.

## Accessibility and motion

All renderer surfaces target WCAG 2.2 AA contrast, semantic landmarks, visible
keyboard focus, and useful accessible names. Color is never the only state
signal. Motion must represent activity, progress, arrival, or feedback and
must provide a reduced-motion alternative.
