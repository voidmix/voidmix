# UI package guidance

- Keep shared primitives based on shadcn Base UI and the existing theme tokens. App business layouts and routing stay in applications.
- Use Hugeicons named imports with stroke width 2. Hide decorative icons and give icon-only controls accessible names.
- Preserve Base UI's `render` composition, focus behavior, keyboard navigation, labels, descriptions, and disabled semantics.
- Maintain Tailwind cross-workspace source paths and the consumer stacking-isolation requirement when changing styles/portals.
- React/React DOM are consumer-owned peers. Do not introduce server/auth/infrastructure dependencies.
- Add components through root `ui:add`; verify Web and desktop builds plus the affected interaction.
