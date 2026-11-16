# @voidmix/storage

Server-side object storage using unstorage's S3 driver and aws4fetch signing. The factory returns a lazy handle scoped to a non-empty prefix. Applications own configuration and disposal; clients use business endpoints rather than S3 credentials.

`unstorage` is pinned to `2.0.0-beta.0` for its pagination, directory-prefix, and upload-header behavior. The factory compensates for that version's `clear(base)` parent-mount issue by calling the scoped driver directly. Run integration tests before removing the compatibility code or upgrading the driver.

## Local development and configuration

```sh
bun run storage:up
```

Compose starts RustFS 1.0.5 and initializes the `voidmix` bucket. The API endpoint is `http://127.0.0.1:9000`; the console is `http://127.0.0.1:9001`. Development credentials are `voidmix` / `voidmix-local-storage`. Objects persist in the `s3-data` volume; `storage:down` stops the service and retains data.

```dotenv
S3_ENDPOINT=http://127.0.0.1:9000
S3_BUCKET=voidmix
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=voidmix
S3_SECRET_ACCESS_KEY=voidmix-local-storage
S3_PREFIX=app
```

API `getStorage()` returns `null` without `S3_BUCKET`; enabling it requires all connection fields. Production injects server-only `S3_*` configuration and uses a pre-created bucket. The driver uses explicit access/secret keys. Configure the endpoint and signing region for the chosen S3-compatible provider.

`storage:init` accepts only loopback HTTP and uses fixed development credentials. `LOCAL_S3_ENDPOINT` can change its local port. Deployment uses the separate `scripts/init-deploy.ts`, explicit `S3_*` credentials, and the one-shot `storage-init` image before API startup.

## Usage

```ts
import { createObjectStorage } from "@voidmix/storage/client"

const storage = createObjectStorage({
  endpoint,
  bucket,
  region,
  accessKeyId,
  secretAccessKey,
  prefix: "worker/assets",
})
try {
  await storage.setItem("documents/example", { title: "Voidmix" })
  const document = await storage.getItem<{ title: string }>("documents/example")
  await storage.setItemRaw("files/example.txt", new TextEncoder().encode("Hello"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
      "x-amz-meta-owner": "example",
    },
  })
  const bytes = await storage.getItemRaw<ArrayBuffer>("files/example.txt")
  const metadata = await storage.getMeta("files/example.txt")
  const keys = await storage.getKeys("files")
  await storage.removeItem("files/example.txt")
  await storage.clear("temporary")
} finally {
  await storage.dispose()
}
```

In API code, receive `getStorage()` from the application resource owner through an explicit dependency; Nitro disposes it at shutdown. Enabled S3 requires complete settings at startup. Construction and builds send no S3 requests; operations reject on backend errors. Reads return `null` when absent; JSON generics are not runtime validation.

The prefix defaults to `voidmix`. `clear("temporary")` deletes only that directory under the prefix; `clear()` deletes the whole current prefix. Sibling directory names do not match. List operations traverse pagination; bulk deletion uses batches of at most 1,000 keys. Use `bulkDelete: false` for providers without bulk deletion support.

unstorage normalizes `/`, `\`, and `:` into separators and returns colon-separated keys, such as `files:example.txt`. It also normalizes `?` suffixes. Dot segments are rejected. Object expiry belongs to explicit deletion or the bucket's lifecycle policy, not this handle.

## Integration tests

```sh
TEST_S3_ENDPOINT=http://127.0.0.1:9000 \
TEST_S3_BUCKET=voidmix \
TEST_S3_REGION=us-east-1 \
TEST_S3_ACCESS_KEY_ID=voidmix \
TEST_S3_SECRET_ACCESS_KEY=voidmix-local-storage \
bun run test:storage
```

Every test setting is required; runtime `S3_*` values are never used as a fallback. Tests use `tests/<UUID>/` and remove only their own objects. Coverage includes JSON, binary, Unicode keys, headers, metadata, overwrite/delete, directory isolation, more than 1,000 keys, bulk and individual deletion, invalid paths, and bad credentials.
