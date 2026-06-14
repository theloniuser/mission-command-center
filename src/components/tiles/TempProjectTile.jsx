import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function TempProjectTile({ project, onDismiss, onPromote }) {
  const [saving,   setSaving]   = useState(false)
  const [nameEdit, setNameEdit] = useState(false)
  const [name,     setName]     = useState(project.name)
  const [busy,     setBusy]     = useState(false)

  async function dismiss() {
    setBusy(true)
    await fetch(`${API_BASE}/api/temp-projects/${project.id}`, { method: 'DELETE' })
    onDismiss && onDismiss()
  }

  function startSave() {
    setName(project.name)
    setNameEdit(true)
  }

  async function promote() {
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch(`${API_BASE}/api/temp-projects/${project.id}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    if (res.ok) {
      onPromote && onPromote()
    } else {
      setSaving(false)
    }
  }

  return (
    <article className="project-tile project-tile--temp">
      <div className="tile-temp-badge">Temporary</div>
      <div className="tile-body">
        <div className="tile-header">
          <h2 className="tile-project-name">{project.name}</h2>
        </div>
        <div className="tile-temp-path">{project.path}</div>

        {nameEdit ? (
          <div className="tile-temp-save-row">
            <input
              className="tile-temp-name-input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') promote(); if (e.key === 'Escape') setNameEdit(false) }}
              autoFocus
              disabled={saving}
            />
            <button className="tile-temp-btn tile-temp-save" onClick={promote} disabled={saving || !name.trim()}>
              {saving ? '…' : 'Save'}
            </button>
            <button className="tile-temp-btn" onClick={() => setNameEdit(false)} disabled={saving}>Cancel</button>
          </div>
        ) : (
          <div className="tile-temp-actions">
            <button className="tile-temp-btn tile-temp-promote" onClick={startSave} disabled={busy}>
              Save as Project
            </button>
            <button className="tile-temp-btn tile-temp-dismiss" onClick={dismiss} disabled={busy}>
              Dismiss
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
