import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar.jsx'
import ProjectTile from '../components/tiles/ProjectTile.jsx'
import TempProjectTile from '../components/tiles/TempProjectTile.jsx'
import { useSession } from '../context/SessionContext.jsx'

const STATUS_ORDER = { active: 0, idle: 1, closed: 2 }
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

  const tiles = useMemo(() => {
    const sessionMap = Object.fromEntries(sessions.map(s => [s.projectId, s]))
    return projects
      .map((p, i) => ({ ...p, _idx: i, ...(sessionMap[p.id] ?? {}) }))
      .sort((a, b) => {
        const so = (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2)
        if (so !== 0) return so
        return a._idx - b._idx  // stable within each status group — no jumping on poll
      })
  }, [projects, sessions])

  const loading = projLoading || sessLoading

  return (
    <div className="page-layout">
      <main className="page-content">
        <div className="page-heading">
          <h1>Current Projects</h1>
        </div>

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
              <ProjectTile key={p.id} project={p} />
            ))}
          </div>
        )}
      </main>

      <Sidebar onNewSession={openLauncher} />
    </div>
  )
}
