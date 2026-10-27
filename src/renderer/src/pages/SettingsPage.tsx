import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { useAppStore } from '../store'

type SettingsTab = 'general' | 'model' | 'memory' | 'privacy'

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('general')
  const [version, setVersion] = useState('')
  const data = useAppStore((state) => state.data)
  const updateProfile = useAppStore((state) => state.updateProfile)
  const saveModel = useAppStore((state) => state.saveModel)
  const saveMemory = useAppStore((state) => state.saveMemory)
  const deleteMemory = useAppStore((state) => state.deleteMemory)
  const [profile, setProfile] = useState({
    name: data?.profile.name ?? '',
    agentName: data?.profile.agentName ?? '',
    tone: data?.profile.tone ?? '',
    avatar: data?.profile.avatar ?? '序'
  })
  const [model, setModel] = useState({
    baseUrl: data?.model.baseUrl ?? '',
    model: data?.model.model ?? '',
    apiKey: '',
    demoMode: data?.model.demoMode ?? true
  })
  const [probe, setProbe] = useState<{ ok: boolean; message: string } | null>(null)
  const [memoryDraft, setMemoryDraft] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    void window.suixu.getVersion().then(setVersion)
  }, [])

  if (!data) return null

  const flash = (text: string) => {
    setSaved(text)
    window.setTimeout(() => setSaved(''), 1800)
  }

  return (
    <div className="page-scroll">
      <div className="settings-layout">
        <aside className="settings-nav">
          <div>
            <span className="eyebrow">随序</span>
            <h1>设置</h1>
          </div>
          {[
            ['general', '个人与偏好', 'user'],
            ['model', '模型', 'sparkles'],
            ['memory', '记忆', 'brain'],
            ['privacy', '数据与隐私', 'shield']
          ].map(([id, label, icon]) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id as SettingsTab)}
            >
              <Icon name={icon} size={17} />
              {label}
            </button>
          ))}
          <div className="settings-version">随序 {version || '0.1.0'} · Apple Silicon</div>
        </aside>

        <section className="settings-content">
          {tab === 'general' && (
            <>
              <SettingsHeading
                eyebrow="更像你的助手"
                title="个人与偏好"
                description="名字和语气会影响随序与你的交流方式，不影响工具权限。"
              />
              <div className="profile-editor">
                <div className="profile-avatar-large">{profile.avatar || '序'}</div>
                <div>
                  <strong>{profile.agentName || '随序'}</strong>
                  <p>你的本地个人 Agent</p>
                  <div className="avatar-options">
                    {['序', '✦', '◐', '风', 'M', '∞'].map((avatar) => (
                      <button
                        key={avatar}
                        className={profile.avatar === avatar ? 'active' : ''}
                        onClick={() => setProfile({ ...profile, avatar })}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="settings-form">
                <label>
                  <span>你的称呼</span>
                  <input
                    value={profile.name}
                    onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                    placeholder="你希望随序怎么称呼你？"
                  />
                </label>
                <label>
                  <span>Agent 名称</span>
                  <input
                    value={profile.agentName}
                    onChange={(event) => setProfile({ ...profile, agentName: event.target.value })}
                    placeholder="随序"
                  />
                </label>
                <label>
                  <span>交流风格</span>
                  <textarea
                    value={profile.tone}
                    onChange={(event) => setProfile({ ...profile, tone: event.target.value })}
                    rows={3}
                  />
                </label>
              </div>
              <div className="settings-save-row">
                {saved && <span className="saved-label"><Icon name="check" size={13} /> {saved}</span>}
                <button
                  className="primary-button"
                  onClick={async () => {
                    await updateProfile(profile)
                    flash('已保存')
                  }}
                >
                  保存偏好
                </button>
              </div>
            </>
          )}

          {tab === 'model' && (
            <>
              <SettingsHeading
                eyebrow="你的模型，你的密钥"
                title="模型连接"
                description="支持 OpenAI 兼容的 Chat Completions 与工具调用接口。密钥由 macOS Keychain 保护，不进入聊天记录。"
              />
              <div className={`model-state-card ${data.model.demoMode ? 'demo' : 'live'}`}>
                <span>{data.model.demoMode ? <Icon name="sparkles" size={22} /> : <Icon name="checkCircle" size={22} />}</span>
                <div>
                  <strong>{data.model.demoMode ? '当前为演示模式' : `已连接 ${data.model.model}`}</strong>
                  <p>
                    {data.model.demoMode
                      ? '演示模式不会执行工具或访问外部数据。填写真实模型后即可开始。'
                      : `Base URL：${data.model.baseUrl}`}
                  </p>
                </div>
              </div>
              <div className="settings-form model-form">
                <label>
                  <span>Base URL</span>
                  <input
                    value={model.baseUrl}
                    onChange={(event) => setModel({ ...model, baseUrl: event.target.value })}
                    placeholder="https://api.openai.com/v1"
                  />
                  <small>兼容接口需要提供 /chat/completions 与 /models 路径。</small>
                </label>
                <label>
                  <span>模型名称</span>
                  <input
                    value={model.model}
                    onChange={(event) => setModel({ ...model, model: event.target.value })}
                    placeholder="gpt-4.1-mini"
                  />
                </label>
                <label>
                  <span>API Key</span>
                  <input
                    type="password"
                    value={model.apiKey}
                    onChange={(event) => setModel({ ...model, apiKey: event.target.value })}
                    placeholder={data.model.hasApiKey ? '已安全保存；留空不会覆盖' : 'sk-…'}
                    autoComplete="off"
                  />
                </label>
                <label className="switch-row">
                  <span>
                    <strong>保留演示模式</strong>
                    <small>关闭后，随序会尝试调用真实模型和工具。</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={model.demoMode}
                    onChange={(event) => setModel({ ...model, demoMode: event.target.checked })}
                  />
                </label>
              </div>
              {probe && (
                <div className={`probe-message ${probe.ok ? 'success' : 'error'}`}>
                  <Icon name={probe.ok ? 'checkCircle' : 'warning'} size={16} />
                  {probe.message}
                </div>
              )}
              <div className="settings-save-row">
                {saved && <span className="saved-label"><Icon name="check" size={13} /> {saved}</span>}
                <button
                  className="secondary-button"
                  onClick={async () => {
                    setProbe(null)
                    const result = await window.suixu.probeModel()
                    setProbe(result)
                    if (result.ok) await useAppStore.getState().refresh()
                  }}
                >
                  测试连接
                </button>
                <button
                  className="primary-button"
                  onClick={async () => {
                    await saveModel(model)
                    setModel({ ...model, apiKey: '' })
                    flash('模型配置已保存')
                  }}
                >
                  保存模型
                </button>
              </div>
              <div className="capability-list">
                <h3>能力探测</h3>
                {Object.entries(data.model.capabilities).map(([key, enabled]) => (
                  <div key={key}>
                    <span>{capabilityNames[key] ?? key}</span>
                    <span className={enabled ? 'supported' : 'unsupported'}>
                      {enabled ? '支持' : '未确认'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'memory' && (
            <>
              <SettingsHeading
                eyebrow="由你编辑的长期上下文"
                title="记忆"
                description="只有明确启用的记忆会进入模型上下文。网页内容和模型猜测不会自动成为记忆。"
              />
              <div className="memory-add">
                <textarea
                  value={memoryDraft}
                  onChange={(event) => setMemoryDraft(event.target.value)}
                  placeholder="例如：安排会议时默认预留 10 分钟缓冲。"
                  rows={3}
                />
                <button
                  className="primary-button"
                  disabled={!memoryDraft.trim()}
                  onClick={async () => {
                    await saveMemory(memoryDraft.trim(), '关于你')
                    setMemoryDraft('')
                    flash('记忆已添加')
                  }}
                >
                  添加记忆
                </button>
              </div>
              <div className="memory-list">
                {data.memories.map((memory) => (
                  <article key={memory.id} className="memory-item">
                    <span className="memory-icon"><Icon name="brain" size={17} /></span>
                    <div>
                      <span className="memory-category">{memory.category}</span>
                      <p>{memory.content}</p>
                    </div>
                    <button
                      className="icon-button danger-hover"
                      onClick={() => void deleteMemory(memory.id)}
                      aria-label="删除记忆"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}

          {tab === 'privacy' && (
            <>
              <SettingsHeading
                eyebrow="本地优先"
                title="数据与隐私"
                description="聊天、记忆、目标、审批和活动记录均存放在本机加密数据库中。"
              />
              <div className="privacy-card-grid">
                <article>
                  <span><Icon name="shield" size={22} /></span>
                  <h3>加密数据库</h3>
                  <p>SQLite 文件落盘前使用 AES-256-GCM 加密，密钥由 macOS Keychain 保护。</p>
                </article>
                <article>
                  <span><Icon name="globe" size={22} /></span>
                  <h3>模型数据流向</h3>
                  <p>你发送的提示词、选中的附件和相关连接数据会发送给当前模型服务商。</p>
                </article>
                <article>
                  <span><Icon name="folder" size={22} /></span>
                  <h3>文件访问</h3>
                  <p>Agent 默认只能访问随序工作区；其他文件夹需要你主动授权。</p>
                </article>
                <article>
                  <span><Icon name="activity" size={22} /></span>
                  <h3>可撤销</h3>
                  <p>你可以随时断开连接器、删除记忆，并查看完整工具执行记录。</p>
                </article>
              </div>
              <div className="privacy-actions">
                <button className="secondary-button" onClick={() => window.suixu.openDataFolder()}>
                  <Icon name="folder" size={15} />
                  打开本地数据目录
                </button>
                <button
                  className="secondary-button"
                  onClick={async () => {
                    const next = await window.suixu.clearModelKey()
                    useAppStore.setState((state) => ({
                      data: state.data ? { ...state.data, model: next } : state.data
                    }))
                    flash('模型密钥已清除')
                  }}
                >
                  <Icon name="shield" size={15} />
                  清除模型密钥
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

const capabilityNames: Record<string, string> = {
  text: '文本对话',
  tools: '工具调用',
  vision: '图片理解',
  transcription: '语音转写',
  speech: '语音合成',
  imageGeneration: '图片生成'
}

function SettingsHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="settings-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}
