import { create } from 'zustand'
import type {
  Activity,
  AgentEvent,
  AppSection,
  Approval,
  Artifact,
  BootstrapData,
  ChatMessage,
  ChatSendInput,
  Connector,
  Goal,
  Memory,
  ModelConfig,
  Profile,
  RunStatus,
  Thread
} from '../../shared/types'

interface AppState {
  loading: boolean
  data: BootstrapData | null
  section: AppSection
  activeThreadId: string | null
  messages: ChatMessage[]
  runStatus: RunStatus | null
  runLabel: string
  error: string | null
  mobileSidebarOpen: boolean
  initialize: () => Promise<void>
  setSection: (section: AppSection) => void
  selectThread: (threadId: string) => Promise<void>
  newChat: () => void
  send: (input: ChatSendInput) => Promise<void>
  cancel: () => Promise<void>
  handleAgentEvent: (event: AgentEvent) => void
  refresh: () => Promise<void>
  resolveApproval: (approval: Approval, decision: 'approve' | 'reject') => Promise<void>
  createGoal: (title: string, description?: string) => Promise<void>
  saveMemory: (content: string, category?: string) => Promise<void>
  deleteMemory: (id: string) => Promise<void>
  updateConnector: (id: string, status: Connector['status'], label?: string | null) => Promise<void>
  updateProfile: (input: Partial<Profile>) => Promise<void>
  saveModel: (
    input: Pick<ModelConfig, 'baseUrl' | 'model' | 'demoMode'> & { apiKey?: string }
  ) => Promise<void>
  setMobileSidebar: (open: boolean) => void
}

async function loadThreadMessages(threadId: string): Promise<ChatMessage[]> {
  return window.suixu.getMessages(threadId)
}

