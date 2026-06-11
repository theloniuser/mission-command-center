import { createContext, useContext, useEffect, useState } from 'react'

const SessionContext = createContext({ sessions: [], stats: null, loading: true })

export function useSession() {
  return useContext(SessionContext)
}

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)

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

  return (
    <SessionContext.Provider value={{ sessions, stats, loading }}>
      {children}
    </SessionContext.Provider>
  )
}
