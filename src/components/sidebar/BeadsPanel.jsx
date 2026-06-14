import { useEffect, useState } from 'react'
import BeadItem from './BeadItem.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || ''


export default function BeadsPanel({ onNewSession, refreshTick, onRefreshDone }) {
  const [groups, setGroups]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  function fetchBeads(isManual = false) {
    if (isManual) setLoading(true)
    fetch(`${API_BASE}/api/beads?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { setGroups(data.groups || []); setLoading(false); setError(null); onRefreshDone?.() })
      .catch(() => { setError('Failed to load beads'); setLoading(false); onRefreshDone?.() })
  }

  useEffect(() => { fetchBeads() }, [])

  useEffect(() => { if (refreshTick > 0) fetchBeads(true) }, [refreshTick])

  useEffect(() => {
    const id = setInterval(fetchBeads, 60_000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <p className="sidebar-empty">Loading backlog...</p>
  if (error)   return <p className="sidebar-empty sidebar-error">{error}</p>
  if (!groups.length) return <p className="sidebar-empty">No open beads.</p>

  const allBeads = groups.flatMap(g => g.beads)
  const rituals = allBeads.filter(b => b.title.toLowerCase().includes('ritual'))
  const nonRitualGroups = groups.map(g => ({
    ...g,
    beads: g.beads.filter(b => !b.title.toLowerCase().includes('ritual'))
  })).filter(g => g.beads.length > 0)

  return (
    <div className="beads-panel">
      {rituals.length > 0 && (
        <div className="bead-group bead-group-rituals">
          <div className="bead-group-header">Rituals</div>
          {rituals.map(bead => (
            <BeadItem key={bead.id} bead={bead} onNewSession={onNewSession} />
          ))}
        </div>
      )}
      {nonRitualGroups.map(group => (
        <div key={group.project} className="bead-group">
          <div className="bead-group-header">{group.project}</div>
          {group.beads.map(bead => (
            <BeadItem key={bead.id} bead={bead} onNewSession={onNewSession} />
          ))}
        </div>
      ))}
    </div>
  )
}
