---
name: Voidmix
description: A high-contrast signal room for creative operations.
colors:
  void: "#0A0A0A"
  void-raised: "#171717"
  chalk: "#FAFAFA"
  cloud: "#F5F5F5"
  surface: "#FFFFFF"
  steel: "#737373"
  steel-raised: "#A1A1A1"
  line-light: "#E5E5E5"
  line-dark: "#262626"
  danger: "#E7000B"
  danger-raised: "#FF6467"
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
  md: "6px"
  lg: "7px"
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
    backgroundColor: "{colors.void-raised}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.lg}"
    padding: "12px 18px"
  button-primary-on-dark:
    backgroundColor: "{colors.line-light}"
    textColor: "{colors.void-raised}"
    rounded: "{rounded.lg}"
    padding: "12px 18px"
  button-secondary:
    backgroundColor: "{colors.cloud}"
    textColor: "{colors.void-raised}"
    rounded: "{rounded.lg}"
    padding: "12px 18px"
  panel-dark:
    backgroundColor: "{colors.void-raised}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.lg}"
    padding: "24px"
  panel-light:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.void}"
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

The signal is carried by contrast, hierarchy, and live state rather than by a
brand hue. The system rejects generic purple AI gradients, glass effects,
passive card walls, avatar-led mascots, and editorial serif styling. Product
surfaces remain familiar enough to trust during long work sessions.

**Key Characteristics:**

- Near-black and cloud surfaces with no chromatic accent. Emphasis comes from
  full-contrast inversion.
- Strong sans-serif hierarchy, with monospace limited to state and metadata.
- Mostly square geometry, compact radii, structural rules, and restrained
  shadows.
- Real queues, collaborators, decisions, and system health as visual material.
- Motion reserved for activity, progress, arrival, and direct feedback.

## 2. Colors

The palette is achromatic and operational: a dark void, a light cloud, and a
single inverted fill for emphasis. Hue is reserved for destructive state, which
is the only place chroma is allowed.

The values below are the shadcn `bpBA` neutral scale and are the same numbers
implemented in `packages/ui/src/styles/globals.css`, expressed there in oklch.
That file is the runtime source; this section is the specification it satisfies.

### Primary

- **Void** (`#0A0A0A`): the dark field, and primary text on light surfaces.
- **Void Raised** (`#171717`): dark panels, and the inverted primary fill on
  light surfaces.
- **Chalk** (`#FAFAFA`): primary text on dark surfaces, and the label carried by
  the light-surface primary fill.

On dark surfaces the primary pair inverts: a **Line Light** (`#E5E5E5`) fill
carries **Void Raised** text. Primary emphasis is therefore always the maximum
available contrast against its own field, never a separate colour.

### Destructive

- **Danger** (`#E7000B`) on light surfaces and **Danger Raised** (`#FF6467`) on
  dark. Destructive actions and failed state only. These are the only chromatic
  tokens in the system.

### Neutral

- **Cloud** (`#F5F5F5`): light tonal surface for secondary fills and muted rows.
- **Surface White** (`#FFFFFF`): the light field and focused light panels.
- **Steel** (`#737373`): secondary copy, inactive labels, and the focus ring.
- **Steel Raised** (`#A1A1A1`): secondary copy on dark surfaces.
- **Line Light** (`#E5E5E5`) and **Line Dark** (`#262626`): structural
  separation without decorative card shadows.

### Data

A five-step achromatic ramp, identical in both themes: `#D4D4D4`, `#737373`,
`#525252`, `#404040`, `#262626`.

Five greys cannot carry five _categorical_ series — adjacent steps are not
separable at small sizes or for low-vision readers. Use the ramp for ordered or
single-series data, and for anything categorical prefer position, direct labels,
or small multiples over colour. A categorical chart palette needs hue separation
and therefore falls under The No-Hue Rule below.

### Named Rules

**The Inversion Rule.** Full-contrast inverted fills should occupy less than 12%
of a product screen. Their rarity is what makes them read as action.

**The No-Hue Rule.** State is expressed by label, tonal fill, and position — not
by hue. Introducing a brand accent colour requires a recorded decision under
`docs/architecture/decisions/`, because every surface and both themes have to
absorb it at once.

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

- **Shape:** compact rectangle with a `7px` radius.
- **Primary:** Void Raised with Chalk text on light surfaces; Line Light with
  Void Raised text on dark surfaces. Always the inverted pair.
- **Hover / Focus:** a small tonal shift, optional one-pixel translation, and a
  two-pixel visible focus ring.
- **Secondary / Ghost:** tonal fill or transparent surface with a structural
  border. Labels use sentence case.

### Chips

- **Style:** compact `4px` to pill radius depending on whether the element is a
  state label or person token.
- **State:** selected chips use a filled tonal surface plus text, never colour
  alone.

### Cards / Containers

- **Corner Style:** `6px` to `10px`.
- **Background:** Void Raised or Surface White.
- **Shadow Strategy:** flat at rest; Stage shadow is reserved for Web.
- **Border:** one-pixel structural rules using Line Dark or Line Light.
- **Internal Padding:** `16px` to `24px` on product surfaces.

### Inputs / Fields

- **Style:** flat surface, one-pixel rule, `7px` radius, visible text contrast.
- **Focus:** a Steel ring with at least two pixels of visual separation. Steel
  is chosen because it clears WCAG 1.4.11's 3:1 floor against both fields at
  4.67:1 on white; lighter neutrals and any light accent do not.
- **Error / Disabled:** state text accompanies colour and the control remains
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

- **Do** reserve the inverted primary fill for actions, selected state, and
  genuinely live information.
- **Do** show realistic product state instead of abstract capability claims.
- **Do** vary density by surface while preserving the same palette, type, and
  geometry.
- **Do** keep body text at WCAG AA contrast and support reduced motion.
- **Do** use borders and tonal layering before adding shadows.

### Don't:

- **Don't** use generic purple AI gradients, decorative glassmorphism, or
  neon-on-black effects with no product meaning.
- **Don't** introduce a brand accent hue, or spend chroma on anything other
  than destructive state, without a recorded architecture decision.
- **Don't** create pale walls of identical SaaS cards.
- **Don't** use mascot or avatar-first storytelling as the brand identity.
- **Don't** pair editorial serif headlines with tiny monospace labels.
- **Don't** make product UI aggressive at the expense of scanability,
  keyboard use, or clear operational states.
- **Don't** use gradient text, oversized card radii, decorative side stripes,
  or repeated tracked uppercase eyebrows.
