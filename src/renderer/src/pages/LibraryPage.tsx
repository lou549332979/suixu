import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { useAppStore } from '../store'

type LibraryFilter = 'all' | 'documents' | 'media' | 'recent'

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return 'text'
  if (mime.includes('spreadsheet') || mime.includes('csv')) return 'spreadsheet'
  if (mime.includes('pdf') || mime.includes('word') || mime.includes('text')) return 'text'
  return 'file'
}

function fileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function LibraryPage() {
  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [query, setQuery] = useState('')
  const artifacts = useAppStore((state) => state.data?.artifacts ?? [])
  const openDataFolder = () => window.suixu.openDataFolder()

  const filtered = useMemo(() => {
    let items = artifacts
    if (filter === 'documents') {
      items = items.filter(
        (item) => !item.mime.startsWith('image/') && !item.mime.startsWith('video/')
      )
    } else if (filter === 'media') {
      items = items.filter(
        (item) => item.mime.startsWith('image/') || item.mime.startsWith('video/')
      )
    } else if (filter === 'recent') {
      items = items.filter(
        (item) => Date.now() - new Date(item.createdAt).getTime() < 7 * 24 * 3_600_000
      )
    }
    if (query.trim()) {
      items = items.filter((item) =>
        item.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    }
    return items
  }, [artifacts, filter, query])

  return (
    <div className="page-scroll">
      <div className="page-container">
        <section className="page-heading row-heading library-heading">
          <div>
            <span className="eyebrow">所有工作，都有迹可循</span>
            <h1>资料库</h1>
            <p>随序生成的文档、表格、截图与你添加的附件，都收在本地工作区。</p>
          </div>
          <button className="secondary-button" onClick={openDataFolder}>
            <Icon name="folder" size={16} />
            打开工作区
          </button>
        </section>

        <div className="library-toolbar">
          <div className="segmented">
            {[
              ['all', '全部'],
              ['documents', '文档'],
              ['media', '图片与媒体'],
              ['recent', '最近 7 天']
            ].map(([id, label]) => (
              <button
                key={id}
                className={filter === id ? 'active' : ''}
                onClick={() => setFilter(id as LibraryFilter)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="small-search">
            <Icon name="search" size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索资料"
            />
          </label>
        </div>

        {filtered.length ? (
          <div className="artifact-grid">
            {filtered.map((artifact, index) => (
              <article className="artifact-card" key={artifact.id}>
                <div className={`artifact-preview preview-tone-${index % 5}`}>
                  {artifact.mime.startsWith('image/') ? (
                    <img src={`file://${artifact.path}`} alt="" />
                  ) : (
                    <>
                      <span className="file-ribbon">{artifact.name.split('.').at(-1)?.toUpperCase()}</span>
                      <div className="document-skeleton">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                    </>
                  )}
                  <div className="artifact-hover-actions">
                    <button title="打开" onClick={() => void window.suixu.openArtifact(artifact.id)}>
                      <Icon name="external" size={16} />
                    </button>
                    <button title="在 Finder 中显示" onClick={() => void window.suixu.revealArtifact(artifact.id)}>
                      <Icon name="folder" size={16} />
                    </button>
                  </div>
                </div>
                <div className="artifact-info">
                  <span className="artifact-type-icon">
                    <Icon name={fileIcon(artifact.mime)} size={16} />
                  </span>
                  <div>
                    <strong>{artifact.name}</strong>
                    <small>
                      {fileSize(artifact.size)} ·{' '}
                      {new Intl.DateTimeFormat('zh-CN', {
                        month: 'short',
                        day: 'numeric'
                      }).format(new Date(artifact.createdAt))}
                    </small>
                  </div>
                  <button className="icon-button" aria-label="更多">
                    <Icon name="more" size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state large-empty">
            <span className="empty-icon"><Icon name="library" size={28} /></span>
            <h2>{query ? '没有找到相关资料' : '资料库还是空的'}</h2>
            <p>
              {query
                ? '换一个关键词试试。'
                : '让随序生成一份文档、表格或网页研究，产物会自动出现在这里。'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
