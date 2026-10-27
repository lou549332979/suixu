import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { useAppStore } from '../store'
import type { Approval } from '../../../shared/types'

const riskLabels: Record<Approval['risk'], string> = {
  read: '只读',
  workspace_write: '本地写入',
  external_write: '外部写入',
  destructive: '高风险',
  financial: '付款'
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.round(diff / 60_000))
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.round(hours / 24)} 天前`
}

export function RightRail() {
  const [tab, setTab] = useState<'approvals' | 'activity'>('approvals')
  const data = useAppStore((state) => state.data)
  const runStatus = useAppStore((state) => state.runStatus)
  const runLabel = useAppStore((state) => state.runLabel)
  const resolveApproval = useAppStore((state) => state.resolveApproval)
  const approvals = data?.approvals.filter((approval) => approval.status === 'pending') ?? []
  const activities = data?.activities ?? []
  const activeConnectors = data?.connectors.filter((item) => item.status === 'connected').length ?? 0

  const groupedActivities = useMemo(() => activities.slice(0, 8), [activities])

  return (
    <aside className="right-rail">
      <div className="rail-status">
        <div className={`agent-state ${runStatus || 'idle'}`}>
          <span className="agent-state-orb">
            <Icon name={runStatus === 'awaiting_approval' ? 'pause' : 'sparkles'} size={17} />
          </span>
          <div>
            <strong>
              {runStatus === 'running' || runStatus === 'planning'
                ? runLabel || '正在处理'
                : runStatus === 'awaiting_approval'
                  ? '等待你的决定'
                  : '随序已就绪'}
            </strong>
            <small>
              {runStatus === 'running' || runStatus === 'planning'
                ? '你可以随时停止当前任务'
                : '所有关键操作都会先征求你的意见'}
            </small>
          </div>
        </div>
        <div className="rail-metrics">
          <span>
            <strong>{activeConnectors}</strong>
            <small>已连接</small>
          </span>
          <span>
            <strong>{approvals.length}</strong>
            <small>待确认</small>
          </span>
          <span>
            <strong>{data?.goals.filter((goal) => goal.status !== 'completed').length ?? 0}</strong>
            <small>进行中</small>
          </span>
        </div>
      </div>

      <div className="rail-tabs">
        <button className={tab === 'approvals' ? 'active' : ''} onClick={() => setTab('approvals')}>
          审批
          {approvals.length > 0 && <span>{approvals.length}</span>}
        </button>
        <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>
          动态
        </button>
      </div>

      <div className="rail-scroll">
        {tab === 'approvals' ? (
          approvals.length ? (
            approvals.map((approval) => (
              <article className="approval-card" key={approval.id}>
                <div className="approval-topline">
                  <span className={`risk-badge risk-${approval.risk}`}>
                    {riskLabels[approval.risk]}
                  </span>
                  <span>{relativeTime(approval.createdAt)}</span>
                </div>
                <h3>{approval.title}</h3>
                <p>{approval.summary}</p>
                {approval.diff && <pre className="approval-preview">{approval.diff.slice(0, 420)}</pre>}
                <div className="approval-actions">
                  <button
                    className="secondary-button"
                    onClick={() => void resolveApproval(approval, 'reject')}
                  >
                    拒绝
                  </button>
                  <button
                    className="primary-button compact"
                    onClick={() => void resolveApproval(approval, 'approve')}
                  >
                    <Icon name="check" size={15} />
                    确认执行
                  </button>
                </div>
                <small className="approval-expiry">30 分钟内有效 · 一次性授权</small>
              </article>
            ))
          ) : (
            <div className="rail-empty">
              <span>
                <Icon name="shield" size={22} />
              </span>
              <h3>没有待确认的操作</h3>
              <p>当需要发邮件、改文件或操作其他应用时，会在这里出现。</p>
            </div>
          )
        ) : groupedActivities.length ? (
          <div className="activity-feed compact-feed">
            {groupedActivities.map((activity) => (
              <div className="activity-row" key={activity.id}>
                <span className={`activity-dot dot-${activity.type}`} />
                <div>
                  <strong>{activity.title}</strong>
                  <p>{activity.detail}</p>
                  <small>{relativeTime(activity.createdAt)}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rail-empty">
            <span>
              <Icon name="activity" size={22} />
            </span>
            <h3>活动会记录在这里</h3>
            <p>每次工具调用、文件写入和审批决定都会留下可查记录。</p>
          </div>
        )}
      </div>

      <button className="privacy-strip">
        <Icon name="shield" size={16} />
        <span>
          <strong>本地加密存储</strong>
          <small>关键动作逐次审批</small>
        </span>
        <Icon name="chevronRight" size={14} />
      </button>
    </aside>
  )
}
