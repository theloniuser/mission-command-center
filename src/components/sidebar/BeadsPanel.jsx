import { useEffect, useState } from 'react'
import BeadItem from './BeadItem.jsx'

function parseBacklogJson(data) {
  const flat = data.backlog || []
  const map = {}
  for (const b of flat) {
    const cat = b.category || 'Other'
    if (!map[cat]) map[cat] = []
    map[cat].push(b)
  }
  return Object.entries(map).map(([project, beads]) => ({ project, beads }))
}

export default function BeadsPanel({ onNewSession }) {
  const [groups, setGroups]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  function fetchBeads() {
    fetch(`/backlog.json?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { setGroups(parseBacklogJson(data)); setLoading(false); setError(null) })
      .catch(() => { setError('Failed to load beads'); setLoading(false) })
  }

  useEffect(() => {
    fetchBeads()
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
      <div className="beads-toolbar">
        <button className="bead-btn beads-refresh" onClick={fetchBeads}>↻ Refresh</button>
      </div>
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
