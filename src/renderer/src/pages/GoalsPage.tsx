import { useState } from 'react'
import { Icon } from '../components/Icon'
import { useAppStore } from '../store'

export function GoalsPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [adding, setAdding] = useState(false)
  const goals = useAppStore((state) => state.data?.goals ?? [])
  const scheduledTasks = useAppStore((state) => state.data?.scheduledTasks ?? [])
  const createGoal = useAppStore((state) => state.createGoal)
  const refresh = useAppStore((state) => state.refresh)

  const submit = async () => {
    if (!title.trim()) return
    await createGoal(title.trim(), description.trim())
    setTitle('')
    setDescription('')
    setAdding(false)
  }

  const finish = async (id: string) => {
    await window.suixu.updateGoal(id, { status: 'completed', progress: 100 })
    await refresh()
  }

  return (
    <div className="page-scroll">
      <div className="page-container">
        <section className="page-heading row-heading">
          <div>
            <span className="eyebrow">持续向前</span>
            <h1>目标与任务</h1>
            <p>大目标会被拆成能执行、能检查、能交给随序继续推进的步骤。</p>
          </div>
          <button className="primary-button" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} />
            新建目标
          </button>
        </section>

        {adding && (
          <section className="inline-create-card">
            <div className="inline-create-heading">
              <span><Icon name="target" size={18} /> 新目标</span>
              <button className="icon-button" onClick={() => setAdding(false)}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="你希望完成什么？"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="补充完成标准、时间或限制（可选）"
              rows={3}
            />
            <div className="form-actions">
              <button className="secondary-button" onClick={() => setAdding(false)}>取消</button>
              <button className="primary-button" onClick={() => void submit()}>创建并拆解</button>
            </div>
          </section>
        )}

        {goals.length ? (
          <div className="goals-layout">
            <div className="goal-list">
              {goals.map((goal) => (
                <article className="goal-card" key={goal.id}>
                  <div className="goal-card-top">
                    <span className={`goal-state state-${goal.status}`}>
                      {goal.status === 'completed' ? '已完成' : goal.status === 'planning' ? '待启动' : '进行中'}
                    </span>
                    <button className="icon-button" aria-label="目标选项">
                      <Icon name="more" size={16} />
                    </button>
                  </div>
                  <h2>{goal.title}</h2>
                  <p>{goal.description || '还没有补充说明。和随序聊一聊，让完成标准更具体。'}</p>
                  <div className="goal-progress-row">
                    <div className="goal-progress">
                      <span style={{ width: `${Math.max(4, goal.progress)}%` }} />
                    </div>
                    <strong>{Math.round(goal.progress)}%</strong>
                  </div>
                  <div className="goal-steps">
                    {goal.plan.map((step, index) => (
                      <div key={step.id} className={`goal-step step-${step.status}`}>
                        <span>{step.status === 'done' ? <Icon name="check" size={12} /> : index + 1}</span>
                        <p>{step.title}</p>
                      </div>
                    ))}
                  </div>
                  <div className="goal-card-footer">
                    <button className="secondary-button small" onClick={() => void finish(goal.id)}>
                      <Icon name="checkCircle" size={14} />
                      标记完成
                    </button>
                    <button className="text-button">打开任务 <Icon name="chevronRight" size={14} /></button>
                  </div>
                </article>
              ))}
            </div>
            <aside className="goals-side">
              <div className="goal-summary-card">
                <span className="summary-icon"><Icon name="clock" size={22} /></span>
                <h3>本周节奏</h3>
                <strong>{goals.filter((goal) => goal.status !== 'completed').length}</strong>
                <p>个目标正在推进</p>
                <div className="mini-week">
                  {['一', '二', '三', '四', '五', '六', '日'].map((day, index) => (
                    <span key={day} className={index < new Date().getDay() ? 'past' : index === new Date().getDay() - 1 ? 'today' : ''}>
                      {day}
                    </span>
                  ))}
                </div>
              </div>
              <div className="timeline-card">
                <h3>下一步</h3>
                <p>目标拆解后，含副作用的执行会先进入审批队列。</p>
                <span><Icon name="shield" size={14} /> 你始终掌握执行权</span>
              </div>
            </aside>
          </div>
        ) : (
          <div className="empty-state large-empty">
            <span className="empty-icon"><Icon name="target" size={28} /></span>
            <h2>还没有长期目标</h2>
            <p>从一个你一直想做、但还没排上日程的事情开始。</p>
            <button className="primary-button" onClick={() => setAdding(true)}>创建第一个目标</button>
          </div>
        )}

        <section className="scheduled-section">
          <div className="connection-section-heading">
            <h2>定时任务</h2>
            <span>{scheduledTasks.length}</span>
          </div>
          {scheduledTasks.length ? (
            <div className="scheduled-list">
              {scheduledTasks.map((task) => (
                <article key={task.id} className="scheduled-row">
                  <span className="scheduled-icon"><Icon name="clock" size={17} /></span>
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.prompt}</p>
                    <small>
                      {task.cadence} · 下次 {task.nextRunAt
                        ? new Intl.DateTimeFormat('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).format(new Date(task.nextRunAt))
                        : '待计划'}
                    </small>
                  </div>
                  <label className="mini-switch">
                    <input
                      type="checkbox"
                      checked={task.enabled}
                      onChange={async (event) => {
                        await window.suixu.toggleScheduledTask(task.id, event.target.checked)
                        await refresh()
                      }}
                    />
                    <span />
                  </label>
                </article>
              ))}
            </div>
          ) : (
            <div className="scheduled-empty">
              <Icon name="clock" size={18} />
              <span>还没有定时任务。直接告诉随序“每天早上帮我整理简报”，它会在这里创建。</span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
