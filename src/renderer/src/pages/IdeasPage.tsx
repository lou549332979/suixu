import { Icon } from '../components/Icon'
import { useAppStore } from '../store'

export function IdeasPage() {
  const ideas = useAppStore((state) => state.data?.ideas ?? [])
  const profile = useAppStore((state) => state.data?.profile)
  const send = useAppStore((state) => state.send)
  const createGoal = useAppStore((state) => state.createGoal)
  const setSection = useAppStore((state) => state.setSection)

  return (
    <div className="page-scroll">
      <div className="page-container">
        <section className="page-heading split-heading">
          <div>
            <span className="eyebrow">为你想到的下一步</span>
            <h1>灵感不是信息流，<br />是已经想过一遍的行动。</h1>
          </div>
          <div className="page-heading-art">
            <span className="float-pill pill-a">少一点忙乱</span>
            <span className="float-pill pill-b">多推进一点</span>
            <Icon name="sparkles" size={32} />
          </div>
        </section>

        <div className="idea-grid featured-ideas">
          {ideas.map((idea, index) => (
            <article className={`idea-card accent-${idea.accent} ${index === 0 ? 'featured' : ''}`} key={idea.id}>
              <div className="idea-top">
                <span className="idea-icon">
                  <Icon name={idea.icon} size={21} />
                </span>
                <span className="idea-eyebrow">{idea.eyebrow}</span>
              </div>
              <h2>{idea.title}</h2>
              <p>{idea.description}</p>
              <div className="idea-actions">
                <button className="primary-button compact" onClick={() => void send({ text: idea.prompt })}>
                  让 {profile?.agentName || '随序'} 开始
                  <Icon name="arrowUpRight" size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label="保存为长期目标"
                  onClick={() => void createGoal(idea.title, idea.description)}
                >
                  <Icon name="target" size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="section-divider">
          <span>让随序更懂你</span>
        </div>
        <div className="insight-banner">
          <span className="insight-icon"><Icon name="brain" size={22} /></span>
          <div>
            <strong>灵感来自你的目标与记忆</strong>
            <p>随序只会使用你明确启用的记忆、目标和已授权连接，不会把网页里的指令当成偏好。</p>
          </div>
          <button className="text-button" onClick={() => setSection('settings')}>
            管理记忆 <Icon name="chevronRight" size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
