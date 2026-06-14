import { useRef, useState } from 'react'
import BeadsPanel from '../sidebar/BeadsPanel.jsx'
import BrainItemsPanel from '../sidebar/BrainItemsPanel.jsx'
import ScriptsPanel from '../sidebar/ScriptsPanel.jsx'

const MIN_WIDTH = 200
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 280
const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function Sidebar({ onNewSession }) {
  const [collapsed, setCollapsed] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const spinStart = useRef(0)
  const SPIN_MIN = 700
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const [addingBead, setAddingBead]     = useState(false)
  const [newBeadTitle, setNewBeadTitle] = useState('')
  const [addStatus, setAddStatus]       = useState(null)

  async function submitNewBead() {
    const t = newBeadTitle.trim()
    if (!t || addStatus === 'adding') return
    setAddStatus('adding')
    try {
      const res = await fetch(`${API_BASE}/api/beads/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t }),
      })
      if (!res.ok) throw new Error()
      setNewBeadTitle('')
      setAddStatus('ok')
      setRefreshTick(n => n + 1)
      setSpinning(true)
      spinStart.current = Date.now()
      setTimeout(() => { setAddStatus(null); setAddingBead(false) }, 1500)
    } catch {
      setAddStatus('error')
      setTimeout(() => setAddStatus(null), 3000)
    }
  }

  function onDragStart(e) {
    dragging.current = true
    startX.current = e.clientX
    startW.current = width
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
    e.preventDefault()
  }

  function onDragMove(e) {
    if (!dragging.current) return
    const delta = startX.current - e.clientX
    setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + delta)))
  }

  function onDragEnd() {
    dragging.current = false
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
  }

  return (
    <>
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`} style={collapsed ? {} : { width }}>
        <div className="sidebar-drag-handle" onMouseDown={onDragStart} />
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <span className="sidebar-title">Backlog</span>
            <div className="sidebar-header-actions">
              <button
                className="bead-btn beads-add"
                onClick={() => { setAddingBead(v => !v); setNewBeadTitle(''); setAddStatus(null) }}
                title="New bead"
              >+</button>
              <button className="bead-btn beads-refresh" onClick={() => { setRefreshTick(t => t + 1); setSpinning(true); spinStart.current = Date.now() }}>
                <span className={spinning ? 'refresh-icon spinning' : 'refresh-icon'}>↻</span> Refresh
              </button>
            </div>
          </div>
          {addingBead && (
            <div className="new-bead-row">
              {addStatus === 'ok'
                ? <span className="new-bead-status ok">Added to backlog ✓</span>
                : <>
                    <input
                      className="new-bead-input"
                      placeholder="New bead title..."
                      value={newBeadTitle}
                      onChange={e => setNewBeadTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitNewBead(); if (e.key === 'Escape') setAddingBead(false) }}
                      autoFocus
                      disabled={addStatus === 'adding'}
                    />
                    <button
                      className="bead-btn"
                      onClick={submitNewBead}
                      disabled={!newBeadTitle.trim() || addStatus === 'adding'}
                    >{addStatus === 'adding' ? '…' : 'Add'}</button>
                    {addStatus === 'error' && <span className="new-bead-status error">Failed</span>}
                  </>
              }
            </div>
          )}
          <BrainItemsPanel refreshTick={refreshTick} />
          <BeadsPanel onNewSession={onNewSession} refreshTick={refreshTick} onRefreshDone={() => {
            const elapsed = Date.now() - spinStart.current
            const remaining = SPIN_MIN - elapsed
            if (remaining > 0) setTimeout(() => setSpinning(false), remaining)
            else setSpinning(false)
          }} />
          <ScriptsPanel />
        </div>
      </aside>

      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
        title={collapsed ? 'Open sidebar' : 'Close sidebar'}
      >
        {collapsed ? '<' : '>'}
      </button>
    </>
  )
}
