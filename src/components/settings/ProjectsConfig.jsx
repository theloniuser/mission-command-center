import { useState, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const EMPTY_FORM = { name: '', path: '', launch_command: '', color: '#6366f1' }

export default function ProjectsConfig({ projects, onRefresh }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [browsing, setBrowsing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const formRef = useRef(null)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleBrowse() {
    setBrowsing(true)
    try {
      const res = await fetch(`${API_BASE}/api/browse-folder`, { method: 'POST' })
      const data = await res.json()
      if (data.path) setForm(f => ({ ...f, path: data.path.replace(/\/$/, '') }))
    } catch {}
    setBrowsing(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.path.trim()) {
      setError('Name and path are required.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      if (editingId) {
        await fetch(`${API_BASE}/api/projects/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await fetch(`${API_BASE}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setForm(EMPTY_FORM)
      setEditingId(null)
      onRefresh()
    } catch {
      setError('Failed to save. Is the server running?')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(project) {
    setEditingId(project.id)
    setForm({ name: project.name, path: project.path, launch_command: project.launch_command || '', color: project.color || '#6366f1' })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function handleDelete(id) {
    await fetch(`${API_BASE}/api/projects/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">Projects</h2>

      {projects.length === 0 ? (
        <p style={{ color: 'var(--hub-text-fade)', fontSize: 'var(--font-size-small)', marginBottom: 'var(--space-4)' }}>
          No projects yet. Add one below.
        </p>
      ) : (
        <div className="project-list">
          {projects.map(p => (
            <div key={p.id} className="project-list-item">
              <span className="project-list-color" style={{ background: p.color }} />
              <div className="project-list-info">
                <div className="project-list-name">{p.name}</div>
                <div className="project-list-path">{p.path}</div>
              </div>
              <div className="project-list-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => startEdit(p)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="add-project-form" ref={formRef}>
        <p className="add-project-form-title">
          {editingId ? 'Edit project' : 'Add project'}
        </p>
        {error && (
          <p style={{ color: '#c0392b', fontSize: 'var(--font-size-small)', marginBottom: 'var(--space-3)' }}>
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="project-name">Name</label>
              <input
                className="form-input"
                id="project-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="my-project"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="project-path">Path</label>
              <div className="form-input-row">
                <input
                  className="form-input"
                  id="project-path"
                  name="path"
                  value={form.path}
                  onChange={handleChange}
                  placeholder="~/projects/my-project"
                  required
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleBrowse}
                  disabled={browsing}
                >
                  {browsing ? '...' : 'Browse'}
                </button>
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="project-launch-command">Launch command <span>(optional)</span></label>
              <input
                className="form-input"
                id="project-launch-command"
                name="launch_command"
                value={form.launch_command}
                onChange={handleChange}
                placeholder="claude"
              />
            </div>
            <div className="form-group" style={{ flex: '0 0 auto' }}>
              <label htmlFor="project-color">Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', height: '36px' }}>
                <input
                  type="color"
                  id="project-color"
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  style={{ width: '36px', height: '36px', padding: '2px', border: '1px solid var(--hub-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'none' }}
                />
                <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--hub-text-fade)', fontFamily: 'monospace' }}>{form.color}</span>
              </div>
            </div>
          </div>
          <div className="form-actions">
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update project' : 'Add project'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
