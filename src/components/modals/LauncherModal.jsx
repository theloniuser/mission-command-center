import { useState, useEffect } from 'react'
import { useTerminal } from '../../context/TerminalContext.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const AGENT_TYPES = ['Claude Code', 'claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5']
const BROWSE_ID = '__browse__'

// Single-quote the string for a POSIX shell — unlike double quotes, this blocks
// $(...), backticks, and $VAR expansion. Embedded single quotes are closed,
// escaped, and reopened.
function shQuote(str) {
  return `'${str.replace(/'/g, "'\\''")}'`
}

function FolderBrowser({ onSelect }) {
  const [path,        setPath]        = useState(null)
  const [dirs,        setDirs]        = useState([])
  const [error,       setError]       = useState(null)
  const [newName,     setNewName]     = useState('')
  const [creatingNew, setCreatingNew] = useState(false)

  async function ls(p) {
    setError(null)
    setCreatingNew(false)
    setNewName('')
    const res = await fetch(`${API_BASE}/api/ls?path=${encodeURIComponent(p)}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setPath(data.path)
    setDirs(data.dirs)
  }

  useEffect(() => { ls(window.__HOME__ || '/Users') }, [])

  function up() {
    const parts = path.replace(/\/$/, '').split('/')
    parts.pop()
    ls(parts.join('/') || '/')
  }

  async function createFolder() {
    if (!newName.trim()) return
    const newPath = `${path.replace(/\/$/, '')}/${newName.trim()}`
    const res = await fetch(`${API_BASE}/api/mkdir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    ls(newPath)
  }

  return (
    <div className="folder-browser">
      <div className="folder-browser-path">{path || '…'}</div>
      {error && <div className="folder-browser-error">{error}</div>}
      <div className="folder-browser-list">
        {path && path !== '/' && (
          <div className="folder-browser-item folder-browser-up" onClick={up}>↑ ..</div>
        )}
        {dirs.map(d => (
          <div key={d} className="folder-browser-item" onClick={() => ls(`${path.replace(/\/$/, '')}/${d}`)}>
            {d}
          </div>
        ))}
        {dirs.length === 0 && !error && <div className="folder-browser-empty">No subfolders</div>}
      </div>
      {creatingNew ? (
        <div className="folder-browser-new-row">
          <input
            className="folder-browser-new-input"
            autoFocus
            placeholder="folder-name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setCreatingNew(false) }}
          />
          <button className="modal-btn-pick" onClick={createFolder}>Create</button>
          <button className="modal-btn-pick" onClick={() => setCreatingNew(false)}>Cancel</button>
        </div>
      ) : (
        <div className="folder-browser-actions">
          <button className="modal-btn-pick" onClick={() => setCreatingNew(true)}>+ New Folder</button>
          <button className="modal-btn-primary folder-browser-select" onClick={() => onSelect(path)} disabled={!path}>
            Select this folder
          </button>
        </div>
      )}
    </div>
  )
}

export default function LauncherModal({ isOpen, initialContext, onClose }) {
  const [projects,     setProjects]     = useState([])
  const [projectId,    setProjectId]    = useState('')
  const [browsedPath,  setBrowsedPath]  = useState(null)
  const [agentType,    setAgentType]    = useState('Claude Code')
  const [contextTitle, setContextTitle] = useState('')
  const [launching,    setLaunching]    = useState(false)
  const [error,        setError]        = useState(null)

  const { openNewPane, setLaunchOverride } = useTerminal()

  useEffect(() => {
    if (!isOpen) return
    fetch(`${API_BASE}/api/projects`).then(r => r.json()).then(data => {
      setProjects(data)
      if (data.length) setProjectId(data[0].id)
    })
    setContextTitle(initialContext?.title || '')
    setBrowsedPath(null)
    setError(null)
  }, [isOpen, initialContext])

  async function handleLaunch() {
    if (projectId === BROWSE_ID) {
      if (!browsedPath) return
      setLaunching(true)
      setError(null)
      try {
        const command = contextTitle
          ? `claude ${shQuote(contextTitle)}`
          : 'claude'
        const res = await fetch(`${API_BASE}/api/launch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath: browsedPath, command }),
        })
        if (!res.ok) {
          const d = await res.json()
          setError(d.error || 'Launch failed')
          return
        }
        await fetch(`${API_BASE}/api/temp-projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: browsedPath }),
        }).catch(() => {})
        window.dispatchEvent(new CustomEvent('temp-project-created'))
        onClose()
      } catch (err) {
        setError(err.message)
      } finally {
        setLaunching(false)
      }
      return
    }

    const terminalId = openNewPane(projectId)
    if (contextTitle.trim()) {
      setLaunchOverride(terminalId, contextTitle.trim())
    }
    onClose()
  }

  const canLaunch = projectId === BROWSE_ID ? !!browsedPath : !!projectId

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Launch Session</h2>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">
          <label className="modal-field">
            <span>Project</span>
            <select value={projectId} onChange={e => { setProjectId(e.target.value); setBrowsedPath(null) }}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option disabled>──────────</option>
              <option value={BROWSE_ID}>Browse for folder...</option>
            </select>
          </label>
          {projectId === BROWSE_ID && !browsedPath && (
            <FolderBrowser onSelect={p => setBrowsedPath(p)} />
          )}
          {projectId === BROWSE_ID && browsedPath && (
            <div className="modal-browse-selected">
              <span className="modal-browse-path">{browsedPath}</span>
              <button className="modal-btn-pick" onClick={() => setBrowsedPath(null)}>Change</button>
            </div>
          )}
          <label className="modal-field">
            <span>Agent type</span>
            <select value={agentType} onChange={e => setAgentType(e.target.value)}>
              {AGENT_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          {contextTitle && (
            <label className="modal-field">
              <span>Context</span>
              <input
                type="text"
                value={contextTitle}
                onChange={e => setContextTitle(e.target.value)}
              />
            </label>
          )}
          {error && <p className="modal-error">{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="modal-btn-primary"
            onClick={handleLaunch}
            disabled={launching || !canLaunch}
          >
            {launching ? 'Launching...' : 'Launch'}
          </button>
        </div>
      </div>
    </div>
  )
}
