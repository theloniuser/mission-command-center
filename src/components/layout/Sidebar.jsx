import { useRef, useState } from 'react'
import BeadsPanel from '../sidebar/BeadsPanel.jsx'
import BrainItemsPanel from '../sidebar/BrainItemsPanel.jsx'
import ScriptsPanel from '../sidebar/ScriptsPanel.jsx'

const MIN_WIDTH = 200
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 280

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
              <button className="bead-btn beads-refresh" onClick={() => { setRefreshTick(t => t + 1); setSpinning(true); spinStart.current = Date.now() }}>
                <span className={spinning ? 'refresh-icon spinning' : 'refresh-icon'}>↻</span> Refresh
              </button>
            </div>
          </div>
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
