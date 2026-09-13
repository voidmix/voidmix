# VoidMix visual implementation audit

This is the handoff from the September 11, 2026 visual review. The target
tokens and page composition are in [`DESIGN.md`](../../DESIGN.md); this file
separates implemented behavior from the remaining visual work so a polished
preview cannot be mistaken for a finished product.

## Highest-priority gaps

1. Migrate Desktop renderer tokens to the default Void theme (`#0B1020`) and
   add a visible light/dark preference. The current shell still inherits the
   neutral shared theme.
2. Make the Desktop shell responsive for narrow windows; its current minimum
   width is appropriate for a dense workstation but unusable below the tablet
   breakpoint.
3. Replace the Web Pi timeline fixture with normalized API `PiSessionEvent`
   data, timestamps, tool/file chips, expandable details, and truthful
   role/status mapping. Keep an explicit preview or unavailable badge when no
   live event exists.
4. Complete the coworking workspace composition: one coherent conversation
   column, role cards, artifacts/preview, device and resource state, and
   state-aware pause/resume/cancel plus “adjust next step” controls.
5. Add visible Desktop entries for Cowork, runtime health, workflows, and the
   remote/scheduled queue. Add the unauthenticated marketing route separately
   from the authenticated workspace home, with hero, capability proof, use
   cases, community/skills, trust, CTA, and footer modules from the brief.

## Acceptance pass

- Desktop defaults dark; Web defaults light; both can switch themes without
  losing contrast or state meaning.
- PM, Dev, QA, Designer, and Data roles use stable accents paired with labels
  and icons. Running, queued, success, failed, cancelled, offline, preview,
  and unavailable states are distinguishable without colour alone.
- A real event chronology renders from Pi/API data; fixture content is labelled
  as preview. Keyboard focus, semantic landmarks, 44px mobile targets and
  `prefers-reduced-motion` work on the changed surfaces.
- Web layout works at `>=1200px`, `768–1199px`, and `<768px`; Desktop keeps a
  usable dense layout with collapsible rails.
- Visual detector, workspace checks, native checks, and `bun run verify` pass.
