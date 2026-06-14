import { useState } from 'react'

const SCRIPTS = [
  { id: 'wake',  label: 'Disable sleep',     cmd: '~/bin/wake-thelonius.sh' },
  { id: 'sleep', label: 'Re-enable sleep',   cmd: '~/bin/sleep-thelonius.sh' },
]

function ScriptItem({ label, cmd }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="script-item">
      <div className="script-label">{label}</div>
      <div className="script-row">
        <code className="script-cmd">{cmd}</code>
        <button className="bead-btn script-copy" onClick={handleCopy} title="Copy command">
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

export default function ScriptsPanel() {
  return (
    <div className="scripts-panel">
      <div className="bead-group-header">Scripts — Thelonius</div>
      {SCRIPTS.map(s => (
        <ScriptItem key={s.id} label={s.label} cmd={s.cmd} />
      ))}
    </div>
  )
}
