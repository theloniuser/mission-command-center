import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

function ItemRow({ item, prefix, onPromoted }) {
  const text   = typeof item === 'string' ? item : (item.body || item.text || '')
  const beadId = item.bead_id || null
  const [status, setStatus] = useState(null) // null | 'promoting' | 'ok' | 'error'

  async function promote() {
    if (status === 'promoting') return
    setStatus('promoting')
    try {
      const res = await fetch(`${API_BASE}/api/promote-to-backlog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text, prefix }),
      })
      if (!res.ok) throw new Error()
      setStatus('ok')
      // Trigger beads panel refresh immediately (bead already created)
      window.dispatchEvent(new CustomEvent('backlog-updated'))
      // Trigger brain items refresh after regen (~6s)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('brain-captured'))
        onPromoted && onPromoted()
      }, 6000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus(null), 3000)
    }
  }

  if (status === 'ok') {
    return <div className="brain-item brain-item-promoted">→ Added to backlog ✓</div>
  }

  return (
    <div className="brain-item">
      <div className="brain-item-body">
        {beadId && <span className="bead-id">{beadId}</span>}
        <span className="brain-item-text">{text}</span>
      </div>
      <button
        className="brain-item-promote"
        title="Add to backlog + mark resolved"
        onClick={promote}
        disabled={status === 'promoting'}
      >{status === 'promoting' ? '…' : status === 'error' ? '✗' : '→'}</button>
    </div>
  )
}

export default function BrainItemsPanel({ refreshTick }) {
  const [data, setData] = useState({ for_claude: [], to_do: [] })

  function fetchItems() {
    fetch(`${API_BASE}/api/brain-items?t=${Date.now()}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
  }

  useEffect(() => { fetchItems() }, [])
  useEffect(() => { if (refreshTick > 0) fetchItems() }, [refreshTick])
  useEffect(() => {
    window.addEventListener('brain-captured', fetchItems)
    return () => window.removeEventListener('brain-captured', fetchItems)
  }, [])

  const forClaude = data.for_claude || []
  const toDo      = data.to_do || []

  return (
    <div className="brain-items-panel">
      <div className="bead-group">
        <div className="bead-group-header">For Claude</div>
        {forClaude.length > 0
          ? forClaude.map((item, i) => (
              <ItemRow key={i} item={item} prefix="For Claude:" onPromoted={fetchItems} />
            ))
          : <div className="brain-all-clear">All clear ✓</div>
        }
      </div>
      <div className="bead-group">
        <div className="bead-group-header">To Do</div>
        {toDo.length > 0
          ? toDo.map((item, i) => (
              <ItemRow key={i} item={item} prefix="To do:" onPromoted={fetchItems} />
            ))
          : <div className="brain-all-clear">All clear ✓</div>
        }
      </div>
    </div>
  )
}
