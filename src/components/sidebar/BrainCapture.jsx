import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function BrainCapture({ inline = false }) {
  const [text, setText]     = useState('')
  const [status, setStatus] = useState(null) // null | 'sending' | 'ok' | 'error'

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  async function submit() {
    const t = text.trim()
    if (!t || status === 'sending') return
    setStatus('sending')
    try {
      const res = await fetch(`${API_BASE}/api/brain-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t }),
      })
      if (!res.ok) throw new Error()
      setText('')
      setStatus('ok')
      setTimeout(() => setStatus(null), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus(null), 3000)
    }
  }

  if (inline) {
    if (status === 'ok') return (
      <div className="brain-capture-inline">
        <span className="brain-capture-confirmed">Captured to Brain ✓</span>
      </div>
    )
    return (
      <div className="brain-capture-inline">
        <input
          className="brain-capture-input-inline"
          placeholder="Capture a thought to Brain..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={status === 'sending'}
        />
        {status === 'error' && <span className="brain-capture-err">Failed</span>}
        <button
          className="bead-btn brain-capture-send"
          onClick={submit}
          disabled={!text.trim() || status === 'sending'}
        >{status === 'sending' ? '…' : 'Send'}</button>
      </div>
    )
  }

  return (
    <div className="brain-capture">
      <textarea
        className="brain-capture-input"
        placeholder="Capture a thought to Brain..."
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        disabled={status === 'sending'}
      />
      <div className="brain-capture-footer">
        {status === 'ok'      && <p className="brain-capture-status ok">Captured</p>}
        {status === 'error'   && <p className="brain-capture-status error">Failed — check server</p>}
        {status === 'sending' && <p className="brain-capture-status sending">Capturing…</p>}
        {!status && <span className="brain-capture-hint">Enter to send</span>}
        <button
          className="bead-btn brain-capture-send"
          onClick={submit}
          disabled={!text.trim() || status === 'sending'}
        >Send</button>
      </div>
    </div>
  )
}
