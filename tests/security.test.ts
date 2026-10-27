import { describe, expect, it } from 'vitest'
import {
  assertSafeRelativePath,
  isPathInside,
  isSafePublicUrl,
  redact
} from '../src/main/security'

describe('security boundaries', () => {
  it('allows only public HTTPS URLs', () => {
    expect(isSafePublicUrl('https://example.com/research')).toBe(true)
    expect(isSafePublicUrl('http://example.com')).toBe(false)
    expect(isSafePublicUrl('https://127.0.0.1/private')).toBe(false)
    expect(isSafePublicUrl('https://192.168.1.4/')).toBe(false)
    expect(isSafePublicUrl('https://printer.local/')).toBe(false)
    expect(isSafePublicUrl('file:///etc/passwd')).toBe(false)
  })

  it('prevents path traversal', () => {
    expect(assertSafeRelativePath('reports/july.md')).toBe('reports/july.md')
    expect(() => assertSafeRelativePath('../outside.txt')).toThrow()
    expect(() => assertSafeRelativePath('/etc/passwd')).toThrow()
    expect(() => assertSafeRelativePath('reports//index.md')).toThrow()
    expect(isPathInside('/tmp/workspace', '/tmp/workspace/report.md')).toBe(true)
    expect(isPathInside('/tmp/workspace', '/tmp/workspace-evil/report.md')).toBe(false)
  })

  it('redacts credentials before logs reach disk', () => {
    const text = redact({
      authorization: 'Bearer abcdefghijklmnop',
      apiKey: 'sk-super-secret-value'
    })
    expect(text).not.toContain('abcdefghijklmnop')
    expect(text).not.toContain('sk-super-secret-value')
    expect(text).toContain('已隐藏')
  })
})
