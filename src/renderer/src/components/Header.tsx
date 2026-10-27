import { Icon } from './Icon'
import { useAppStore } from '../store'

export function Header() {
  const section = useAppStore((state) => state.section)
  const runStatus = useAppStore((state) => state.runStatus)
  const runLabel = useAppStore((state) => state.runLabel)
  const setMobileSidebar = useAppStore((state) => state.setMobileSidebar)
  const activeThreadId = useAppStore((state) => state.activeThreadId)
  const threads = useAppStore((state) => state.data?.threads ?? [])
  const activeTitle = threads.find((thread) => thread.id === activeThreadId)?.title

  const titles: Record<string, string> = {
    home: activeTitle || '首页',
    ideas: '灵感',
    goals: '目标与任务',
    library: '资料库',
    connections: '连接',
    activity: '活动记录',
    settings: '设置'
  }

  return (
    <header className="main-header" data-electron-drag>
      <div className="header-title">
        <button
          className="icon-button mobile-menu-button"
          onClick={() => setMobileSidebar(true)}
          aria-label="打开导航"
        >
          <Icon name="menu" />
        </button>
        <span>{titles[section]}</span>
      </div>
      <div className="header-actions">
        {(runStatus === 'running' || runStatus === 'planning') && (
          <span className="running-pill">
            <span className="pulse-dot" />
            {runLabel || '随序正在工作'}
          </span>
        )}
        <button className="icon-button" aria-label="通知">
          <Icon name="bell" size={18} />
        </button>
        <button className="icon-button" aria-label="更多">
          <Icon name="more" size={18} />
        </button>
      </div>
    </header>
  )
}
