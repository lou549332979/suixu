import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { SuixuDatabase } from '../src/main/database'

const require = createRequire(import.meta.url)
const wasmPath = join(require.resolve('sql.js').replace(/sql-wasm\.js$/, 'sql-wasm.wasm'))

function createDatabase() {
  const directory = mkdtempSync(join(tmpdir(), 'suixu-test-'))
  const database = new SuixuDatabase({
    dataDirectory: directory,
    wasmPath,
    encrypt: (value) => value,
    decrypt: (value) => value
  })
  return { directory, database }
}

describe('encrypted local database', () => {
  it('boots with local defaults and survives a reload', async () => {
    const { directory, database } = createDatabase()
    await database.initialize()
    database.saveMemory({ content: '会议之间保留十分钟缓冲' })
    database.persistNow()

    const file = readFileSync(join(directory, 'suixu.sqlite.enc'))
    expect(file.subarray(0, 5).toString()).toBe('SUXU1')
    expect(file.includes(Buffer.from('会议之间保留十分钟缓冲'))).toBe(false)

    const reloaded = new SuixuDatabase({
      dataDirectory: directory,
      wasmPath,
      encrypt: (value) => value,
      decrypt: (value) => value
    })
    await reloaded.initialize()
    expect(reloaded.listMemories().some((memory) => memory.content.includes('十分钟'))).toBe(true)
    expect(reloaded.getProfile().agentName).toBe('随序')
  })

  it('enforces one-time approval nonces', async () => {
    const { database } = createDatabase()
    await database.initialize()
    const approval = database.createApproval({
      taskId: null,
      toolKey: 'mail.draft',
      title: '创建邮件草稿',
      summary: '收件人：test@example.com',
      payload: { args: {} },
      risk: 'external_write'
    })

    expect(() => database.resolveApproval(approval.id, 'wrong', true)).toThrow()
    const resolved = database.resolveApproval(approval.id, approval.nonce, false)
    expect(resolved.status).toBe('rejected')
    expect(() => database.resolveApproval(approval.id, approval.nonce, true)).toThrow()
  })

  it('stores goals and artifacts in the local workspace', async () => {
    const { database } = createDatabase()
    await database.initialize()
    const goal = database.createGoal('完成季度复盘')
    expect(goal.plan).toHaveLength(3)
    expect(database.listGoals()[0]?.title).toBe('完成季度复盘')
    expect(database.workspace).toContain('workspace')
  })

  it('keeps a thread in chronological order', async () => {
    const { database } = createDatabase()
    await database.initialize()
    const thread = database.createThread('顺序测试')
    const user = database.addMessage({
      threadId: thread.id,
      role: 'user',
      content: '先问'
    })
    await new Promise((resolve) => setTimeout(resolve, 2))
    const assistant = database.addMessage({
      threadId: thread.id,
      role: 'assistant',
      content: '后答'
    })
    expect(database.listMessages(thread.id).map((message) => message.id)).toEqual([
      user.id,
      assistant.id
    ])
  })
})
