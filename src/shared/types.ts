export type AppSection =
  | 'home'
  | 'ideas'
  | 'goals'
  | 'library'
  | 'connections'
  | 'activity'
  | 'settings'

export type RunStatus =
  | 'queued'
  | 'planning'
  | 'running'
  | 'awaiting_approval'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type RiskLevel = 'read' | 'workspace_write' | 'external_write' | 'destructive' | 'financial'

export interface Profile {
  id: string
  name: string
  agentName: string
  avatar: string
  tone: string
  language: 'zh-CN' | 'en'
  createdAt: string
}

export interface Thread {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  pinned: boolean
}

export interface ChatMessage {
  id: string
  threadId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  createdAt: string
  status?: 'streaming' | 'complete' | 'error'
  meta?: Record<string, unknown>
}

export interface Goal {
  id: string
  title: string
  description: string
  status: RunStatus
  progress: number
  plan: GoalStep[]
  createdAt: string
  updatedAt: string
}

export interface GoalStep {
  id: string
  title: string
  status: 'pending' | 'running' | 'done' | 'blocked' | 'failed'
  note?: string
}

export interface Approval {
  id: string
  taskId: string | null
  toolKey: string
  title: string
  summary: string
  payload: Record<string, unknown>
  diff: string | null
  risk: RiskLevel
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  nonce: string
  expiresAt: string
  createdAt: string
}

export interface Activity {
  id: string
  type: string
  title: string
  detail: string
  taskId: string | null
  createdAt: string
}

export interface Memory {
  id: string
  content: string
  category: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface Artifact {
  id: string
  taskId: string | null
  name: string
  path: string
  mime: string
  size: number
  createdAt: string
}

export interface Connector {
  id: string
  name: string
  description: string
  status: 'connected' | 'available' | 'needs_setup' | 'error'
  capabilities: string[]
  scopes: string[]
  accountLabel: string | null
  icon: string
  updatedAt: string
}

export interface ScheduledTask {
  id: string
  title: string
  prompt: string
  cadence: string
  nextRunAt: string | null
  enabled: boolean
  lastRunAt: string | null
  createdAt: string
}

export interface Idea {
  id: string
  eyebrow: string
  title: string
  description: string
  prompt: string
  accent: string
  icon: string
}

export interface ModelConfig {
  baseUrl: string
  model: string
  hasApiKey: boolean
  demoMode: boolean
  capabilities: ModelCapabilities
  lastCheckedAt: string | null
}

export interface ModelCapabilities {
  text: boolean
  tools: boolean
  vision: boolean
  transcription: boolean
  speech: boolean
  imageGeneration: boolean
}

export interface BootstrapData {
  profile: Profile
  threads: Thread[]
  messages: ChatMessage[]
  goals: Goal[]
  approvals: Approval[]
  activities: Activity[]
  memories: Memory[]
  artifacts: Artifact[]
  connectors: Connector[]
  scheduledTasks: ScheduledTask[]
  ideas: Idea[]
  model: ModelConfig
}

export type AgentEvent =
  | { type: 'run'; status: RunStatus; taskId?: string; label: string }
  | { type: 'delta'; threadId: string; messageId: string; delta: string }
  | { type: 'message'; message: ChatMessage }
  | {
      type: 'approval'
      approval: Approval
    }
  | { type: 'activity'; activity: Activity }
  | { type: 'error'; message: string }
  | { type: 'done'; threadId: string }

export interface ChatSendInput {
  threadId?: string
  text: string
  attachments?: Array<{ name: string; path: string; mime: string; size: number }>
}

export interface ToolDefinition {
  key: string
  name: string
  description: string
  risk: RiskLevel
  inputSchema: Record<string, unknown>
}

export interface ToolResult {
  ok: boolean
  summary: string
  data?: unknown
  artifactPath?: string
}

export interface PendingToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  risk: RiskLevel
  approvalId?: string
}

export interface ApprovalResolution {
  approvalId: string
  decision: 'approve' | 'reject'
  nonce: string
}

export interface ProviderProbeResult {
  ok: boolean
  message: string
  capabilities: ModelCapabilities
  models?: string[]
}

export interface VoiceInput {
  data: ArrayBuffer
  mime: string
  language?: string
}
