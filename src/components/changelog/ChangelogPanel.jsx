import { useEffect, useState } from 'react'
import ChangelogEntry from './ChangelogEntry.jsx'

export default function ChangelogPanel({ projectId }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  function fetchChangelogs() {
    fetch(`/api/changelogs/${projectId}`)
      .then(r => r.json())
      .then(data => { setEntries(data); setLoading(false); setError(null) })
      .catch(() => { setError('Failed to load changelogs'); setLoading(false) })
  }

  useEffect(() => {
    fetchChangelogs()
    const id = setInterval(fetchChangelogs, 30_000)
    return () => clearInterval(id)
  }, [projectId])

  if (loading) return <p className="changelog-empty">Loading...</p>
  if (error)   return <p className="changelog-empty changelog-error">{error}</p>
  if (!entries.length) return <p className="changelog-empty">No changelogs found.</p>

  return (
    <div className="changelog-list">
      {entries.map(entry => (
        <ChangelogEntry key={entry.filename} entry={entry} />
      ))}
    </div>
  )
}
