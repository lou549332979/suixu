import { contextBridge, ipcRenderer } from 'electron'
import type {
  AgentEvent,
  ApprovalResolution,
  ChatSendInput,
  Connector,
  Goal,
  Memory,
  ModelConfig,
  Profile
} from '../shared/types'

const api = {
  bootstrap: () => ipcRenderer.invoke('app:bootstrap'),
  createThread: (title?: string) => ipcRenderer.invoke('thread:create', title),
  renameThread: (id: string, title: string) =>
    ipcRenderer.invoke('thread:rename', id, title),
  getMessages: (threadId: string) => ipcRenderer.invoke('thread:messages', threadId),
  sendMessage: (input: ChatSendInput) => ipcRenderer.invoke('chat:send', input),
  cancelRun: (threadId: string) => ipcRenderer.invoke('chat:cancel', threadId),
  listApprovals: () => ipcRenderer.invoke('approvals:list'),
  resolveApproval: (input: ApprovalResolution) =>
    ipcRenderer.invoke('approvals:resolve', input),
  listGoals: () => ipcRenderer.invoke('goals:list'),
  createGoal: (title: string, description?: string) =>
    ipcRenderer.invoke('goals:create', title, description),
  updateGoal: (
    id: string,
    input: Partial<Pick<Goal, 'status' | 'progress' | 'plan'>>
  ) => ipcRenderer.invoke('goals:update', id, input),
  saveMemory: (input: Partial<Memory> & { content: string }) =>
    ipcRenderer.invoke('memories:save', input),
  deleteMemory: (id: string) => ipcRenderer.invoke('memories:delete', id),
  updateConnector: (
    id: string,
    status: Connector['status'],
    accountLabel?: string | null
  ) => ipcRenderer.invoke('connectors:update', id, status, accountLabel),
  listActivities: (limit?: number) => ipcRenderer.invoke('activities:list', limit),
  listArtifacts: () => ipcRenderer.invoke('artifacts:list'),
  openArtifact: (id: string) => ipcRenderer.invoke('artifacts:open', id),
  revealArtifact: (id: string) => ipcRenderer.invoke('artifacts:reveal', id),
  updateProfile: (input: Partial<Profile>) =>
    ipcRenderer.invoke('profile:update', input),
  saveModel: (
    input: Pick<ModelConfig, 'baseUrl' | 'model' | 'demoMode'> & { apiKey?: string }
  ) => ipcRenderer.invoke('model:save', input),
  probeModel: () => ipcRenderer.invoke('model:probe'),
  clearModelKey: () => ipcRenderer.invoke('model:clear-key'),
  pickFiles: () => ipcRenderer.invoke('files:pick'),
  pickFolder: () => ipcRenderer.invoke('files:pickFolder'),
  transcribe: (data: Uint8Array, mime: string) =>
    ipcRenderer.invoke('voice:transcribe', { data, mime }),
  speak: (text: string) => ipcRenderer.invoke('voice:speak', text),
  toggleScheduledTask: (id: string, enabled: boolean) =>
    ipcRenderer.invoke('schedule:toggle', id, enabled),
  getVersion: () => ipcRenderer.invoke('app:version'),
  showWindow: () => ipcRenderer.invoke('app:show-window'),
  openDataFolder: () => ipcRenderer.invoke('app:open-data-folder'),
  onAgentEvent: (callback: (event: AgentEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: AgentEvent) => callback(data)
    ipcRenderer.on('agent:event', handler)
    return () => ipcRenderer.removeListener('agent:event', handler)
  },
  onNewChat: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('ui:new-chat', handler)
    return () => ipcRenderer.removeListener('ui:new-chat', handler)
  }
}

contextBridge.exposeInMainWorld('suixu', api)

export type SuixuApi = typeof api
