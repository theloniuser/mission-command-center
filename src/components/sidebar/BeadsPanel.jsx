import { useEffect, useState } from 'react'
import BeadItem from './BeadItem.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function BeadsPanel({ onNewSession, refreshTick, onRefreshDone }) {
  const [groups, setGroups]   = useState([])
  const [loading, setLoading] = useState(true)

  function fetchBeads(isManual = false) {
    if (isManual) setLoading(true)
    fetch(`${API_BASE}/api/beads?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        setGroups(data.groups || [])
        setLoading(false)
        onRefreshDone?.()
      })
      .catch(() => { setLoading(false); onRefreshDone?.() })
  }

  useEffect(() => { fetchBeads() }, [])
  useEffect(() => { if (refreshTick > 0) fetchBeads(true) }, [refreshTick])
  useEffect(() => { const id = setInterval(fetchBeads, 60_000); return () => clearInterval(id) }, [])
  useEffect(() => {
    const handler = () => fetchBeads(true)
    window.addEventListener('backlog-updated', handler)
    return () => window.removeEventListener('backlog-updated', handler)
  }, [])

  if (loading) return <p className="sidebar-empty">Loading backlog...</p>

  const nonEmpty = groups.filter(g => g.beads?.length)
  if (!nonEmpty.length) return <p className="sidebar-empty">No open tasks.</p>

  return (
    <div className="beads-panel">
      {nonEmpty.map(group => (
        <div key={group.project} className={`bead-group${group.isRitual ? ' bead-group-rituals' : ''}`}>
          <div className="bead-group-header">{group.project}</div>
          {group.beads.map(bead => (
            <BeadItem key={bead.id} bead={bead} onNewSession={onNewSession} onClosed={fetchBeads} />
          ))}
        </div>
      ))}
    </div>
  )
}
