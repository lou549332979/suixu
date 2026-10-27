import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID
} from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import type {
  Activity,
  Approval,
  Artifact,
  ChatMessage,
  Connector,
  Goal,
  Memory,
  ModelConfig,
  Profile,
  RiskLevel,
  ScheduledTask,
  Thread
} from '../shared/types'
import { DEFAULT_CAPABILITIES, DEFAULT_CONNECTORS, SEED_IDEAS } from '../shared/constants'
import { createNonce } from './security'

interface EncryptedPayload {
  encrypted: boolean
  bytes: Uint8Array
}

export interface DatabaseOptions {
  dataDirectory: string
  encrypt: (plainText: string) => string
  decrypt: (cipherText: string) => string
  wasmPath: string
}

type Row = Record<string, SqlValue>

export class SuixuDatabase {
  private db!: Database
  private readonly databasePath: string
  private readonly keyPath: string
  private readonly workspacePath: string
  private readonly options: DatabaseOptions
  private saveTimer: NodeJS.Timeout | null = null
  private dbKey = ''
  private initialized = false

  constructor(options: DatabaseOptions) {
    this.options = options
    mkdirSync(options.dataDirectory, { recursive: true })
    this.databasePath = join(options.dataDirectory, 'suixu.sqlite.enc')
    this.keyPath = join(options.dataDirectory, 'database.key')
    this.workspacePath = join(options.dataDirectory, 'workspace')
    mkdirSync(this.workspacePath, { recursive: true })
  }

  get workspace(): string {
    return this.workspacePath
  }

  async initialize(): Promise<void> {
    if (this.initialized) return
    const wasm = readFileSync(this.options.wasmPath)
    const wasmBinary = wasm.buffer.slice(
      wasm.byteOffset,
      wasm.byteOffset + wasm.byteLength
    ) as ArrayBuffer
    const SQL = await initSqlJs({ wasmBinary })
    this.dbKey = this.loadOrCreateKey()

    let existing: EncryptedPayload | null = null
    if (existsSync(this.databasePath)) {
      existing = this.decryptDatabase(readFileSync(this.databasePath))
    }

    this.db = existing?.encrypted
      ? new SQL.Database(existing.bytes)
      : new SQL.Database()

    this.db.run('PRAGMA foreign_keys = ON')
    this.createSchema()
    this.seed()
    this.persistNow()
    this.initialized = true
  }

  private loadOrCreateKey(): string {
    if (existsSync(this.keyPath)) {
      const encryptedKey = readFileSync(this.keyPath, 'utf8')
      return this.options.decrypt(encryptedKey)
    }
    const key = randomBytes(32).toString('hex')
    writeFileSync(this.keyPath, this.options.encrypt(key), { mode: 0o600 })
    return key
  }

