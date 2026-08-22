---
name: Voidmix
description: A high-energy signal room for creative operations.
colors:
  void: "#0B0E0C"
  void-raised: "#121713"
  signal-lime: "#D7FF45"
  signal-lime-hover: "#E4FF78"
  cloud: "#F4F6F1"
  surface: "#FFFFFF"
  ink: "#161A17"
  steel: "#667069"
  line-dark: "#2A312C"
  line-light: "#D9DED9"
  info: "#65D1FF"
  warning: "#FFB454"
  danger: "#FF735C"
typography:
  display:
    fontFamily: "Avenir Next, Segoe UI, Helvetica Neue, sans-serif"
    fontSize: "clamp(3.4rem, 7.5vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.94
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Avenir Next, Segoe UI, Helvetica Neue, sans-serif"
    fontSize: "clamp(2rem, 4vw, 4rem)"
    fontWeight: 760
    lineHeight: 1
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Avenir Next, Segoe UI, Helvetica Neue, sans-serif"
    fontSize: "1rem"
    fontWeight: 450
    lineHeight: 1.6
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "0.72rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0.04em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "72px"
components:
  button-primary:
    backgroundColor: "{colors.signal-lime}"
    textColor: "{colors.void}"
    rounded: "{rounded.md}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.signal-lime-hover}"
    textColor: "{colors.void}"
  button-secondary:
    backgroundColor: "{colors.void-raised}"
    textColor: "{colors.cloud}"
    rounded: "{rounded.md}"
    padding: "12px 18px"
  panel-dark:
    backgroundColor: "{colors.void-raised}"
    textColor: "{colors.cloud}"
    rounded: "{rounded.lg}"
    padding: "24px"
  panel-light:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Voidmix

## 1. Overview

**Creative North Star: "The Live Signal Room"**

Voidmix looks like a system that is already in motion. High-contrast fields,
precise dividers, clipped labels, and real operational state create energy
without relying on decorative spectacle. The public Web surface uses dramatic
scale and asymmetry; Admin and Desktop translate the same language into dense,
predictable controls.

The system rejects generic purple AI gradients, glass effects, passive card
walls, avatar-led mascots, and editorial serif styling. Intensity comes from
hierarchy, typography, contrast, and live state. Product surfaces remain
familiar enough to trust during long work sessions.

**Key Characteristics:**

- Near-black and cloud surfaces with one unmistakable signal-lime accent.
- Strong sans-serif hierarchy, with monospace limited to state and metadata.
- Mostly square geometry, compact radii, structural rules, and restrained
  shadows.
- Real queues, collaborators, decisions, and system health as visual material.
- Motion reserved for activity, progress, arrival, and direct feedback.

## 2. Colors

The palette is binary and operational: dark void, light cloud, and a rare
high-energy signal.

### Primary

- **Signal Lime** (`#D7FF45`): primary actions, current selection, live state,
  and the single dominant brand moment on marketing surfaces.
- **Void** (`#0B0E0C`): the Web and Admin field, primary dark text, and the
  strongest product controls.

### Secondary

- **Live Info** (`#65D1FF`): informational state and device connectivity.
- **Warning Amber** (`#FFB454`): waiting, paused, and attention-needed states.
- **Failure Coral** (`#FF735C`): destructive actions and failed state only.

### Neutral

- **Cloud** (`#F4F6F1`): light application background.
- **Surface White** (`#FFFFFF`): focused light panels and fields.
- **Steel** (`#667069`): secondary copy and inactive labels.
- **Dark Rule** (`#2A312C`) and **Light Rule** (`#D9DED9`): structural
  separation without decorative card shadows.

### Named Rules

**The Live Wire Rule.** Signal Lime should occupy less than 12% of a product
screen. Its rarity is what makes it feel active.

## 3. Typography

**Display Font:** Avenir Next with Segoe UI and Helvetica Neue fallbacks

**Body Font:** Avenir Next with Segoe UI and Helvetica Neue fallbacks

