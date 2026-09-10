import { createLogger as createEvlogLogger, initLogger } from 'evlog'
export type LogContext = { requestId: string; traceId?: string; userId?: string }
const sensitive =
  /password|secret|token|cookie|authorization|uploadurl|downloadurl|signedurl|database_url/i
export function redact(value: unknown): unknown {
  if (typeof value === 'string')
    return value.replace(/https?:\/\/[^\s]+/g, (url) => {
      try {
        const parsed = new URL(url)
        return `${parsed.origin}${parsed.pathname}${parsed.search ? '?[REDACTED]' : ''}`
      } catch {
        return '[REDACTED]'
      }
    })
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitive.test(key) ? '[REDACTED]' : redact(item),
      ]),
    )
  return value
}
export function initializeLogging() {
  initLogger({
    env: { service: 'voidmix' },
    pretty: process.env.NODE_ENV !== 'production',
    redact: { paths: ['**.password', '**.token', '**.secret', '**.authorization', '**.cookie'] },
  })
}
export function createLogger(context: LogContext) {
  const logger = createEvlogLogger(context)
  return {
    set(data: Record<string, unknown>) {
      logger.set(redact(data) as Record<string, unknown>)
    },
    info(message: string, data: Record<string, unknown> = {}) {
      logger.info(message, redact(data) as Record<string, unknown>)
    },
    error(message: string, data: Record<string, unknown> = {}) {
      logger.error(message, redact(data) as Record<string, unknown>)
    },
    emit() {
      return logger.emit()
    },
  }
}
export type Logger = ReturnType<typeof createLogger>
