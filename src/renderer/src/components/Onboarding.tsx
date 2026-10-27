import { useState } from 'react'
import { BrandMark } from './BrandMark'
import { Icon } from './Icon'
import { useAppStore } from '../store'

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [agentName, setAgentName] = useState('随序')
  const [model, setModel] = useState({
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    apiKey: ''
  })
  const updateProfile = useAppStore((state) => state.updateProfile)
  const saveModel = useAppStore((state) => state.saveModel)
  const setSection = useAppStore((state) => state.setSection)

  const close = () => {
    localStorage.setItem('suixu.onboarded', '1')
    document.documentElement.dataset.onboarding = 'closed'
    window.dispatchEvent(new CustomEvent('suixu:onboarding-closed'))
  }

  const completeProfile = async () => {
    if (name.trim() || agentName.trim()) {
      await updateProfile({
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(agentName.trim() ? { agentName: agentName.trim() } : {})
      })
    }
    setStep(1)
  }

  const completeModel = async () => {
    if (!model.apiKey.trim()) {
      setStep(2)
      return
    }
    await saveModel({
      ...model,
      demoMode: false
    })
    setStep(2)
  }

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-window">
        <button className="onboarding-skip" onClick={close}>先体验演示</button>
        <div className="onboarding-art">
          <div className="onboarding-glow" />
          <BrandMark size="large" animated />
          <span className="onboarding-orbit orbit-one" />
          <span className="onboarding-orbit orbit-two" />
          <span className="onboarding-orbit orbit-three" />
          <div className="onboarding-promise">
            <Icon name="shield" size={15} />
            本地加密 · 由你授权
          </div>
        </div>
        <div className="onboarding-content">
          <div className="onboarding-progress">
            {[0, 1, 2].map((item) => <span key={item} className={step >= item ? 'active' : ''} />)}
          </div>
          {step === 0 && (
            <>
              <span className="eyebrow">欢迎来到随序</span>
              <h1>一个会做事的<br />个人 AI Agent。</h1>
              <p>先告诉我怎么称呼你，以及你希望助手叫什么。</p>
              <div className="onboarding-form">
                <label>
                  <span>你的称呼</span>
                  <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="你" />
                </label>
                <label>
                  <span>Agent 名称</span>
                  <input value={agentName} onChange={(event) => setAgentName(event.target.value)} placeholder="随序" />
                </label>
              </div>
              <button className="primary-button wide" onClick={() => void completeProfile()}>
                继续
                <Icon name="chevronRight" size={16} />
              </button>
            </>
          )}
          {step === 1 && (
            <>
              <span className="eyebrow">连接你的模型</span>
              <h1>给随序<br />一个可靠的思考引擎。</h1>
              <p>支持 OpenAI 兼容接口。密钥进入 macOS Keychain，不写入聊天或日志。</p>
              <div className="onboarding-form">
                <label>
                  <span>Base URL</span>
                  <input value={model.baseUrl} onChange={(event) => setModel({ ...model, baseUrl: event.target.value })} />
                </label>
                <label>
                  <span>模型名称</span>
                  <input value={model.model} onChange={(event) => setModel({ ...model, model: event.target.value })} />
                </label>
                <label>
                  <span>API Key</span>
                  <input
                    type="password"
                    value={model.apiKey}
                    onChange={(event) => setModel({ ...model, apiKey: event.target.value })}
                    placeholder="留空可稍后在设置中填写"
                    autoComplete="off"
                  />
                </label>
              </div>
              <div className="onboarding-buttons">
                <button className="secondary-button" onClick={() => setStep(0)}>返回</button>
                <button className="primary-button" onClick={() => void completeModel()}>
                  {model.apiKey ? '保存并继续' : '稍后配置'}
                  <Icon name="chevronRight" size={16} />
                </button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <span className="eyebrow">你仍然掌握控制权</span>
              <h1>可以开始<br />第一件小事了。</h1>
              <div className="onboarding-rules">
                <div>
                  <span><Icon name="check" size={14} /></span>
                  <p><strong>读取按需授权</strong>你不连接的应用，随序不会读取。</p>
                </div>
                <div>
                  <span><Icon name="shield" size={14} /></span>
                  <p><strong>写入逐次确认</strong>发邮件、改文件、提交表单都需要明确批准。</p>
                </div>
                <div>
                  <span><Icon name="activity" size={14} /></span>
                  <p><strong>全程可查</strong>每次工具调用和审批决定都有本地活动记录。</p>
                </div>
              </div>
              <button
                className="primary-button wide"
                onClick={() => {
                  close()
                  setSection('connections')
                }}
              >
                连接应用
                <Icon name="chevronRight" size={16} />
              </button>
              <button
                className="wide-link-button"
                onClick={() => {
                  close()
                  setSection('home')
                }}
              >
                直接开始对话
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
