import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useAlerts } from '../hooks/useAlerts.js'

const SessionContext = createContext({
  sessions: [], stats: null, loading: true, settings: null,
  alerts: [], dismiss: () => {},
  launcherOpen: false, launcherBead: null, openLauncher: () => {}, closeLauncher: () => {},
  brainOpen: false, openBrain: () => {}, closeBrain: () => {},
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
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [launcherBead, setLauncherBead] = useState(null)
  const [brainOpen, setBrainOpen]       = useState(false)

  function openLauncher(bead = null) {
    setLauncherBead(bead)
    setLauncherOpen(true)
  }
  function closeLauncher() {
    setLauncherOpen(false)
    setLauncherBead(null)
  }
  function openBrain()  { setBrainOpen(true) }
  function closeBrain() { setBrainOpen(false) }

  function fetchSessions() {
    fetch('/api/sessions')
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
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => {})
  }, [])

  const { alerts, dismiss } = useAlerts(sessions, settings)

  return (
    <SessionContext.Provider value={{
      sessions, stats, loading, settings,
      alerts, dismiss,
      launcherOpen, launcherBead, openLauncher, closeLauncher,
      brainOpen, openBrain, closeBrain,
    }}>
      {children}
    </SessionContext.Provider>
  )
}
