import { useEffect, useState } from 'react'
import BeadItem from './BeadItem.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const CATEGORY_ORDER = ['Rituals', 'Blue Ribbon', 'Biz Dev', 'ADS Internal', 'Skills & Tools', 'Other']

function categorize(title) {
  const t = title.toLowerCase()
  if (t.includes('ritual')) return 'Rituals'
  if (/\bbr\b|blue ribbon|vanderbilt|stanchion|matcha|toy story|jmu|sushi|ueki/.test(t)) return 'Blue Ribbon'
  if (/seaco|b&e|pitch|kathleen|brain reserve/.test(t)) return 'Biz Dev'
  if (/\bskill\b|frontend-design|template|ads-pdf/.test(t)) return 'Skills & Tools'
  return 'ADS Internal'
}

export default function BeadsPanel({ onNewSession, refreshTick, onRefreshDone }) {
  const [beads, setBeads]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  function fetchBeads(isManual = false) {
    if (isManual) setLoading(true)
    fetch(`${API_BASE}/api/beads?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        const all = (data.groups || []).flatMap(g => g.beads)
        setBeads(all)
        setLoading(false)
        setError(null)
        onRefreshDone?.()
      })
      .catch(() => { setError('Failed to load beads'); setLoading(false); onRefreshDone?.() })
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
  if (error)   return <p className="sidebar-empty sidebar-error">{error}</p>
  if (!beads.length) return <p className="sidebar-empty">No open beads.</p>

  const grouped = {}
  for (const bead of beads) {
    const cat = categorize(bead.title)
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(bead)
  }

  return (
    <div className="beads-panel">
      {CATEGORY_ORDER.filter(cat => grouped[cat]?.length).map(cat => (
        <div key={cat} className={`bead-group${cat === 'Rituals' ? ' bead-group-rituals' : ''}`}>
          <div className="bead-group-header">{cat}</div>
          {grouped[cat].map(bead => (
            <BeadItem key={bead.id} bead={bead} onNewSession={onNewSession} onClosed={fetchBeads} />
          ))}
        </div>
      ))}
    </div>
  )
}
