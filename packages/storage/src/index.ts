import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createStorage as createUnstorage } from 'unstorage'
import s3Driver from 'unstorage/drivers/s3'
import type { ServerConfig } from '@voidmix/config/server'
import type { ObjectStorage } from '@voidmix/domain'
export function createStorage(config: ServerConfig): ObjectStorage & { dispose(): Promise<void> } {
  const client = new S3Client({
    region: config.S3_REGION,
    endpoint: config.S3_ENDPOINT,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
  })
  const bucket = config.S3_BUCKET
  // unstorage normalizes path separators; all keys are server-generated UUID paths.
  const objects = createUnstorage({
    driver: s3Driver({
      bucket,
      region: config.S3_REGION,
      endpoint: config.S3_ENDPOINT,
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    }),
  })
  return {
    async createUploadUrl(key, input) {
      return getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: input.contentType,
          ContentLength: input.size,
        }),
        { expiresIn: 300 },
      )
    },
    async stat(key) {
      try {
        const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
        return {
          size: object.ContentLength ?? 0,
          contentType: object.ContentType ?? 'application/octet-stream',
        }
      } catch (error) {
        if (
          error instanceof Error &&
          'name' in error &&
          ['NotFound', 'NoSuchKey'].includes(error.name)
        )
          return undefined
        throw error
      }
    },
    async promote(stagingKey, objectKey) {
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          CopySource: `${bucket}/${stagingKey.split('/').map(encodeURIComponent).join('/')}`,
        }),
      )
    },
    async createDownloadUrl(key, fileName) {
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        }),
        { expiresIn: 60 },
      )
    },
    async deleteObject(key) {
      await objects.removeItem(key)
    },
    async check() {
      await client.send(new HeadBucketCommand({ Bucket: bucket }))
    },
    async dispose() {
      client.destroy()
      await objects.dispose()
    },
  }
}
