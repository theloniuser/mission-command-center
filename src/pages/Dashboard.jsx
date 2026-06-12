import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar.jsx'
import ProjectTile from '../components/tiles/ProjectTile.jsx'
import { useSession } from '../context/SessionContext.jsx'

const STATUS_ORDER = { active: 0, idle: 1, closed: 2 }

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [projLoading, setProjLoading] = useState(true)
  const { sessions, loading: sessLoading, openLauncher } = useSession()

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => { setProjects(data); setProjLoading(false) })
      .catch(() => setProjLoading(false))
  }, [])

  const tiles = useMemo(() => {
    const sessionMap = Object.fromEntries(sessions.map(s => [s.projectId, s]))
    return projects
      .map(p => ({ ...p, ...(sessionMap[p.id] ?? {}) }))
      .sort((a, b) => {
        const so = (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2)
        if (so !== 0) return so
        const ta = a.last_active_at ? new Date(a.last_active_at).getTime() : 0
        const tb = b.last_active_at ? new Date(b.last_active_at).getTime() : 0
        return tb - ta
      })
  }, [projects, sessions])

  const loading = projLoading || sessLoading

  return (
    <div className="page-layout">
      <main className="page-content">
        <div className="page-heading">
          <h1>Command Center</h1>
        </div>

        {loading ? (
          <div className="tile-grid">
            <p style={{ color: 'var(--hub-text-fade)' }}>Loading...</p>
          </div>
        ) : tiles.length === 0 ? (
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
