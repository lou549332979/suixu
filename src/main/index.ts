import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, powerSaveBlocker, session, shell, Tray } from 'electron'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SuixuDatabase } from './database'
import { CredentialStore } from './credentials'
import { AgentService } from './agent'
import { probeProvider, synthesizeSpeech, transcribeAudio } from './provider'
import type {
  AgentEvent,
  ApprovalResolution,
  ChatSendInput,
  ModelConfig,
  Profile
} from '../shared/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let database: SuixuDatabase
let credentials: CredentialStore
let agent: AgentService
let quitting = false
let scheduler: NodeJS.Timeout | null = null
let powerBlockerId: number | null = null

function sendAgentEvent(event: AgentEvent): void {
  mainWindow?.webContents.send('agent:event', event)
  if (event.type === 'approval') {
    if (!Notification.isSupported()) return
    new Notification({
      title: '随序需要你的确认',
      body: event.approval.title,
      silent: false
    })
      .on('click', () => showWindow())
      .show()
  }
  if (event.type === 'run') {
    const running = event.status === 'running' || event.status === 'planning'
    if (running && powerBlockerId === null) {
      powerBlockerId = powerSaveBlocker.start('prevent-app-suspension')
    } else if (!running && powerBlockerId !== null) {
      powerSaveBlocker.stop(powerBlockerId)
      powerBlockerId = null
    }
    tray?.setToolTip(`随序 · ${event.label}`)
  }
}

function resolveWasmPath(): string {
  const sqlJsEntry = require.resolve('sql.js')
  return join(dirname(sqlJsEntry), 'sql-wasm.wasm')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1060,
    minHeight: 700,
    show: false,
    title: '随序',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: '#f6f8fc',
    vibrancy: 'under-window',
    visualEffectState: 'followWindow',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', (event) => {
    if (!quitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env.ELECTRON_RENDERER_URL
    if ((devUrl && url.startsWith(devUrl)) || url.startsWith('file://')) return
    event.preventDefault()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function showWindow(): void {
  if (!mainWindow) createWindow()
  mainWindow?.show()
  mainWindow?.focus()
}

function createTray(): void {
  const trayIconPath = app.isPackaged
    ? join(process.resourcesPath, 'trayTemplate.png')
    : join(__dirname, '../../build/trayTemplate.png')
  let icon = nativeImage.createEmpty()
  if (existsSync(trayIconPath)) {
    icon = nativeImage.createFromPath(trayIconPath)
    icon.setTemplateImage(true)
  }
  tray = new Tray(icon)
  tray.setToolTip('随序 · 本地个人 AI Agent')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '打开随序',
        click: showWindow
      },
      {
        label: '新建任务',
        click: () => {
          showWindow()
          mainWindow?.webContents.send('ui:new-chat')
        }
      },
      { type: 'separator' },
      {
        label: '在后台继续运行',
        enabled: false
      },
      {
        label: '退出随序',
        click: () => {
          quitting = true
          app.quit()
        }
      }
    ])
  )
  tray.on('double-click', showWindow)
}

function startScheduler(): void {
  if (scheduler) clearInterval(scheduler)
  scheduler = setInterval(() => {
    const now = Date.now()
    for (const task of database.listScheduledTasks()) {
      if (!task.enabled || !task.nextRunAt || new Date(task.nextRunAt).getTime() > now) continue
      if (!mainWindow) createWindow()
      agent.send({ text: task.prompt })
      database.logActivity('schedule', '定时任务已启动', task.title, task.id)
    }
  }, 60_000)
}

