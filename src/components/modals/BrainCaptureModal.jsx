import { useState, useRef, useEffect } from 'react'

export default function BrainCaptureModal({ isOpen, onClose }) {
  const [text,    setText]    = useState('')
  const [sending, setSending] = useState(false)
  const [status,  setStatus]  = useState(null)
  const [errMsg,  setErrMsg]  = useState('')
  const textareaRef           = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    setText(''); setStatus(null); setErrMsg('')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [isOpen])

  async function handleSend() {
    if (!text.trim()) return
    setSending(true); setStatus(null)
    try {
      const res = await fetch('/api/brain-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setStatus('error'); setErrMsg(data.error || 'Failed') }
      else         { setStatus('ok'); setTimeout(onClose, 1200) }
    } catch (err) {
      setStatus('error'); setErrMsg(err.message)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Capture to Brain</h2>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">
          <textarea
            ref={textareaRef}
            className="brain-textarea"
            placeholder="What do you want to remember?"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={5}
          />
          {status === 'ok'    && <p className="brain-status ok">Captured</p>}
          {status === 'error' && <p className="brain-status error">{errMsg}</p>}
        </div>
        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="modal-btn-primary"
            onClick={handleSend}
            disabled={sending || !text.trim()}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
