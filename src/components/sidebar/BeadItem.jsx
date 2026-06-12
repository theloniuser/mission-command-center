export default function BeadItem({ bead, onNewSession }) {
  function handleCopy() {
    navigator.clipboard.writeText(bead.title)
  }

  return (
    <div className="bead-item">
      <div className="bead-main">
        <span className={`bead-priority p${bead.priority}`}>P{bead.priority}</span>
        <span className="bead-title">{bead.title}</span>
      </div>
      <div className="bead-actions">
        <button className="bead-btn bead-launch" onClick={() => onNewSession(bead)} title="Launch new session">
          Launch
        </button>
        <button className="bead-btn bead-copy" onClick={handleCopy} title="Copy title to clipboard">
          Copy
        </button>
      </div>
    </div>
  )
}
