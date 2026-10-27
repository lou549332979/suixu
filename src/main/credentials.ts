import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { safeStorage } from 'electron'

export class CredentialStore {
  private readonly keyPath: string
  private readonly apiKeyPath: string

  constructor(dataDirectory: string) {
    this.keyPath = join(dataDirectory, 'database.key')
    this.apiKeyPath = join(dataDirectory, 'provider.key')
  }

  encrypt(value: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(value).toString('base64')
    }
    return Buffer.from(value, 'utf8').toString('base64')
  }

  decrypt(value: string): string {
    const bytes = Buffer.from(value, 'base64')
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(bytes)
    }
    return bytes.toString('utf8')
  }

  setApiKey(apiKey: string): void {
    writeFileSync(this.apiKeyPath, this.encrypt(apiKey), { mode: 0o600 })
  }

  getApiKey(): string | null {
    if (!existsSync(this.apiKeyPath)) return null
    try {
      return this.decrypt(readFileSync(this.apiKeyPath, 'utf8')) || null
    } catch {
      return null
    }
  }

  clearApiKey(): void {
    if (existsSync(this.apiKeyPath)) {
      writeFileSync(this.apiKeyPath, '', { mode: 0o600 })
    }
  }
}
