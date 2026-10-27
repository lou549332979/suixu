import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { useAppStore } from '../store'

interface Attachment {
  name: string
  path: string
  mime: string
  size: number
}

export function Composer({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const textarea = useRef<HTMLTextAreaElement>(null)
  const send = useAppStore((state) => state.send)
  const cancel = useAppStore((state) => state.cancel)
  const runStatus = useAppStore((state) => state.runStatus)

  useEffect(() => {
    setValue(initialValue)
    if (initialValue) requestAnimationFrame(() => textarea.current?.focus())
  }, [initialValue])

  useEffect(() => {
    if (!textarea.current) return
    textarea.current.style.height = '0px'
    textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 180)}px`
  }, [value])

  const submit = async () => {
    const text = value.trim()
    if (!text || runStatus === 'running' || runStatus === 'planning') return
    setValue('')
    setAttachments([])
    await send({ text, attachments })
  }

  const pickFiles = async () => {
    const selected = (await window.suixu.pickFiles()) as Attachment[]
    setAttachments((current) => [...current, ...selected].slice(0, 10))
  }

  const toggleRecording = async () => {
    if (recording) {
      recorder.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunks.current = []
      const mediaRecorder = new MediaRecorder(stream)
      recorder.current = mediaRecorder
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data)
      }
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunks.current, { type: mediaRecorder.mimeType })
        setTranscribing(true)
        try {
          const bytes = new Uint8Array(await blob.arrayBuffer())
          const result = await window.suixu.transcribe(bytes, blob.type)
          if (result) setValue((current) => `${current}${current ? ' ' : ''}${result}`)
        } finally {
          setTranscribing(false)
        }
      }
      mediaRecorder.start()
      setRecording(true)
    } catch {
      setRecording(false)
    }
  }

  return (
    <div className="composer-wrap">
      <div className="composer">
        {attachments.length > 0 && (
          <div className="composer-attachments">
            {attachments.map((attachment) => (
              <span key={attachment.path}>
                <Icon name={attachment.mime.startsWith('image/') ? 'text' : 'file'} size={13} />
                {attachment.name}
                <button
                  onClick={() =>
                    setAttachments((current) =>
                      current.filter((item) => item.path !== attachment.path)
                    )
                  }
                >
                  <Icon name="x" size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={textarea}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void submit()
            }
          }}
          placeholder={
            transcribing
              ? '正在把语音转成文字…'
              : '告诉随序你想完成什么，或者输入 / 查看任务'
          }
          rows={1}
          disabled={transcribing}
        />
        <div className="composer-toolbar">
          <div>
            <button className="composer-tool" onClick={() => void pickFiles()} aria-label="添加附件">
              <Icon name="paperclip" size={17} />
            </button>
            <button
              className={`composer-tool${recording ? ' recording' : ''}`}
              onClick={() => void toggleRecording()}
              aria-label={recording ? '停止录音' : '语音输入'}
            >
              <Icon name={recording ? 'square' : 'mic'} size={17} />
            </button>
            <span className="composer-hint">Enter 发送 · Shift + Enter 换行</span>
          </div>
          {runStatus === 'running' || runStatus === 'planning' ? (
            <button className="send-button stop-button" onClick={() => void cancel()} aria-label="停止">
              <Icon name="square" size={14} />
            </button>
          ) : (
            <button
              className="send-button"
              disabled={!value.trim()}
              onClick={() => void submit()}
              aria-label="发送"
            >
              <Icon name="send" size={17} />
            </button>
          )}
        </div>
      </div>
      <p className="composer-disclaimer">
        随序可能犯错，请在发送、文件修改和付款前核对关键信息。
      </p>
    </div>
  )
}
