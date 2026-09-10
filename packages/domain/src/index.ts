import type { ErrorCode, FileDto, FilePage, UploadInput } from '@voidmix/contracts'
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
export interface FileRecord extends FileDto {
  ownerId: string
  objectKey: string
  stagingKey: string
}
export interface FileRepository {
  create(record: FileRecord): Promise<void>
  find(id: string, ownerId: string): Promise<FileRecord | undefined>
  list(
    ownerId: string,
    input: { limit: number; cursor?: string; filter?: { contentType?: string } },
  ): Promise<FilePage>
  complete(record: FileRecord, requestId: string): Promise<FileRecord>
  remove(record: FileRecord, requestId: string): Promise<void>
}
export interface ObjectStorage {
  createUploadUrl(key: string, input: UploadInput): Promise<string>
  stat(key: string): Promise<{ size: number; contentType: string } | undefined>
  promote(stagingKey: string, objectKey: string): Promise<void>
  createDownloadUrl(key: string, fileName: string): Promise<string>
  deleteObject(key: string): Promise<void>
  check(): Promise<void>
}
export const toFileDto = ({
  id,
  fileName,
  contentType,
  size,
  status,
  createdAt,
}: FileRecord): FileDto => ({ id, fileName, contentType, size, status, createdAt })
const extensions: Record<string, string[]> = {
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'text/plain': ['txt'],
}
export function validateUpload(input: UploadInput, maxBytes: number) {
  if (input.size > maxBytes) throw new AppError('BAD_REQUEST', `File exceeds ${maxBytes} bytes`)
  const extension = input.fileName.split('.').pop()?.toLowerCase() ?? ''
  if (!extensions[input.contentType]?.includes(extension))
    throw new AppError('BAD_REQUEST', 'File extension does not match content type')
}
export function createFileService(
  repository: FileRepository,
  storage: ObjectStorage,
  options: {
    maxBytes: number
    audit: (event: {
      actorId: string
      action: string
      resource: string
      requestId: string
    }) => Promise<void>
  },
) {
  async function owned(id: string, userId: string) {
    const file = await repository.find(id, userId)
    if (!file || file.status === 'deleted') throw new AppError('NOT_FOUND', 'File not found')
    return file
  }
  return {
    list: repository.list.bind(repository),
    async initialize(userId: string, input: UploadInput) {
      validateUpload(input, options.maxBytes)
      const id = crypto.randomUUID()
      const stagingKey = `staging/${userId}/${id}`
      const file: FileRecord = {
        ...input,
        id,
        ownerId: userId,
        stagingKey,
        objectKey: `files/${userId}/${id}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      const uploadUrl = await storage.createUploadUrl(stagingKey, input)
      await repository.create(file)
      return {
        file: toFileDto(file),
        uploadUrl,
        expiresIn: 300,
        headers: { 'Content-Type': input.contentType },
      }
    },
    async complete(userId: string, id: string, requestId: string) {
      const file = await owned(id, userId)
      if (file.status === 'ready') return toFileDto(file)
      if (file.status !== 'pending' || Date.now() - Date.parse(file.createdAt) > 30 * 60_000)
        throw new AppError('CONFLICT', 'Upload expired')
      const object = await storage.stat(file.stagingKey)
      if (!object || object.size !== file.size || object.contentType !== file.contentType)
        throw new AppError('BAD_REQUEST', 'Uploaded object does not match its metadata')
      // Never issue PUT URLs for permanent keys. A still-valid upload URL cannot overwrite a completed file.
      await storage.promote(file.stagingKey, file.objectKey)
      const promoted = await storage.stat(file.objectKey)
      if (!promoted || promoted.size !== file.size || promoted.contentType !== file.contentType)
        throw new AppError('BAD_REQUEST', 'Object changed during completion')
      return toFileDto(await repository.complete(file, requestId))
    },
    async download(userId: string, id: string, requestId: string) {
      const file = await owned(id, userId)
      if (file.status !== 'ready') throw new AppError('CONFLICT', 'File is not ready')
      const url = await storage.createDownloadUrl(file.objectKey, file.fileName)
      await options.audit({ actorId: userId, action: 'file.download', resource: id, requestId })
      return { url, expiresIn: 60 }
    },
    async remove(userId: string, id: string, requestId: string) {
      const file = await repository.find(id, userId)
      if (!file) throw new AppError('NOT_FOUND', 'File not found')
      if (file.status === 'deleted' || file.status === 'deleting') return
      await repository.remove(file, requestId)
    },
  }
}
export type FileService = ReturnType<typeof createFileService>