  private encryptDatabase(plain: Uint8Array): Buffer {
    const key = Buffer.from(this.dbKey, 'hex')
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const body = Buffer.concat([cipher.update(plain), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([Buffer.from('SUXU1'), iv, tag, body])
  }

  private decryptDatabase(file: Buffer): EncryptedPayload {
    if (file.subarray(0, 5).toString() !== 'SUXU1' || file.length < 34) {
      throw new Error('本地数据库格式无效')
    }
    const key = Buffer.from(this.dbKey, 'hex')
    const iv = file.subarray(5, 17)
    const tag = file.subarray(17, 33)
    const body = file.subarray(33)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return {
      encrypted: true,
      bytes: Buffer.concat([decipher.update(body), decipher.final()])
    }
  }

  private schedulePersist(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.persistNow(), 80)
  }

  persistNow(): void {
    if (!this.db) return
    const bytes = this.db.export()
    const encrypted = this.encryptDatabase(bytes)
    const tempPath = `${this.databasePath}.tmp`
    writeFileSync(tempPath, encrypted, { mode: 0o600 })
    renameSync(tempPath, this.databasePath)
  }

  private exec(sql: string, params: Array<SqlValue> = []): void {
    this.db.run(sql, params)
    this.schedulePersist()
  }

  private rows<T>(sql: string, params: Array<SqlValue> = []): T[] {
    const statement = this.db.prepare(sql)
    try {
      statement.bind(params)
      const results: T[] = []
      while (statement.step()) results.push(statement.getAsObject() as T)
      return results
    } finally {
      statement.free()
    }
  }

  private one<T>(sql: string, params: Array<SqlValue> = []): T | null {
    return this.rows<T>(sql, params)[0] ?? null
  }

  private createSchema(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS profile (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        tone TEXT NOT NULL,
        language TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        pinned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT,
        meta_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        progress REAL NOT NULL DEFAULT 0,
        plan_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        tool_key TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        diff TEXT,
        risk TEXT NOT NULL,
        status TEXT NOT NULL,
        nonce TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        task_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        mime TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS connectors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        capabilities_json TEXT NOT NULL,
        scopes_json TEXT NOT NULL,
        account_label TEXT,
        icon TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        prompt TEXT NOT NULL,
        cadence TEXT NOT NULL,
        next_run_at TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_run_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `)
  }

  private seed(): void {
    const now = new Date().toISOString()
    if (!this.one<Row>('SELECT id FROM profile LIMIT 1')) {
      this.exec(
        'INSERT INTO profile (id,name,agent_name,avatar,tone,language,created_at) VALUES (?,?,?,?,?,?,?)',
        ['local', '你', '随序', '✦', '清晰、可靠、有一点温度', 'zh-CN', now]
      )
    }
    const connectorCount = this.one<Row>('SELECT id FROM connectors LIMIT 1')
    if (!connectorCount) {
      for (const connector of DEFAULT_CONNECTORS) {
        this.exec(
          `INSERT INTO connectors
           (id,name,description,status,capabilities_json,scopes_json,account_label,icon,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            connector.id,
            connector.name,
            connector.description,
            connector.status,
            JSON.stringify(connector.capabilities),
            JSON.stringify(connector.scopes),
            connector.accountLabel,
            connector.icon,
            connector.updatedAt
          ]
        )
      }
    }
    if (!this.one<Row>('SELECT key FROM settings WHERE key = ?', ['model'])) {
      const model: ModelConfig = {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4.1-mini',
        hasApiKey: false,
        demoMode: true,
        capabilities: DEFAULT_CAPABILITIES,
        lastCheckedAt: null
      }
      this.exec('INSERT INTO settings (key,value) VALUES (?,?)', ['model', JSON.stringify(model)])
    }
    if (!this.one<Row>('SELECT id FROM memories LIMIT 1')) {
      this.exec(
        'INSERT INTO memories (id,content,category,enabled,created_at,updated_at) VALUES (?,?,?,?,?,?)',
        [randomUUID(), '偏好清晰、直接、可执行的建议', '交流偏好', 1, now, now]
      )
    }
    if (!this.getSetting('initialized_at')) {
      this.exec(
        'INSERT INTO activities (id,type,title,detail,task_id,created_at) VALUES (?,?,?,?,?,?)',
        [
          randomUUID(),
          'system',
          '随序已准备好',
          '本地加密存储已启用；填写模型 API 后可开始真实任务。',
          null,
          now
        ]
      )
      this.setSetting('initialized_at', now)
    }
  }

  getProfile(): Profile {
    const row = this.one<Row>('SELECT * FROM profile LIMIT 1')
    return {
      id: String(row?.id ?? 'local'),
      name: String(row?.name ?? '你'),
      agentName: String(row?.agent_name ?? '随序'),
      avatar: String(row?.avatar ?? '✦'),
      tone: String(row?.tone ?? ''),
      language: (row?.language === 'en' ? 'en' : 'zh-CN') as Profile['language'],
      createdAt: String(row?.created_at ?? new Date().toISOString())
    }
  }

  updateProfile(input: Partial<Pick<Profile, 'name' | 'agentName' | 'avatar' | 'tone' | 'language'>>): Profile {
    const current = this.getProfile()
    const next = { ...current, ...input }
    this.exec(
      'UPDATE profile SET name=?,agent_name=?,avatar=?,tone=?,language=? WHERE id=?',
      [next.name, next.agentName, next.avatar, next.tone, next.language, current.id]
    )
    return next
  }

  listThreads(): Thread[] {
    return this.rows<Row>(
      'SELECT * FROM threads ORDER BY pinned DESC, updated_at DESC LIMIT 80'
    ).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      pinned: Number(row.pinned) === 1,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }))
  }

  createThread(title = '新对话'): Thread {
    const now = new Date().toISOString()
    const thread: Thread = {
      id: randomUUID(),
      title: title.slice(0, 80),
      pinned: false,
      createdAt: now,
      updatedAt: now
    }
    this.exec('INSERT INTO threads (id,title,pinned,created_at,updated_at) VALUES (?,?,?,?,?)', [
      thread.id,
      thread.title,
      0,
      now,
      now
    ])
    return thread
  }

  renameThread(id: string, title: string): void {
    this.exec('UPDATE threads SET title=?,updated_at=? WHERE id=?', [
      title.slice(0, 80),
      new Date().toISOString(),
      id
    ])
  }

  listMessages(threadId?: string): ChatMessage[] {
    const rows = threadId
      ? this.rows<Row>('SELECT * FROM messages WHERE thread_id=? ORDER BY created_at ASC', [threadId])
      : this.rows<Row>('SELECT * FROM messages ORDER BY created_at DESC LIMIT 120')
    const messages = rows.map((row) => ({
        id: String(row.id),
        threadId: String(row.thread_id),
        role: String(row.role) as ChatMessage['role'],
        content: String(row.content),
        status: (row.status ? String(row.status) : 'complete') as ChatMessage['status'],
        meta: row.meta_json ? JSON.parse(String(row.meta_json)) : undefined,
        createdAt: String(row.created_at)
      }))
    return threadId ? messages : messages.reverse()
  }

  addMessage(message: Omit<ChatMessage, 'id' | 'createdAt'> & Partial<Pick<ChatMessage, 'id' | 'createdAt'>>): ChatMessage {
    const full: ChatMessage = {
      id: message.id ?? randomUUID(),
      threadId: message.threadId,
      role: message.role,
      content: message.content,
      status: message.status ?? 'complete',
      meta: message.meta,
      createdAt: message.createdAt ?? new Date().toISOString()
    }
    this.exec(
      'INSERT INTO messages (id,thread_id,role,content,status,meta_json,created_at) VALUES (?,?,?,?,?,?,?)',
      [
        full.id,
        full.threadId,
        full.role,
        full.content,
        full.status ?? 'complete',
        full.meta ? JSON.stringify(full.meta) : null,
        full.createdAt
      ]
    )
    this.exec('UPDATE threads SET updated_at=? WHERE id=?', [full.createdAt, full.threadId])
    return full
  }

  updateMessage(id: string, content: string, status: ChatMessage['status'] = 'complete'): void {
    this.exec('UPDATE messages SET content=?,status=? WHERE id=?', [content, status ?? 'complete', id])
  }

  listGoals(): Goal[] {
    return this.rows<Row>('SELECT * FROM goals ORDER BY updated_at DESC').map((row) => ({
      id: String(row.id),
      title: String(row.title),
      description: String(row.description),
      status: String(row.status) as Goal['status'],
      progress: Number(row.progress),
      plan: JSON.parse(String(row.plan_json)),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }))
  }

  createGoal(title: string, description = ''): Goal {
    const now = new Date().toISOString()
    const goal: Goal = {
      id: randomUUID(),
      title,
      description,
      status: 'planning',
      progress: 0,
      plan: [
        { id: randomUUID(), title: '明确目标与完成标准', status: 'pending' },
        { id: randomUUID(), title: '验证可用信息与连接', status: 'pending' },
        { id: randomUUID(), title: '执行并复核结果', status: 'pending' }
      ],
      createdAt: now,
      updatedAt: now
    }
    this.exec(
      'INSERT INTO goals (id,title,description,status,progress,plan_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
      [goal.id, title, description, goal.status, 0, JSON.stringify(goal.plan), now, now]
    )
    this.logActivity('goal', '创建目标', title, goal.id)
    return goal
  }

  updateGoal(id: string, input: Partial<Pick<Goal, 'status' | 'progress' | 'plan'>>): void {
    const current = this.one<Row>('SELECT * FROM goals WHERE id=?', [id])
    if (!current) throw new Error('目标不存在')
    const plan = input.plan ?? JSON.parse(String(current.plan_json))
    this.exec(
      'UPDATE goals SET status=?,progress=?,plan_json=?,updated_at=? WHERE id=?',
      [
        input.status ?? String(current.status),
        input.progress ?? Number(current.progress),
        JSON.stringify(plan),
        new Date().toISOString(),
        id
      ]
    )
  }

  listApprovals(includeResolved = false): Approval[] {
    const sql = includeResolved
      ? 'SELECT * FROM approvals ORDER BY created_at DESC LIMIT 100'
      : "SELECT * FROM approvals WHERE status='pending' ORDER BY created_at DESC"
    return this.rows<Row>(sql).map(this.mapApproval)
  }

  createApproval(input: {
    taskId: string | null
    toolKey: string
    title: string
    summary: string
    payload: Record<string, unknown>
    diff?: string | null
    risk: RiskLevel
  }): Approval {
    const now = new Date()
    const approval: Approval = {
      id: randomUUID(),
      taskId: input.taskId,
      toolKey: input.toolKey,
      title: input.title,
      summary: input.summary,
      payload: input.payload,
      diff: input.diff ?? null,
      risk: input.risk,
      status: 'pending',
      nonce: createNonce(),
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      createdAt: now.toISOString()
    }
    this.exec(
      `INSERT INTO approvals
       (id,task_id,tool_key,title,summary,payload_json,diff,risk,status,nonce,expires_at,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        approval.id,
        approval.taskId,
        approval.toolKey,
        approval.title,
        approval.summary,
        JSON.stringify(approval.payload),
        approval.diff,
        approval.risk,
        approval.status,
        approval.nonce,
        approval.expiresAt,
        approval.createdAt
      ]
    )
    this.logActivity('approval', '等待你的确认', approval.title, approval.taskId)
    return approval
  }

  resolveApproval(id: string, nonce: string, approve: boolean): Approval {
    const row = this.one<Row>('SELECT * FROM approvals WHERE id=?', [id])
    if (!row) throw new Error('审批请求不存在')
    const approval = this.mapApproval(row)
    if (approval.status !== 'pending') throw new Error('审批请求已经处理')
    if (approval.nonce !== nonce) throw new Error('审批校验失败，请刷新后重试')
    if (new Date(approval.expiresAt).getTime() < Date.now()) {
      this.exec("UPDATE approvals SET status='expired' WHERE id=?", [id])
      throw new Error('审批请求已过期')
    }
    const status = approve ? 'approved' : 'rejected'
    this.exec('UPDATE approvals SET status=? WHERE id=?', [status, id])
    this.logActivity('approval', approve ? '你批准了操作' : '你拒绝了操作', approval.title, approval.taskId)
    return { ...approval, status }
  }

  private mapApproval = (row: Row): Approval => ({
    id: String(row.id),
    taskId: row.task_id ? String(row.task_id) : null,
    toolKey: String(row.tool_key),
    title: String(row.title),
    summary: String(row.summary),
    payload: JSON.parse(String(row.payload_json)),
    diff: row.diff ? String(row.diff) : null,
    risk: String(row.risk) as RiskLevel,
    status: String(row.status) as Approval['status'],
    nonce: String(row.nonce),
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at)
  })

  listActivities(limit = 100): Activity[] {
    return this.rows<Row>('SELECT * FROM activities ORDER BY created_at DESC LIMIT ?', [limit]).map(
      (row) => ({
        id: String(row.id),
        type: String(row.type),
        title: String(row.title),
        detail: String(row.detail),
        taskId: row.task_id ? String(row.task_id) : null,
        createdAt: String(row.created_at)
      })
    )
  }

  logActivity(type: string, title: string, detail: string, taskId: string | null = null): Activity {
    const activity: Activity = {
      id: randomUUID(),
      type,
      title,
      detail,
      taskId,
      createdAt: new Date().toISOString()
    }
    this.exec(
      'INSERT INTO activities (id,type,title,detail,task_id,created_at) VALUES (?,?,?,?,?,?)',
      [activity.id, type, title, detail, taskId, activity.createdAt]
    )
    return activity
  }

  listMemories(): Memory[] {
    return this.rows<Row>('SELECT * FROM memories ORDER BY updated_at DESC').map((row) => ({
      id: String(row.id),
      content: String(row.content),
      category: String(row.category),
      enabled: Number(row.enabled) === 1,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }))
  }

  saveMemory(input: { id?: string; content: string; category?: string; enabled?: boolean }): Memory {
    const now = new Date().toISOString()
    if (input.id) {
      this.exec('UPDATE memories SET content=?,category=?,enabled=?,updated_at=? WHERE id=?', [
        input.content,
        input.category ?? '关于你',
        input.enabled === false ? 0 : 1,
        now,
        input.id
      ])
      return this.listMemories().find((item) => item.id === input.id) as Memory
    }
    const memory: Memory = {
      id: randomUUID(),
      content: input.content,
      category: input.category ?? '关于你',
      enabled: input.enabled !== false,
      createdAt: now,
      updatedAt: now
    }
    this.exec(
      'INSERT INTO memories (id,content,category,enabled,created_at,updated_at) VALUES (?,?,?,?,?,?)',
      [memory.id, memory.content, memory.category, memory.enabled ? 1 : 0, now, now]
    )
    this.logActivity('memory', '更新了记忆', memory.content)
    return memory
  }

  deleteMemory(id: string): void {
    this.exec('DELETE FROM memories WHERE id=?', [id])
    this.logActivity('memory', '删除了一条记忆', '你可以要求随序不再使用此信息。')
  }

  listArtifacts(): Artifact[] {
    return this.rows<Row>('SELECT * FROM artifacts ORDER BY created_at DESC').map((row) => ({
      id: String(row.id),
      taskId: row.task_id ? String(row.task_id) : null,
      name: String(row.name),
      path: String(row.path),
      mime: String(row.mime),
      size: Number(row.size),
      createdAt: String(row.created_at)
    }))
  }

  addArtifact(input: Omit<Artifact, 'id' | 'createdAt'>): Artifact {
    const artifact: Artifact = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    }
    this.exec(
      'INSERT INTO artifacts (id,task_id,name,path,mime,size,created_at) VALUES (?,?,?,?,?,?,?)',
      [
        artifact.id,
        artifact.taskId,
        artifact.name,
        artifact.path,
        artifact.mime,
        artifact.size,
        artifact.createdAt
      ]
    )
    this.logActivity('artifact', '创建了产物', artifact.name, artifact.taskId)
    return artifact
  }

  listConnectors(): Connector[] {
    return this.rows<Row>('SELECT * FROM connectors ORDER BY name ASC').map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: String(row.description),
      status: String(row.status) as Connector['status'],
      capabilities: JSON.parse(String(row.capabilities_json)),
      scopes: JSON.parse(String(row.scopes_json)),
      accountLabel: row.account_label ? String(row.account_label) : null,
      icon: String(row.icon),
      updatedAt: String(row.updated_at)
    }))
  }

  updateConnector(id: string, status: Connector['status'], accountLabel: string | null): Connector {
    this.exec('UPDATE connectors SET status=?,account_label=?,updated_at=? WHERE id=?', [
      status,
      accountLabel,
      new Date().toISOString(),
      id
    ])
    const connector = this.listConnectors().find((item) => item.id === id)
    if (!connector) throw new Error('连接器不存在')
    this.logActivity('connector', `连接已更新：${connector.name}`, status)
    return connector
  }

  listScheduledTasks(): ScheduledTask[] {
    return this.rows<Row>('SELECT * FROM scheduled_tasks ORDER BY created_at DESC').map((row) => ({
      id: String(row.id),
      title: String(row.title),
      prompt: String(row.prompt),
      cadence: String(row.cadence),
      nextRunAt: row.next_run_at ? String(row.next_run_at) : null,
      enabled: Number(row.enabled) === 1,
      lastRunAt: row.last_run_at ? String(row.last_run_at) : null,
      createdAt: String(row.created_at)
    }))
  }

  createScheduledTask(input: {
    title: string
    prompt: string
    cadence: string
    nextRunAt?: string | null
  }): ScheduledTask {
    const task: ScheduledTask = {
      id: randomUUID(),
      title: input.title,
      prompt: input.prompt,
      cadence: input.cadence,
      nextRunAt: input.nextRunAt ?? null,
      enabled: true,
      lastRunAt: null,
      createdAt: new Date().toISOString()
    }
    this.exec(
      'INSERT INTO scheduled_tasks (id,title,prompt,cadence,next_run_at,enabled,last_run_at,created_at) VALUES (?,?,?,?,?,?,?,?)',
      [task.id, task.title, task.prompt, task.cadence, task.nextRunAt, 1, null, task.createdAt]
    )
    this.logActivity('schedule', '创建了定时任务', task.title, task.id)
    return task
  }

  setScheduledTaskEnabled(id: string, enabled: boolean): void {
    this.exec('UPDATE scheduled_tasks SET enabled=? WHERE id=?', [enabled ? 1 : 0, id])
  }

  getModelConfig(): ModelConfig {
    const row = this.one<Row>('SELECT value FROM settings WHERE key=?', ['model'])
    if (!row) throw new Error('模型配置不存在')
    return JSON.parse(String(row.value)) as ModelConfig
  }

  saveModelConfig(input: Omit<ModelConfig, 'hasApiKey'> & { hasApiKey: boolean }): ModelConfig {
    this.exec('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)', [
      'model',
      JSON.stringify(input)
    ])
    return input
  }

  setSetting(key: string, value: string): void {
    this.exec('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)', [key, value])
  }

  getSetting(key: string): string | null {
    const row = this.one<Row>('SELECT value FROM settings WHERE key=?', [key])
    return row ? String(row.value) : null
  }

  buildBootstrap() {
    return {
      profile: this.getProfile(),
      threads: this.listThreads(),
      messages: this.listMessages(),
      goals: this.listGoals(),
      approvals: this.listApprovals(),
      activities: this.listActivities(),
      memories: this.listMemories(),
      artifacts: this.listArtifacts(),
      connectors: this.listConnectors(),
      scheduledTasks: this.listScheduledTasks(),
      ideas: SEED_IDEAS,
      model: this.getModelConfig()
    }
  }
}
