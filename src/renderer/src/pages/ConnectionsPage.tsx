import { Icon } from '../components/Icon'
import { useAppStore } from '../store'
import type { Connector } from '../../../shared/types'

const statusLabels: Record<Connector['status'], string> = {
  connected: '已连接',
  available: '可连接',
  needs_setup: '需要配置',
  error: '连接异常'
}

export function ConnectionsPage() {
  const connectors = useAppStore((state) => state.data?.connectors ?? [])
  const updateConnector = useAppStore((state) => state.updateConnector)
  const connected = connectors.filter((connector) => connector.status === 'connected')
  const available = connectors.filter((connector) => connector.status !== 'connected')

  const connect = async (connector: Connector) => {
    if (connector.id === 'files') {
      const folder = await window.suixu.pickFolder()
      if (folder) await updateConnector('files', 'connected', folder)
      return
    }
    await updateConnector(
      connector.id,
      connector.status === 'needs_setup' ? 'needs_setup' : 'connected',
      connector.status === 'needs_setup' ? null : '当前 Mac'
    )
  }

  return (
    <div className="page-scroll">
      <div className="page-container">
        <section className="page-heading row-heading">
          <div>
            <span className="eyebrow">你决定随序能看到什么</span>
            <h1>连接</h1>
            <p>按需连接应用，随时撤销。每次写操作仍会单独请求确认。</p>
          </div>
          <span className="security-pill">
            <Icon name="shield" size={15} />
            权限最小化
          </span>
        </section>

        <section className="connections-summary">
          <span className="connection-orb"><Icon name="zap" size={25} /></span>
          <div>
            <strong>{connected.length} 个连接正在为随序提供上下文</strong>
            <p>未授权的信息不会被主动读取，连接器也不会把密码暴露给模型。</p>
          </div>
          <div className="connection-stat">
            <strong>{connectors.length}</strong>
            <span>个可选连接</span>
          </div>
        </section>

        <div className="connection-section-heading">
          <h2>已连接</h2>
          <span>{connected.length}</span>
        </div>
        <div className="connections-grid">
          {connected.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              onAction={() => void updateConnector(connector.id, 'available', null)}
            />
          ))}
          {connected.length === 0 && (
            <p className="inline-empty">还没有连接任何应用。</p>
          )}
        </div>

        <div className="connection-section-heading">
          <h2>可连接的应用</h2>
          <span>{available.length}</span>
        </div>
        <div className="connections-grid">
          {available.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              onAction={() => void connect(connector)}
            />
          ))}
        </div>

        <section className="permission-explainer">
          <div className="explainer-icon"><Icon name="shield" size={24} /></div>
          <div>
            <h3>你可以看见每一次访问</h3>
            <p>
              读取或写入本地应用时，随序会记录动作、结果和时间。涉及修改、发送、提交和付款的步骤，
              不会因为没有连接器而静默执行。
            </p>
          </div>
          <button className="text-button" onClick={() => useAppStore.getState().setSection('activity')}>
            查看活动记录
            <Icon name="chevronRight" size={14} />
          </button>
        </section>
      </div>
    </div>
  )
}

function ConnectorCard({ connector, onAction }: { connector: Connector; onAction: () => void }) {
  return (
    <article className="connector-card">
      <div className={`connector-logo logo-${connector.id}`}>
        <Icon name={connector.icon} size={23} />
      </div>
      <div className="connector-copy">
        <div>
          <h3>{connector.name}</h3>
          <span className={`connector-status status-${connector.status}`}>
            {statusLabels[connector.status]}
          </span>
        </div>
        <p>{connector.description}</p>
        <div className="connector-capabilities">
          {connector.capabilities.slice(0, 3).map((capability) => (
            <span key={capability}>{capability}</span>
          ))}
        </div>
      </div>
      <button
        className={connector.status === 'connected' ? 'icon-button' : 'text-button'}
        onClick={onAction}
      >
        {connector.status === 'connected' ? <Icon name="more" size={16} /> : '连接'}
      </button>
    </article>
  )
}
