import { useRef, useState, useEffect } from 'react'
import ScriptsPanel from '../sidebar/ScriptsPanel.jsx'

const MIN_WIDTH = 200
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 280

function TasksPanel() {
  const [tasks, setTasks] = useState([])
  const [input, setInput] = useState('')

  useEffect(() => {
    fetch('/api/tasks').then(r => r.json()).then(setTasks).catch(() => {})
  }, [])

  function addTask(e) {
    e.preventDefault()
    const title = input.trim()
    if (!title) return
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
      .then(r => r.json())
      .then(task => { setTasks(prev => [task, ...prev]); setInput('') })
      .catch(() => {})
  }

  function closeTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
    fetch(`/api/tasks/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  return (
    <div className="panel tasks-panel">
      <form className="task-add-form" onSubmit={addTask}>
        <input
          className="task-add-input"
          placeholder="Add a to-do..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit" className="task-add-btn">+</button>
      </form>
      {tasks.length === 0 ? (
        <div className="panel-empty">No open tasks</div>
      ) : (
        <ul className="task-list">
          {tasks.map(t => (
            <li key={t.id} className="task-item">
              <span className="task-title">{t.title}</span>
              <button className="task-close" onClick={() => closeTask(t.id)} aria-label="Close task">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Sidebar({ onNewSession }) {
  const [collapsed, setCollapsed] = useState(false)
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
            <span className="sidebar-title">Tasks</span>
          </div>
          <TasksPanel />
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
