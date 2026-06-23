import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

function formatRelative(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (h < 1)  return 'just now'
  if (h < 24) return `${h}h ago`
  if (d < 7)  return `${d}d ago`
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatNextRun(nextRunMs) {
  const diff = nextRunMs - Date.now()
  if (diff <= 0) return 'overdue'
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (h < 1)  return 'less than 1h'
  if (h < 24) return `${h}h`
  return `${d}d`
}

const TITLE_LIMIT = 100

export default function BeadItem({ bead, onNewSession, onClosed }) {
  const [closing, setClosing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const needsTrunc = bead.title.length > TITLE_LIMIT
  const displayTitle = needsTrunc && !expanded ? bead.title.slice(0, TITLE_LIMIT) + '…' : bead.title

  function handleCopy() {
    function markCopied() {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(`Work on: ${bead.title}`).then(markCopied)
    } else {
      const ta = document.createElement('textarea')
      ta.value = `Work on: ${bead.title}`
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      if (document.execCommand('copy')) markCopied()
      document.body.removeChild(ta)
    }
  }

  async function handleClose() {
    if (closing) return
    setClosing(true)
    try {
      await fetch(`${API_BASE}/api/beads/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `${bead.project}-${bead.id}` }),
      })
      window.dispatchEvent(new CustomEvent('backlog-updated'))
      onClosed && onClosed()
    } catch {
      setClosing(false)
    }
  }

  return (
    <div className={`bead-item${closing ? ' bead-item-closing' : ''}`}>
      <div className="bead-main">
        <input
          type="checkbox"
          className="bead-close-check"
          checked={closing}
          onChange={handleClose}
          title="Close bead"
        />
        <span className="bead-id">{bead.id}</span>
        <span className="bead-title">
          {displayTitle}
          {needsTrunc && (
            <button
              className="bead-title-toggle"
              onClick={() => setExpanded(e => !e)}
              title={expanded ? 'Show less' : 'Show more'}
            >
              {expanded ? 'less' : 'more'}
            </button>
          )}
        </span>
      </div>
      {(bead.lastRun || bead.nextRunMs) && (
        <div className="bead-last-run">
          {bead.lastRun && <>last run {formatRelative(bead.lastRun)}</>}
          {bead.lastRun && bead.nextRunMs && <span className="bead-next-run-sep"> · </span>}
          {bead.nextRunMs && <span className={bead.nextRunMs < Date.now() ? 'bead-next-run overdue' : 'bead-next-run'}>re-run in {formatNextRun(bead.nextRunMs)}</span>}
        </div>
      )}
      <div className="bead-actions">
        <button className="bead-btn bead-launch" onClick={() => onNewSession(bead)} title="Launch new session">
          Launch
        </button>
        <button className="bead-btn bead-copy" onClick={handleCopy} title="Copy title to clipboard">
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
