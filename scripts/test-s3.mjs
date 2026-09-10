import S3rver from 's3rver'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const directory = await mkdtemp(join(tmpdir(), 'voidmix-e2e-s3-'))
const cors =
  '<CORSConfiguration><CORSRule><AllowedOrigin>http://localhost:3000</AllowedOrigin><AllowedOrigin>http://localhost:1420</AllowedOrigin><AllowedMethod>GET</AllowedMethod><AllowedMethod>HEAD</AllowedMethod><AllowedMethod>PUT</AllowedMethod><AllowedHeader>*</AllowedHeader><ExposeHeader>ETag</ExposeHeader></CORSRule></CORSConfiguration>'
const server = new S3rver({
  port: 9000,
  address: '127.0.0.1',
  silent: true,
  directory,
  configureBuckets: [{ name: 'voidmix', configs: [cors] }],
})
await server.run()
console.info('Disposable S3 test service listening on 9000')
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    await server.close()
    await rm(directory, { recursive: true, force: true })
    process.exit(0)
  })
