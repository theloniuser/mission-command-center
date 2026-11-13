import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar.jsx'
import ProjectTile from '../components/tiles/ProjectTile.jsx'
import TempProjectTile from '../components/tiles/TempProjectTile.jsx'
import TerminalWorkspace from '../components/tiles/TerminalWorkspace.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { useTerminal } from '../context/TerminalContext.jsx'

const TILE_ORDER_KEY = 'tile-order'
const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function Dashboard() {
  const [projects,    setProjects]    = useState([])
  const [tempProjects, setTempProjects] = useState([])
  const [projLoading, setProjLoading] = useState(true)
  const { sessions, loading: sessLoading, openLauncher } = useSession()

  const fetchProjects = useCallback(() => {
    fetch(`${API_BASE}/api/projects`)
      .then(r => r.json())
      .then(data => { setProjects(data); setProjLoading(false) })
      .catch(() => setProjLoading(false))
  }, [])

  const fetchTempProjects = useCallback(() => {
    fetch(`${API_BASE}/api/temp-projects`)
      .then(r => r.json())
      .then(setTempProjects)
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchProjects()
    fetchTempProjects()
    window.addEventListener('temp-project-created', fetchTempProjects)
    return () => window.removeEventListener('temp-project-created', fetchTempProjects)
  }, [])

  // Fixed order (config/project order) — status is shown via the tile badge instead
  // of driving position, so a tile never swaps places mid-conversation just because
  // a session crossed the active/idle/closed time threshold.
  const [tileOrder, setTileOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TILE_ORDER_KEY) || '[]') } catch { return [] }
  })
  const { getTerminalIds } = useTerminal()

  // Saved order wins; projects not yet in it (new ones) keep config order at the end
  const tiles = useMemo(() => {
    const sessionMap = Object.fromEntries(sessions.map(s => [s.projectId, s]))
    const merged = projects.map(p => ({ ...p, ...(sessionMap[p.id] ?? {}) }))
    const rank = id => { const i = tileOrder.indexOf(id); return i === -1 ? Infinity : i }
    return merged.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p.id) - rank(b.p.id) || a.i - b.i).map(x => x.p)
  }, [projects, sessions, tileOrder])

  // Tiles with an open terminal render in the workspace, so step over them when moving
  function moveTile(id, dir) {
    const visible = tiles.filter(t => getTerminalIds(t.id).length === 0).map(t => t.id)
    const at = visible.indexOf(id)
    const swapWith = visible[at + dir]
    if (at === -1 || swapWith === undefined) return
    const next = tiles.map(t => t.id)
    const a = next.indexOf(id), b = next.indexOf(swapWith)
    ;[next[a], next[b]] = [next[b], next[a]]
    setTileOrder(next)
    try { localStorage.setItem(TILE_ORDER_KEY, JSON.stringify(next)) } catch {}
  }

  const loading = projLoading || sessLoading

  return (
    <div className="page-layout">
      <main className="page-content">
        <div className="page-heading">
          <h1>Current Projects</h1>
        </div>

        <TerminalWorkspace projects={tiles} />

        {loading ? (
          <div className="tile-grid">
            <p style={{ color: 'var(--hub-text-fade)' }}>Loading...</p>
          </div>
        ) : tiles.length === 0 && tempProjects.length === 0 ? (
          <div className="tile-grid">
            <div className="tile-empty-state">
              <p>No projects configured yet.</p>
              <p>
                <Link to="/settings">Add a project in Settings</Link> to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="tile-grid">
            {tempProjects.map(t => (
              <TempProjectTile
                key={t.id}
                project={t}
                onDismiss={fetchTempProjects}
                onPromote={() => { fetchTempProjects(); fetchProjects() }}
              />
            ))}
            {tiles.map(p => (
              <ProjectTile key={p.id} project={p} onMove={dir => moveTile(p.id, dir)} />
            ))}
          </div>
        )}
      </main>

      <Sidebar onNewSession={task => openLauncher({ title: `Work on: [${task.id}] ${task.title}` })} />
    </div>
  )
}
