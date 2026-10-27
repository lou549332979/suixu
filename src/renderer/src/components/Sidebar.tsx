import { useMemo, useState } from 'react'
import { BrandMark } from './BrandMark'
import { Icon } from './Icon'
import { useAppStore } from '../store'
import type { AppSection } from '../../../shared/types'

const navigation: Array<{ id: AppSection; label: string; icon: string }> = [
  { id: 'home', label: '首页', icon: 'home' },
  { id: 'ideas', label: '灵感', icon: 'sparkles' },
  { id: 'goals', label: '目标与任务', icon: 'target' },
  { id: 'library', label: '资料库', icon: 'library' },
  { id: 'connections', label: '连接', icon: 'zap' },
  { id: 'activity', label: '活动记录', icon: 'activity' }
]

export function Sidebar() {
  const [query, setQuery] = useState('')
  const data = useAppStore((state) => state.data)
  const section = useAppStore((state) => state.section)
  const activeThreadId = useAppStore((state) => state.activeThreadId)
  const setSection = useAppStore((state) => state.setSection)
  const selectThread = useAppStore((state) => state.selectThread)
  const newChat = useAppStore((state) => state.newChat)
  const mobileOpen = useAppStore((state) => state.mobileSidebarOpen)
  const setMobileSidebar = useAppStore((state) => state.setMobileSidebar)

  const threads = useMemo(() => {
    const items = data?.threads ?? []
    if (!query.trim()) return items.slice(0, 8)
    return items.filter((thread) =>
      thread.title.toLowerCase().includes(query.trim().toLowerCase())
    )
  }, [data?.threads, query])

  return (
    <>
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          aria-label="关闭导航"
          onClick={() => setMobileSidebar(false)}
        />
      )}
      <aside className={`sidebar${mobileOpen ? ' is-open' : ''}`}>
        <div className="sidebar-top" data-electron-drag>
          <div className="brand-lockup">
            <BrandMark size="small" />
            <div>
              <strong>随序</strong>
              <span>Personal agent</span>
            </div>
          </div>
          <button className="icon-button sidebar-mobile-close" onClick={() => setMobileSidebar(false)}>
            <Icon name="x" />
          </button>
        </div>

        <button className="new-task-button" onClick={newChat}>
          <Icon name="plus" size={17} />
          <span>开始新任务</span>
          <kbd>⌘ N</kbd>
        </button>

        <nav className="main-nav" aria-label="主导航">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? 'active' : ''}
              onClick={() => setSection(item.id)}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.id === 'activity' && Boolean(data?.approvals.length) && (
                <span className="nav-badge">{data?.approvals.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <div className="thread-heading">
          <span>最近</span>
          <button aria-label="搜索对话" onClick={() => document.getElementById('thread-search')?.focus()}>
            <Icon name="search" size={15} />
          </button>
        </div>
        <label className="thread-search">
          <Icon name="search" size={14} />
          <input
            id="thread-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索对话"
          />
        </label>
        <div className="thread-list">
          {threads.length === 0 ? (
            <p className="thread-empty">对话会出现在这里</p>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                className={activeThreadId === thread.id && section === 'home' ? 'active' : ''}
                onClick={() => void selectThread(thread.id)}
              >
                <span>{thread.title || '未命名任务'}</span>
                <Icon name="chevronRight" size={13} />
              </button>
            ))
          )}
        </div>

        <div className="sidebar-bottom">
          <button
            className={`sidebar-settings ${section === 'settings' ? 'active' : ''}`}
            onClick={() => setSection('settings')}
          >
            <span className="avatar">{data?.profile.avatar || '我'}</span>
            <span>
              <strong>{data?.profile.name || '你'}</strong>
              <small>{data?.profile.agentName || '随序'} · 本地模式</small>
            </span>
            <Icon name="settings" size={16} />
          </button>
        </div>
      </aside>
    </>
  )
}
