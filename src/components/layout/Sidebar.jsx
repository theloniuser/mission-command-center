import { useState } from 'react'

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <span className="sidebar-title">Backlog</span>
          </div>
          <p className="sidebar-empty">
            Backlog panel available in Milestone 3.
          </p>
        </div>
      </aside>

      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
        title={collapsed ? 'Open sidebar' : 'Close sidebar'}
      >
        {collapsed ? '◂' : '▸'}
      </button>
    </>
  )
}
