# Web Bundle Baseline

The home route's bundle budget is measured from the TanStack Start build
manifest, not from the largest emitted filename alone. Add the unique preloads
for `__root__` and `/`; those files form the initial JavaScript download for the
home route. Deferred chunks that are absent from both preload lists do not count
until their interaction imports run.

## August 27, 2026 baseline

The comparison below uses the same dependency installation and React Compiler
configuration on both sides. The before build restores only the synchronous
LanguageSwitcher and Composer attachment menus. Gzip totals use the same level-9
compression for every emitted file.

| Home client assets | Before menu split | After menu split |   Change |
| ------------------ | ----------------: | ---------------: | -------: |
| Initial JavaScript |         932.33 kB |        812.08 kB |   -12.9% |
| Initial gzip       |         280.82 kB |        241.76 kB |   -13.9% |
| Main `index` chunk |         662.19 kB |        662.27 kB |    +0.0% |
| Dropdown runtime   | 114.98 kB initial |  115.00 kB async | deferred |

The main chunk is the shared framework and router entry, so menu extraction is
not expected to shrink that individual file. The improvement is that the home
route no longer preloads the shared Dropdown Menu runtime. Language and Composer
add small interaction chunks (about 0.93 kB and 7.91 kB respectively) and share
one Dropdown Menu runtime after the first menu interaction.

When repeating the measurement:

1. Run `bun run --cwd apps/web build`.
2. Read `.output/server/_tanstack-start-manifest_v-*.mjs`.
3. Sum the unique files in the `__root__` and `/` preload arrays, recording raw
   and gzip sizes.
4. Confirm `dropdown-menu` remains absent from the `/` preload list and is an
   import of the language, theme, and attachment menu chunks.

Do not add manual chunk names or change the React Compiler merely to silence the
large-chunk warning. A useful split changes the route's initial preload closure;
moving bytes between filenames without changing that closure is not an
improvement.