**Label/Mono Font:** the platform monospace stack

**Character:** The same sans-serif family carries brand and product, using
weight and scale rather than an editorial font pairing. Monospace identifies
machine state, time, IDs, and compact operational metadata only.

### Hierarchy

- **Display** (800, up to `6rem`, `0.94`): Web hero statements only.
- **Headline** (760, `2rem` to `4rem`, `1`): Web sections and major moments.
- **Title** (720, `1.125rem` to `1.75rem`, `1.15`): product pages and panels.
- **Body** (450, `1rem`, `1.6`): explanatory copy, capped near 70 characters.
- **Label** (650, `0.72rem`, `0.04em`): short state and metadata labels.

### Named Rules

**The One Voice Rule.** Do not introduce a serif display family. Contrast
comes from scale, weight, width, and composition.

## 4. Elevation

Voidmix is flat by default. Borders, tonal shifts, and controlled overlap
express structure. Shadows appear only for floating menus, temporary notices,
or a single marketing-stage product surface.

### Shadow Vocabulary

- **Float** (`0 8px 24px rgb(0 0 0 / 18%)`): menus and transient overlays.
- **Stage** (`0 32px 80px rgb(0 0 0 / 34%)`): the Web product demonstration
  only, never repeated across a card grid.

### Named Rules

**The Flat-at-Rest Rule.** Permanent product panels use borders or tonal
layers. They do not combine a border with a large soft shadow.

## 5. Components

### Buttons

- **Shape:** compact rectangle with an `8px` radius.
- **Primary:** Signal Lime with Void text on dark surfaces; Void with Cloud
  text on light surfaces.
- **Hover / Focus:** a small color shift, optional one-pixel translation, and a
  two-pixel visible focus ring.
- **Secondary / Ghost:** tonal fill or transparent surface with a structural
  border. Labels use sentence case.

### Chips

- **Style:** compact `4px` to pill radius depending on whether the element is a
  state label or person token.
- **State:** selected chips use a filled tonal surface plus text, never color
  alone.

### Cards / Containers

- **Corner Style:** `8px` to `12px`.
- **Background:** Void Raised or Surface White.
- **Shadow Strategy:** flat at rest; Stage shadow is reserved for Web.
- **Border:** one-pixel structural rules using Dark Rule or Light Rule.
- **Internal Padding:** `16px` to `24px` on product surfaces.

### Inputs / Fields

- **Style:** flat surface, one-pixel rule, `8px` radius, visible text contrast.
- **Focus:** a Signal Lime or dark-ink ring with at least two pixels of visual
  separation.
- **Error / Disabled:** state text accompanies color and the control remains
  legible at reduced opacity.

### Navigation

Navigation uses the primary sans family, compact spacing, and a filled active
state. Marketing navigation may be sparse; product navigation remains fixed
and predictable. Mobile Web navigation collapses before labels become cramped.

### Live State Rail

A horizontal or vertical rail combines a state dot, concise label, and current
value. It can animate only while the represented operation is active.

## 6. Do's and Don'ts

### Do:

- **Do** reserve `#D7FF45` for actions, selected state, and genuinely live
  information.
- **Do** show realistic product state instead of abstract capability claims.
- **Do** vary density by surface while preserving the same palette, type, and
  geometry.
- **Do** keep body text at WCAG AA contrast and support reduced motion.
- **Do** use borders and tonal layering before adding shadows.

### Don't:

- **Don't** use generic purple AI gradients, decorative glassmorphism, or
  neon-on-black effects with no product meaning.
- **Don't** create pale walls of identical SaaS cards.
- **Don't** use mascot or avatar-first storytelling as the brand identity.
- **Don't** pair editorial serif headlines with tiny monospace labels.
- **Don't** make product UI aggressive at the expense of scanability,
  keyboard use, or clear operational states.
- **Don't** use gradient text, oversized card radii, decorative side stripes,
  or repeated tracked uppercase eyebrows.
