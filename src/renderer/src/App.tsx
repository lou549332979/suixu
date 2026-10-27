import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Onboarding } from './components/Onboarding'
import { RightRail } from './components/RightRail'
import { Sidebar } from './components/Sidebar'
import { ChatPage } from './pages/ChatPage'
import { IdeasPage } from './pages/IdeasPage'
import { GoalsPage } from './pages/GoalsPage'
import { LibraryPage } from './pages/LibraryPage'
import { ConnectionsPage } from './pages/ConnectionsPage'
import { ActivityPage } from './pages/ActivityPage'
import { SettingsPage } from './pages/SettingsPage'
import { useAppStore } from './store'
import { BrandMark } from './components/BrandMark'
import { Icon } from './components/Icon'

export default function App() {
  const loading = useAppStore((state) => state.loading)
  const section = useAppStore((state) => state.section)
  const error = useAppStore((state) => state.error)
  const initialize = useAppStore((state) => state.initialize)
  const handleAgentEvent = useAppStore((state) => state.handleAgentEvent)
  const newChat = useAppStore((state) => state.newChat)
  const setSection = useAppStore((state) => state.setSection)
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem('suixu.onboarded') !== '1'
  )

  useEffect(() => {
    void initialize()
    const unsubscribeAgent = window.suixu.onAgentEvent(handleAgentEvent)
    const unsubscribeNewChat = window.suixu.onNewChat(newChat)
    const closeOnboarding = () => setShowOnboarding(false)
    window.addEventListener('suixu:onboarding-closed', closeOnboarding)
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        newChat()
      }
      if ((event.metaKey || event.ctrlKey) && ['1', '2', '3', '4', '5', '6'].includes(event.key)) {
        event.preventDefault()
        const sections = ['home', 'ideas', 'goals', 'library', 'connections', 'activity'] as const
        const target = sections[Number(event.key) - 1]
        if (target) setSection(target)
      }
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault()
        setSection('settings')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      unsubscribeAgent()
      unsubscribeNewChat()
      window.removeEventListener('suixu:onboarding-closed', closeOnboarding)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [handleAgentEvent, initialize, newChat, setSection])

  if (loading) {
    return (
      <div className="app-loading">
        <BrandMark size="large" animated />
        <div className="loading-wordmark">随序</div>
        <div className="loading-line"><span /></div>
        <p>正在打开你的本地 Agent</p>
      </div>
    )
  }

  return (
    <div className={`app-shell section-${section}`}>
      <Sidebar />
      <main className="main-shell">
        <Header />
        <div className={`content-shell${section === 'settings' ? ' settings-shell' : ''}`}>
          {section === 'home' && <ChatPage />}
          {section === 'ideas' && <IdeasPage />}
          {section === 'goals' && <GoalsPage />}
          {section === 'library' && <LibraryPage />}
          {section === 'connections' && <ConnectionsPage />}
          {section === 'activity' && <ActivityPage />}
          {section === 'settings' && <SettingsPage />}
        </div>
      </main>
      <RightRail />
      {error && (
        <div className="error-toast">
          <Icon name="warning" size={16} />
          <span>{error}</span>
          <button onClick={() => useAppStore.setState({ error: null })}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}
      {showOnboarding && <Onboarding />}
    </div>
  )
}
