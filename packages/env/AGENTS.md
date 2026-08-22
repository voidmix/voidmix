# @voidmix/env

## Purpose

The environment seam. It validates values the runtime supplies and composes
package-owned variable sets into application-level environments.

## Interface

| Path        | Purpose                                                  |
| ----------- | -------------------------------------------------------- |
| `.`         | `createEnv`, `defineEnv`, `Preset`, and the preset types |
| `./runtime` | `runtimeEnv`, the base preset every application extends  |

## Ownership

- Own preset definition, preset composition, validation ordering, and the
  server/client/shared split.
- Own no variable. Packages declare the variables they own through a local
  preset; applications compose those presets and add their own.

## Constraints

- **It validates; it does not read `.env` files.** File loading belongs to
  `vmx env -- <command>` in `@voidmix/scripts`. Do not add `envDir` settings
  or workspace-relative env paths.
- Callers must not scatter direct `process.env` or `import.meta.env` reads. Every
  value arrives through a validated env object.
- `VITE_` variables are statically constrained for browser use. Never let an
  aggregate server environment reach client code.
- Blank strings normalize to `undefined`, and defaults apply before validation.
  Preserve both behaviours; consumers rely on them.
- Preset composition detects circular `extends` graphs and must keep doing so.
- **Tests must supply `runtimeEnv` or explicit stubs** rather than reading a
  developer's environment. Unit tests deliberately run outside the env runner.
- Depend only on `zod` and `type-fest`.

## Verification

```bash
bun run --cwd packages/env check
bun run --cwd packages/env test
bun run doctor                # validates the repository environment end to end
```
