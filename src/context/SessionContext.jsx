import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useAlerts } from '../hooks/useAlerts.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const SessionContext = createContext({
  sessions: [], stats: null, loading: true, settings: null,
  alerts: [], dismiss: () => {},
  launcherOpen: false, launcherContext: null, openLauncher: () => {}, closeLauncher: () => {},
})

export function useSession() {
  return useContext(SessionContext)
}

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [settings, setSettings] = useState(null)

  // modal state
  const [launcherOpen, setLauncherOpen]       = useState(false)
  const [launcherContext, setLauncherContext] = useState(null)

  function openLauncher(context = null) {
    setLauncherContext(context)
    setLauncherOpen(true)
  }
  function closeLauncher() {
    setLauncherOpen(false)
    setLauncherContext(null)
  }

  function fetchSessions() {
    fetch(`${API_BASE}/api/sessions`)
      .then(r => r.json())
      .then(data => {
        setSessions(data.sessions || [])
        setStats(data.summary || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchSessions()
    const id = setInterval(fetchSessions, 10_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`).then(r => r.json()).then(setSettings).catch(() => {})
  }, [])

  const { alerts, dismiss } = useAlerts(sessions, settings)

  return (
    <SessionContext.Provider value={{
      sessions, stats, loading, settings,
      alerts, dismiss,
      launcherOpen, launcherContext, openLauncher, closeLauncher,
    }}>
      {children}
    </SessionContext.Provider>
  )
}
