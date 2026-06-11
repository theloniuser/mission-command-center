import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar.jsx'
import ProjectTile from '../components/tiles/ProjectTile.jsx'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => { setProjects(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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
        ) : projects.length === 0 ? (
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
            {projects.map(p => (
              <ProjectTile key={p.id} project={p} />
            ))}
          </div>
        )}
      </main>

      <Sidebar />
    </div>
  )
}
