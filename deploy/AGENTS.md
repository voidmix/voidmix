# Deployment guidance

- Keep deployment configuration and data separate from development Compose. Read `README.md` before changing startup ordering.
- Build targets are Web, API, migration, and storage initialization. Runtime images use Bun, built artifacts, and a non-root user.
- Preserve frozen installation after Turbo prune and keep environment files out of the build context.
- Migrations and bucket initialization must complete before the API starts. Successful one-shot jobs exit with code 0.
- Keep infrastructure private to the network and host application ports loopback-bound by default. Public deployments use configured HTTPS origins.
- The `proxy` and `backup` services are opt-in profiles. Keep the default stack free of public listeners, and keep dumps out of Git and the build context.
- Management stop commands retain volumes. Smoke tests target an explicitly isolated loopback deployment, never production data.
- Verify Compose configuration and affected image targets; use the isolated Docker workflow for a full deployment smoke test.
