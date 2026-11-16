# Shared package guidance

- Give each package one documented responsibility and explicit public exports. Read the package README and any narrower guidance.
- Applications compose packages. Production package code must not import applications or another workspace's source via relative paths.
- Factories take configuration/dependencies as arguments; applications own environment loading, singleton lifetime, and shutdown.
- Keep browser-compatible contracts/helpers free from server infrastructure. Auth's client/device/type entry points must not aggregate its server module.
- Declare every external dependency locally even with hoisting. Use `workspace:*` internally and peer dependencies for consumer-owned framework instances.
- Source packages are compiled by consumers. Avoid adding independent build/watch tasks without an actual output requirement.
- Document ownership, miss/error behavior, time units, cancellation, and resource disposal in public helper comments where relevant.
- Integration tests use explicit test infrastructure and unique namespaces; cleanup affects only their own resources.
- Run `check:workspace`, package-appropriate tests, and affected consumer builds after interface changes.
