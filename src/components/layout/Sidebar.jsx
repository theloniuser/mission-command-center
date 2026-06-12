import { useState } from 'react'
import BeadsPanel from '../sidebar/BeadsPanel.jsx'

export default function Sidebar({ onNewSession }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <span className="sidebar-title">Backlog</span>
          </div>
          <BeadsPanel onNewSession={onNewSession} />
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
