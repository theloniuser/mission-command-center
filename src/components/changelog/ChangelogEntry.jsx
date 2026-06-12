import { useState } from 'react'

function formatDate(isoDate) {
  if (!isoDate) return 'Unknown date'
  const d = new Date(isoDate)
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function ChangelogEntry({ entry }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`changelog-entry ${expanded ? 'changelog-entry--expanded' : ''}`}>
      <button
        className="changelog-entry-header"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <span className="changelog-date">{formatDate(entry.date)}</span>
        <span className="changelog-expand-icon">{expanded ? '▴' : '▾'}</span>
      </button>
      {!expanded && (
        <p className="changelog-preview">{entry.preview}</p>
      )}
      {expanded && (
        <pre className="changelog-content">{entry.content}</pre>
      )}
    </div>
  )
}
