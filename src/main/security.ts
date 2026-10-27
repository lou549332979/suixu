import { createHash, randomBytes } from 'node:crypto'
import { isAbsolute, relative, resolve, sep } from 'node:path'

const SECRET_PATTERNS = [
  /\b(sk-[a-zA-Z0-9_-]{12,})\b/g,
  /\b(Bearer\s+)[a-zA-Z0-9._~+/=-]{12,}\b/gi,
  /("?(?:api[_-]?key|password|secret|token)"?\s*[:=]\s*"?)[^"\s,}]{8,}/gi
]

export function redact(value: unknown): string {
  let text = typeof value === 'string' ? value : JSON.stringify(value)
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (_match, prefix: string | undefined) => `${prefix ?? ''}[已隐藏]`)
  }
  return text
}

export function createNonce(): string {
  return randomBytes(24).toString('base64url')
}

export function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

export function isPathInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}

export function assertSafeRelativePath(path: string): string {
  const normalized = path.replaceAll('\\', '/')
  if (
    normalized.length === 0 ||
    normalized.startsWith('/') ||
    normalized.split('/').some((part) => part === '..' || part === '')
  ) {
    throw new Error('路径必须位于应用工作区内')
  }
  return normalized
}

export function isSafePublicUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host === '0.0.0.0' ||
      host === '::1' ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export function escapeAppleScript(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n')
}

export function normalizeToolError(error: unknown): string {
  if (error instanceof Error) return redact(error.message)
  return redact(error)
}
