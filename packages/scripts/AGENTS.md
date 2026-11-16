# Repository tooling guidance

- Keep command implementations in `src/commands`; dispatch/help stays in `src/index.ts`. Resolve the workspace root from module location.
- Bootstrap commands must work before dependency installation. Load the TypeScript-backed workspace checker only when `check` is invoked.
- Pass subprocess argv as an array, never interpolate user values into shell text. Preserve child exit codes and bound diagnostic probes.
- Environment creation uses exclusive writes, independent random secrets, existing-file preservation, and POSIX `0600`. Never print credentials.
- Service/deployment previews must not mutate files, start services, or execute commands. Stop commands retain data volumes.
- Structural checks are read-only and should derive workspace names and exports from manifests. Include rejecting fixtures when adding a policy and allow legitimate integration tests of real adapters.
- Update root shortcuts, help, and the package README together. Validate with `test:scripts`, `check:workspace`, and relevant dry-run commands.
