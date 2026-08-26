# @voidmix/cache

## Purpose

The server-side Redis cache adapter shared by API runtimes. It provides a
Laravel-like cache facade and Better Auth secondary-storage compatibility.

## Interface

| Path    | Purpose                                                                |
| ------- | ---------------------------------------------------------------------- |
| `.`     | Cache facade, Redis factory, and Better Auth secondary-storage adapter |
| `./env` | Redis cache environment preset                                         |

## Ownership

- Own Redis connection options, key namespaces, serialization, TTL behavior,
  atomic cache operations, and Redis lifecycle.
- Own no authentication policy or application settings semantics.
- Never provide an in-memory or file fallback when Redis is unavailable.

## Constraints

- TTL values are integer seconds; omitted TTL means no expiry.
- Generic cache values are JSON-serialized and restore plain objects, arrays,
  primitives, and null. The generic type parameter does not revive Date, class
  instances, Map, Set, or custom prototypes; callers should encode those values
  explicitly. Better Auth values use raw strings.
- `getAndDelete` and secondary-storage `increment` retain Redis atomicity.
- `flush` is limited to this package's generic cache namespace and never uses
  `FLUSHDB`.
- Redis errors are propagated to callers.

## Verification

```bash
bun run --cwd packages/cache check
bun run --cwd packages/cache test
```