function registerIpc(): void {
  ipcMain.handle('app:bootstrap', () => database.buildBootstrap())
  ipcMain.handle('thread:create', (_event, title?: string) => database.createThread(title))
  ipcMain.handle('thread:rename', (_event, id: string, title: string) =>
    database.renameThread(id, title)
  )
  ipcMain.handle('thread:messages', (_event, threadId: string) =>
    database.listMessages(threadId)
  )
  ipcMain.handle('chat:send', (_event, input: ChatSendInput) => agent.send(input))
  ipcMain.handle('chat:cancel', (_event, threadId: string) => agent.cancel(threadId))
  ipcMain.handle('approvals:list', () => database.listApprovals(true))
  ipcMain.handle('approvals:resolve', (_event, input: ApprovalResolution) =>
    agent.resolveApproval(input.approvalId, input.nonce, input.decision)
  )
  ipcMain.handle('goals:list', () => database.listGoals())
  ipcMain.handle('goals:create', (_event, title: string, description?: string) =>
    database.createGoal(title, description)
  )
  ipcMain.handle('goals:update', (_event, id: string, input) => database.updateGoal(id, input))
  ipcMain.handle('memories:save', (_event, input) => database.saveMemory(input))
  ipcMain.handle('memories:delete', (_event, id: string) => database.deleteMemory(id))
  ipcMain.handle('connectors:update', (_event, id: string, status, accountLabel) =>
    database.updateConnector(id, status, accountLabel)
  )
  ipcMain.handle('activities:list', (_event, limit?: number) =>
    database.listActivities(limit)
  )
  ipcMain.handle('artifacts:list', () => database.listArtifacts())
  ipcMain.handle('artifacts:open', async (_event, id: string) => {
    const artifact = database.listArtifacts().find((item) => item.id === id)
    if (!artifact || !existsSync(artifact.path)) throw new Error('产物文件不存在')
    await shell.openPath(artifact.path)
  })
  ipcMain.handle('artifacts:reveal', (_event, id: string) => {
    const artifact = database.listArtifacts().find((item) => item.id === id)
    if (!artifact || !existsSync(artifact.path)) throw new Error('产物文件不存在')
    shell.showItemInFolder(artifact.path)
  })
  ipcMain.handle('profile:update', (_event, input: Partial<Profile>) =>
    database.updateProfile(input)
  )
  ipcMain.handle(
    'model:save',
    (
      _event,
      input: Pick<ModelConfig, 'baseUrl' | 'model' | 'demoMode'> & { apiKey?: string }
    ) => {
      if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
        credentials.setApiKey(input.apiKey.trim())
      }
      const current = database.getModelConfig()
      return database.saveModelConfig({
        ...current,
        baseUrl: input.baseUrl,
        model: input.model,
        demoMode: input.demoMode,
        hasApiKey: Boolean(credentials.getApiKey())
      })
    }
  )
  ipcMain.handle('model:clear-key', () => {
    credentials.clearApiKey()
    const current = database.getModelConfig()
    return database.saveModelConfig({
      ...current,
      hasApiKey: false,
      demoMode: true
    })
  })
  ipcMain.handle('model:probe', async () => {
    const config = database.getModelConfig()
    const result = await probeProvider(config, credentials.getApiKey())
    if (result.ok) {
      database.saveModelConfig({
        ...config,
        hasApiKey: true,
        demoMode: false,
        capabilities: result.capabilities,
        lastCheckedAt: new Date().toISOString()
      })
    }
    return result
  })
  ipcMain.handle('files:pick', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '随序支持的文件', extensions: ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'txt', 'md', 'csv', 'json', 'xml', 'docx', 'xlsx'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    if (result.canceled) return []
    const mimes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml'
    }
    return result.filePaths
      .map((path) => ({
        name: path.split('/').at(-1) ?? 'attachment',
        path,
        mime: mimes[path.slice(path.lastIndexOf('.')).toLowerCase()] ?? 'application/octet-stream',
        size: statSync(path).size
      }))
      .filter((file) => file.size <= 25 * 1024 * 1024)
  })
  ipcMain.handle('files:pickFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
      message: '选择一个随序可以读取的文件夹'
    })
    if (result.canceled || !result.filePaths[0]) return null
    database.setSetting('approved_folder', result.filePaths[0])
    database.updateConnector('files', 'connected', result.filePaths[0])
    return result.filePaths[0]
  })
  ipcMain.handle('voice:transcribe', async (_event, input: { data: Uint8Array; mime: string }) => {
    const config = database.getModelConfig()
    return transcribeAudio(
      config,
      credentials.getApiKey(),
      new Uint8Array(input.data),
      input.mime
    )
  })
  ipcMain.handle('voice:speak', async (_event, text: string) => {
    const config = database.getModelConfig()
    const audio = await synthesizeSpeech(config, credentials.getApiKey(), text)
    return audio
  })
  ipcMain.handle('schedule:toggle', (_event, id: string, enabled: boolean) => {
    database.setScheduledTaskEnabled(id, enabled)
  })
  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:show-window', () => showWindow())
  ipcMain.handle('app:open-data-folder', () => shell.openPath(database.workspace))
}

app.whenReady().then(async () => {
  const dataDirectory = join(app.getPath('userData'), 'suixu-data')
  credentials = new CredentialStore(dataDirectory)
  database = new SuixuDatabase({
    dataDirectory,
    wasmPath: resolveWasmPath(),
    encrypt: (value) => credentials.encrypt(value),
    decrypt: (value) => credentials.decrypt(value)
  })
  await database.initialize()
  agent = new AgentService({
    db: database,
    credentials,
    dataDirectory,
    emit: sendAgentEvent
  })

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media' || permission === 'notifications')
  })

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: '随序',
        submenu: [
          { role: 'about', label: '关于随序' },
          { type: 'separator' },
          { role: 'hide', label: '隐藏随序' },
          { role: 'hideOthers', label: '隐藏其他' },
          { type: 'separator' },
          {
            label: '退出随序',
            accelerator: 'Command+Q',
            click: () => {
              quitting = true
              app.quit()
            }
          }
        ]
      },
      { role: 'editMenu', label: '编辑' },
      {
        label: '显示',
        submenu: [
          { role: 'reload', label: '重新载入' },
          { role: 'toggleDevTools', label: '开发者工具' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' }
        ]
      },
      { role: 'windowMenu', label: '窗口' },
      {
        role: 'help',
        label: '帮助',
        submenu: [
          {
            label: '查看数据目录',
            click: () => void shell.openPath(database.workspace)
          }
        ]
      }
    ])
  )

  registerIpc()
  createWindow()
  createTray()
  startScheduler()

  app.on('activate', showWindow)
})

app.on('before-quit', () => {
  quitting = true
  database?.persistNow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
