import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

function ItemRow({ item }) {
  const text = typeof item === 'string' ? item : (item.body || item.text || '')
  const beadId = item.bead_id || null
  return (
    <div className="brain-item">
      {beadId && <span className="bead-id">{beadId}</span>}
      <span className="brain-item-text">{text}</span>
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

  const forClaude = data.for_claude || []
  const toDo      = data.to_do || []

  return (
    <div className="brain-items-panel">
      <div className="bead-group">
        <div className="bead-group-header">For Claude</div>
        {forClaude.length > 0
          ? forClaude.map((item, i) => <ItemRow key={i} item={item} />)
          : <div className="brain-all-clear">All clear ✓</div>
        }
      </div>
      <div className="bead-group">
        <div className="bead-group-header">To Do</div>
        {toDo.length > 0
          ? toDo.map((item, i) => <ItemRow key={i} item={item} />)
          : <div className="brain-all-clear">All clear ✓</div>
        }
      </div>
    </div>
  )
}
