import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const AGENT_TYPES = ['Claude Code', 'claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5']
const BROWSE_ID = '__browse__'

export default function LauncherModal({ isOpen, initialBead, onClose }) {
  const [projects,    setProjects]    = useState([])
  const [projectId,   setProjectId]   = useState('')
  const [browsedPath, setBrowsedPath] = useState(null)
  const [browsing,    setBrowsing]    = useState(false)
  const [agentType,   setAgentType]   = useState('Claude Code')
  const [beadTitle,   setBeadTitle]   = useState('')
  const [launching,   setLaunching]   = useState(false)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    if (!isOpen) return
    fetch(`${API_BASE}/api/projects`).then(r => r.json()).then(data => {
      setProjects(data)
      if (data.length) setProjectId(data[0].id)
    })
    setBeadTitle(initialBead?.title || '')
    setBrowsedPath(null)
    setError(null)
  }, [isOpen, initialBead])

  async function handleProjectChange(val) {
    setProjectId(val)
    setBrowsedPath(null)
    if (val !== BROWSE_ID) return
    setBrowsing(true)
    try {
      const res = await fetch(`${API_BASE}/api/browse-folder`, { method: 'POST' })
      const { path } = await res.json()
      if (path) setBrowsedPath(path)
      else setProjectId(projects[0]?.id || '')
    } catch {
      setProjectId(projects[0]?.id || '')
    } finally {
      setBrowsing(false)
    }
  }

  async function handleLaunch() {
    const launchPath = projectId === BROWSE_ID
      ? browsedPath
      : projects.find(p => p.id === projectId)?.path
    if (!launchPath) return
    setLaunching(true)
    setError(null)
    try {
      const command = beadTitle
        ? `claude --context "${beadTitle.replace(/"/g, '\\"')}"`
        : 'claude'
      const res = await fetch(`${API_BASE}/api/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: launchPath, command }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Launch failed')
      } else {
        onClose()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLaunching(false)
    }
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
            <select value={projectId} onChange={e => handleProjectChange(e.target.value)} disabled={browsing}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option disabled>──────────</option>
              <option value={BROWSE_ID}>Browse for folder...</option>
            </select>
          </label>
          {projectId === BROWSE_ID && (
            <div className="modal-browse-path">
              {browsing ? 'Picking folder…' : browsedPath || 'No folder selected'}
            </div>
          )}
          <label className="modal-field">
            <span>Agent type</span>
            <select value={agentType} onChange={e => setAgentType(e.target.value)}>
              {AGENT_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          {beadTitle && (
            <label className="modal-field">
              <span>Bead context</span>
              <input
                type="text"
                value={beadTitle}
                onChange={e => setBeadTitle(e.target.value)}
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
