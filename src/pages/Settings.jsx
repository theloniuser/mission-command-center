import { useState, useEffect } from 'react'
import ProjectsConfig from '../components/settings/ProjectsConfig.jsx'
import SettingsForm from '../components/settings/SettingsForm.jsx'

export default function Settings() {
  const [projects, setProjects] = useState([])
  const [settings, setSettings] = useState(null)

  async function loadProjects() {
    const res = await fetch('/api/projects')
    setProjects(await res.json())
  }

  async function loadSettings() {
    const res = await fetch('/api/settings')
    setSettings(await res.json())
  }

  useEffect(() => {
    loadProjects()
    loadSettings()
  }, [])

  return (
    <div className="page-layout">
      <main className="page-content">
        <div className="page-heading">
          <h1>Settings</h1>
        </div>

        <div className="settings-page">
          <ProjectsConfig projects={projects} onRefresh={loadProjects} />
          {settings && (
            <SettingsForm settings={settings} onSaved={setSettings} />
          )}
        </div>
      </main>
    </div>
  )
}
