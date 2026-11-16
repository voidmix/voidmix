# Database guidance

- Use the installed PostgreSQL/Drizzle/pg APIs and preserve the existing schema naming.
- The package owns factories, schema, and migration history; applications own pools and close them on shutdown. Scripts close their pool in `finally`.
- Budget pool size per process. Do not create new pools per request or import environment-dependent application singletons here.
- Schema changes require a new generated migration. Review SQL, journal, and snapshots together; never rewrite applied migrations.
- Preserve uniqueness, foreign-key deletion semantics, time zones, and relevant indexes when evolving authentication data.
- Generate/check operations do not need a live database. Apply migrations only to an explicit target; E2E uses its separate test URL.
