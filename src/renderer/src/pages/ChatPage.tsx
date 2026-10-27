import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BrandMark } from '../components/BrandMark'
import { Composer } from '../components/Composer'
import { Icon } from '../components/Icon'
import { useAppStore } from '../store'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

const capabilityCards = [
  {
    icon: 'calendar',
    title: '安排日程',
    text: '查看空闲时间、创建活动并同步提醒。',
    prompt: '查看我未来七天的日程，帮我找出最适合安排一次 45 分钟专注工作的时段，并创建提醒。'
  },
  {
    icon: 'globe',
    title: '研究与比价',
    text: '浏览公开网页，整理来源并生成对比表。',
    prompt: '帮我研究一款适合通勤的降噪耳机，比较三款产品的价格、续航和退货政策，生成对比表但不要下单。'
  },
  {
    icon: 'folders',
    title: '整理文件',
    text: '分析项目资料，生成索引和可编辑文档。',
    prompt: '查看随序工作区里的文件，给我一份整理方案，并生成一个 Markdown 索引。'
  }
]

export function ChatPage() {
  const [starter, setStarter] = useState('')
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const messages = useAppStore((state) => state.messages)
  const data = useAppStore((state) => state.data)
  const runStatus = useAppStore((state) => state.runStatus)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => {
      const element = scrollRef.current
      if (element) element.scrollTop = element.scrollHeight
    })
  }, [messages])

  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.role !== 'tool' &&
          (message.role !== 'assistant' || message.content || message.status === 'streaming')
      ),
    [messages]
  )

  if (!visibleMessages.length) {
    return (
      <div className="home-page">
        <div className="home-orbital" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <section className="home-hero">
          <div className="home-brand">
            <BrandMark size="large" animated />
          </div>
          <p className="eyebrow">
            <span className="status-dot" />
            {data?.model.demoMode ? '演示模式 · 配置模型以开始真实任务' : '已连接模型 · 本地 Agent'}
          </p>
          <h1>
            {greeting()}，{data?.profile.name || '你'}。
            <br />
            <span>把今天交给随序。</span>
          </h1>
          <p className="hero-copy">
            告诉我一个目标。我会拆解、推进、向你确认关键步骤，
            <br className="desktop-only" />
            再把结果留在一个可以随时回来的任务里。
          </p>
        </section>

        <Composer initialValue={starter} />

        <section className="capability-grid">
          {capabilityCards.map((card) => (
            <button
              key={card.title}
              className="capability-card"
              onClick={() => setStarter(card.prompt)}
            >
              <span className="capability-icon">
                <Icon name={card.icon} size={19} />
              </span>
              <strong>{card.title}</strong>
              <p>{card.text}</p>
              <Icon name="arrowUpRight" size={15} />
            </button>
          ))}
        </section>

        <div className="home-footer-note">
          <Icon name="shield" size={14} />
          本地加密存储 · 关键操作逐次审批 · API 数据流向透明可见
        </div>
      </div>
    )
  }

  return (
    <div className="chat-page">
      <div className="chat-scroll" ref={scrollRef}>
        <div className="message-column">
          <div className="chat-day-label">今天</div>
          {visibleMessages.map((message) => (
            <article
              key={message.id}
              className={`message-row ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              {message.role === 'assistant' && (
                <div className="assistant-avatar">
                  <BrandMark size="small" />
                </div>
              )}
              <div className="message-body">
                {message.role === 'assistant' && (
                  <div className="message-author">
                    {data?.profile.agentName || '随序'}
                    {message.status === 'streaming' && <span className="typing-dots" />}
                  </div>
                )}
                <div className={`message-content${message.status === 'error' ? ' error' : ''}`}>
                  {message.role === 'assistant' ? (
                    message.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    ) : (
                      <div className="thinking-line">
                        <span className="pulse-dot" />
                        正在整理信息
                      </div>
                    )
                  ) : (
                    <p>{message.content}</p>
                  )}
                  {Boolean(message.meta?.attachments) && (
                    <div className="message-attachments">
                      {(message.meta?.attachments as Array<{ name: string }>).map((attachment) => (
                        <span key={attachment.name}>
                          <Icon name="file" size={13} />
                          {attachment.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'assistant' && message.status !== 'streaming' && (
                  <div className="message-actions">
                    <button onClick={() => navigator.clipboard.writeText(message.content)}>
                      <Icon name="copy" size={13} />
                      复制
                    </button>
                    <button>
                      <Icon name="refresh" size={13} />
                      重试
                    </button>
                    <button
                      onClick={async () => {
                        setSpeakingId(message.id)
                        try {
                          const bytes = (await window.suixu.speak(message.content)) as Uint8Array
                          const url = URL.createObjectURL(
                            new Blob([new Uint8Array(bytes)], { type: 'audio/mpeg' })
                          )
                          const audio = new Audio(url)
                          audio.onended = () => {
                            URL.revokeObjectURL(url)
                            setSpeakingId(null)
                          }
                          await audio.play()
                        } catch (error) {
                          useAppStore.setState({
                            error: error instanceof Error ? error.message : String(error)
                          })
                          setSpeakingId(null)
                        }
                      }}
                    >
                      <Icon name="volume" size={13} />
                      {speakingId === message.id ? '播放中' : '朗读'}
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
          {(runStatus === 'running' || runStatus === 'planning') && (
            <div className="working-banner">
              <span className="spinner" />
              <span>{useAppStore.getState().runLabel || '随序正在推进任务'}</span>
            </div>
          )}
        </div>
      </div>
      <div className="chat-composer-shell">
        <Composer />
      </div>
    </div>
  )
}
