import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { useAppStore } from '../store'

type Filter = 'all' | 'agent' | 'tool' | 'approval' | 'memory'

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

export function ActivityPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const activities = useAppStore((state) => state.data?.activities ?? [])
  const items = useMemo(
    () => activities.filter((item) => filter === 'all' || item.type === filter),
    [activities, filter]
  )

  return (
    <div className="page-scroll">
      <div className="page-container narrow-page">
        <section className="page-heading">
          <span className="eyebrow">透明可查</span>
          <h1>活动记录</h1>
          <p>每一次读取、写入、审批与任务状态变化，都会留下本地记录。</p>
        </section>

        <div className="segmented activity-filter">
          {[
            ['all', '全部'],
            ['agent', '任务'],
            ['tool', '工具'],
            ['approval', '审批'],
            ['memory', '记忆']
          ].map(([id, label]) => (
            <button
              key={id}
              className={filter === id ? 'active' : ''}
              onClick={() => setFilter(id as Filter)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="full-activity-list">
          {items.map((activity) => (
            <article key={activity.id} className="full-activity-item">
              <span className={`activity-symbol symbol-${activity.type}`}>
                <Icon
                  name={
                    activity.type === 'approval'
                      ? 'shield'
                      : activity.type === 'tool'
                        ? 'zap'
                        : activity.type === 'memory'
                          ? 'brain'
                          : activity.type === 'artifact'
                            ? 'file'
                            : 'sparkles'
                  }
                  size={17}
                />
              </span>
              <div>
                <div className="full-activity-heading">
                  <strong>{activity.title}</strong>
                  <time>{formatTime(activity.createdAt)}</time>
                </div>
                <p>{activity.detail}</p>
                {activity.taskId && <span className="activity-task-tag">任务 #{activity.taskId.slice(0, 6)}</span>}
              </div>
            </article>
          ))}
          {!items.length && (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="activity" size={28} /></span>
              <h2>暂无此类记录</h2>
              <p>随序开始执行任务后，记录会出现在这里。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