export const useAppStore = create<AppState>((set, get) => ({
  loading: true,
  data: null,
  section: 'home',
  activeThreadId: null,
  messages: [],
  runStatus: null,
  runLabel: '',
  error: null,
  mobileSidebarOpen: false,

  async initialize() {
    try {
      const data: BootstrapData = await window.suixu.bootstrap()
      const firstThread = data.threads[0]?.id ?? null
      set({
        data,
        loading: false,
        activeThreadId: firstThread,
        messages: firstThread ? await loadThreadMessages(firstThread) : []
      })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  },

  setSection(section) {
    set({ section, mobileSidebarOpen: false })
    if (section === 'home' && !get().activeThreadId && get().data?.threads[0]) {
      void get().selectThread(get().data!.threads[0]!.id)
    }
  },

  async selectThread(threadId) {
    set({ activeThreadId: threadId, section: 'home', runStatus: null, runLabel: '' })
    try {
      set({ messages: await loadThreadMessages(threadId) })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) })
    }
  },

  newChat() {
    set({
      section: 'home',
      activeThreadId: null,
      messages: [],
      runStatus: null,
      runLabel: '',
      mobileSidebarOpen: false
    })
  },

  async send(input) {
    set({ error: null, section: 'home' })
    try {
      await window.suixu.sendMessage({
        ...input,
        threadId: get().activeThreadId ?? undefined
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) })
    }
  },

  async cancel() {
    const id = get().activeThreadId
    if (id) await window.suixu.cancelRun(id)
  },

  handleAgentEvent(event) {
    const current = get()
    switch (event.type) {
      case 'run':
        set({ runStatus: event.status, runLabel: event.label })
        break
      case 'message': {
        let threadId = current.activeThreadId
        if (
          !threadId &&
          event.message.role === 'user' &&
          event.message.threadId
        ) {
          threadId = event.message.threadId
        }
        const belongsToCurrent =
          !current.activeThreadId ||
          event.message.threadId === current.activeThreadId ||
          event.message.role === 'user'
        if (!belongsToCurrent) break
        const existingIndex = current.messages.findIndex(
          (message) => message.id === event.message.id
        )
        const nextMessages =
          existingIndex >= 0
            ? current.messages.map((message, index) =>
                index === existingIndex ? event.message : message
              )
            : [...current.messages, event.message]
        const threads = current.data?.threads ?? []
        const knownThread = threads.some((thread) => thread.id === event.message.threadId)
        const nextThreads =
          !knownThread && event.message.role === 'user'
            ? [
                {
                  id: event.message.threadId,
                  title: event.message.content.slice(0, 26),
                  pinned: false,
                  createdAt: event.message.createdAt,
                  updatedAt: event.message.createdAt
                },
                ...threads
              ]
            : threads
        set({
          activeThreadId: threadId,
          messages: nextMessages,
          data: current.data ? { ...current.data, threads: nextThreads } : current.data
        })
        break
      }
      case 'delta': {
        if (event.threadId !== get().activeThreadId) break
        const messages = get().messages
        const index = messages.findIndex((message) => message.id === event.messageId)
        if (index < 0) {
          const firstUser = messages.find((message) => message.role === 'user')
          set({
            messages: [
              ...messages,
              {
                id: event.messageId,
                threadId: event.threadId,
                role: 'assistant',
                content: event.delta,
                status: 'streaming',
                createdAt: new Date().toISOString()
              }
            ]
          })
          if (!firstUser) get().refresh()
        } else {
          set({
            messages: messages.map((message, messageIndex) =>
              messageIndex === index
                ? {
                    ...message,
                    content: message.content + event.delta,
                    status: 'streaming'
                  }
                : message
            )
          })
        }
        break
      }
      case 'approval': {
        const data = get().data
        if (!data) break
        set({
          data: {
            ...data,
            approvals: [
              event.approval,
              ...data.approvals.filter((item) => item.id !== event.approval.id)
            ]
          }
        })
        break
      }
      case 'activity': {
        const data = get().data
        if (!data) break
        set({
          data: {
            ...data,
            activities: [
              event.activity,
              ...data.activities.filter((item) => item.id !== event.activity.id)
            ]
          }
        })
        break
      }
      case 'error':
        set({ error: event.message })
        break
      case 'done':
        void get().refresh()
        break
    }
  },

  async refresh() {
    try {
      const data: BootstrapData = await window.suixu.bootstrap()
      const activeThreadId =
        get().activeThreadId && data.threads.some((thread) => thread.id === get().activeThreadId)
          ? get().activeThreadId
          : data.threads[0]?.id ?? null
      set({
        data,
        activeThreadId,
        messages: activeThreadId
          ? await loadThreadMessages(activeThreadId)
          : get().messages
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) })
    }
  },

  async resolveApproval(approval, decision) {
    try {
      await window.suixu.resolveApproval({
        approvalId: approval.id,
        nonce: approval.nonce,
        decision
      })
      const data = get().data
      if (data) {
        set({
          data: {
            ...data,
            approvals: data.approvals.map((item) =>
              item.id === approval.id
                ? {
                    ...item,
                    status: decision === 'approve' ? 'approved' : 'rejected'
                  }
                : item
            )
          }
        })
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) })
    }
  },

  async createGoal(title, description) {
    const goal = await window.suixu.createGoal(title, description)
    const data = get().data
    if (data) set({ data: { ...data, goals: [goal, ...data.goals] } })
  },

  async saveMemory(content, category) {
    const memory = await window.suixu.saveMemory({ content, category })
    const data = get().data
    if (data) {
      set({
        data: {
          ...data,
          memories: [memory, ...data.memories.filter((item) => item.id !== memory.id)]
        }
      })
    }
  },

  async deleteMemory(id) {
    await window.suixu.deleteMemory(id)
    const data = get().data
    if (data) {
      set({ data: { ...data, memories: data.memories.filter((item) => item.id !== id) } })
    }
  },

  async updateConnector(id, status, label = null) {
    const connector = await window.suixu.updateConnector(id, status, label)
    const data = get().data
    if (data) {
      set({
        data: {
          ...data,
          connectors: data.connectors.map((item) =>
            item.id === id ? connector : item
          )
        }
      })
    }
  },

  async updateProfile(input) {
    const profile = await window.suixu.updateProfile(input)
    const data = get().data
    if (data) set({ data: { ...data, profile } })
  },

  async saveModel(input) {
    const model = await window.suixu.saveModel(input)
    const data = get().data
    if (data) set({ data: { ...data, model } })
  },

  setMobileSidebar(open) {
    set({ mobileSidebarOpen: open })
  }
}))
