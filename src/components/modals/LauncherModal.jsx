import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const AGENT_TYPES = ['Claude Code', 'claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5']
const MODELS      = ['claude-sonnet-4-6', 'claude-opus-4-8', 'claude-haiku-4-5']

export default function LauncherModal({ isOpen, initialBead, onClose }) {
  const [projects,   setProjects]   = useState([])
  const [projectId,  setProjectId]  = useState('')
  const [agentType,  setAgentType]  = useState('Claude Code')
  const [model,      setModel]      = useState('claude-sonnet-4-6')
  const [beadTitle,  setBeadTitle]  = useState('')
  const [launching,  setLaunching]  = useState(false)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    if (!isOpen) return
    fetch(`${API_BASE}/api/projects`).then(r => r.json()).then(data => {
      setProjects(data)
      if (data.length) setProjectId(data[0].id)
    })
    setBeadTitle(initialBead?.title || '')
    setError(null)
  }, [isOpen, initialBead])

  async function handleLaunch() {
    const project = projects.find(p => p.id === projectId)
    if (!project) return
    setLaunching(true)
    setError(null)
    try {
      const command = beadTitle
        ? `claude --context "${beadTitle.replace(/"/g, '\\"')}"`
        : 'claude'
      const res = await fetch(`${API_BASE}/api/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: project.path, command }),
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
            <select value={projectId} onChange={e => setProjectId(e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="modal-field">
            <span>Agent type</span>
            <select value={agentType} onChange={e => setAgentType(e.target.value)}>
              {AGENT_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="modal-field">
            <span>Model</span>
            <select value={model} onChange={e => setModel(e.target.value)}>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
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
            disabled={launching || !projectId}
          >
            {launching ? 'Launching...' : 'Launch'}
          </button>
        </div>
      </div>
    </div>
  )
}
