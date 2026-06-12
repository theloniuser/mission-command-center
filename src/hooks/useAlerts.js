import { useState, useRef, useEffect } from 'react'

const THRESHOLD_MAP = [
  { key: '80k',  limit: 80000,  action: '/compact', label: '/compact' },
  { key: '120k', limit: 120000, action: '/handoff', label: '/handoff' },
  { key: '150k', limit: 150000, action: '/clear',   label: '/clear'   },
]

export function useAlerts(sessions, settings) {
  const [alerts, setAlerts] = useState([])
  const firedRef            = useRef(new Map())
  const inactivityMs        = (settings?.alerts?.inactivity_timeout ?? 30) * 60 * 1000

  useEffect(() => {
    const now = Date.now()
    const newAlerts = []

    for (const session of sessions) {
      if (!session.projectId) continue
      const pid   = session.projectId
      const fired = firedRef.current.get(pid) ?? new Set()

      for (const { key, limit, action, label } of THRESHOLD_MAP) {
        if (session.token_count >= limit && !fired.has(key)) {
          fired.add(key)
          newAlerts.push({
            id: `${pid}-${key}-${now}`, projectId: pid,
            message: `${session.projectName ?? pid.slice(0, 8)}: ${(session.token_count / 1000).toFixed(0)}K tokens`,
            action, actionLabel: label, type: key === '80k' ? 'warn' : 'critical',
          })
        }
        if (session.token_count < limit * 0.5) fired.delete(key)
      }

      if (session.status !== 'closed' && session.last_active_at && !fired.has('inactivity')) {
        const inactive = now - new Date(session.last_active_at).getTime()
        if (inactive >= inactivityMs) {
          fired.add('inactivity')
          newAlerts.push({
            id: `${pid}-inactivity-${now}`, projectId: pid,
            message: `${session.projectName ?? pid.slice(0, 8)}: inactive ${Math.round(inactive / 60000)} min`,
            action: null, actionLabel: null, type: 'info',
          })
        }
      }
      if (session.status === 'active') fired.delete('inactivity')
      firedRef.current.set(pid, fired)
    }

    if (newAlerts.length) setAlerts(prev => [...prev, ...newAlerts])
  }, [sessions, inactivityMs])

  function dismiss(id) { setAlerts(prev => prev.filter(a => a.id !== id)) }
  return { alerts, dismiss }
}
