import { useState, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const TEXT_EXTS = /\.(txt|md|markdown|json|js|jsx|ts|tsx|css|html|htm|xml|yaml|yml|csv|sh|py|rb|go|rs|c|cpp|h|java|swift|kt|vue|svelte)$/i

function readFile(file) {
  if (TEXT_EXTS.test(file.name)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }
  // Binary files: insert a labeled placeholder (PDFs can't be read as text in browser)
  const label = file.type === 'application/pdf' ? `PDF: ${file.name}` : file.name
  return Promise.resolve(`[${label}]`)
}

// Extract filename from a file:// URI (Linux DEs pass these instead of File objects)
function nameFromUri(uri) {
  try { return decodeURIComponent(new URL(uri.trim()).pathname.split('/').pop()) }
  catch { return uri.trim() }
}

function labelFromName(name) {
  return /\.pdf$/i.test(name) ? `[PDF: ${name}]` : `[${name}]`
}

export default function BrainCapture({ inline = false, onCaptured }) {
  const [text, setText]       = useState('')
  const [status, setStatus]   = useState(null) // null | 'sending' | 'ok' | 'error'
  const [dragging, setDragging] = useState(false)
  const suppressNextChangeRef = useRef(false)

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items
    if (!items) return

    // Handle file items (images, PDFs) — works on Mac/Chrome; Firefox/Linux may not expose these
    const fileItems = Array.from(items).filter(item => item.kind === 'file')
    if (fileItems.length) {
      e.preventDefault()
      suppressNextChangeRef.current = true
      const labels = fileItems.map(item => {
        if (item.type.startsWith('image/')) return '[image pasted]'
        if (item.type === 'application/pdf') {
          const file = item.getAsFile()
          return file ? `[PDF: ${file.name || 'document.pdf'}]` : '[PDF pasted]'
        }
        const file = item.getAsFile()
        return file ? labelFromName(file.name) : `[${item.type || 'file'} pasted]`
      })
      setText(prev => {
        const addition = labels.join('\n')
        return prev ? `${prev}\n${addition}` : addition
      })
      return
    }

    // Linux fallback: Nautilus and some Linux clipboard managers expose pasted files
    // as text/uri-list rather than File objects
    const uriItem = Array.from(items).find(item => item.type === 'text/uri-list')
    if (uriItem) {
      e.preventDefault()
      suppressNextChangeRef.current = true
      uriItem.getAsString(uris => {
        const names = uris.split('\n')
          .map(s => s.trim())
          .filter(s => s && !s.startsWith('#'))
          .map(nameFromUri)
          .filter(Boolean)
        if (names.length) {
          const addition = names.map(labelFromName).join('\n')
          setText(prev => prev ? `${prev}\n${addition}` : addition)
        }
      })
      return
    }
  }

  function handleChange(e) {
    if (suppressNextChangeRef.current) {
      suppressNextChangeRef.current = false
      return
    }
    setText(e.target.value)
  }

  async function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)

    // Primary: files array — works in Chrome on all platforms
    let files = Array.from(e.dataTransfer.files)

    // Fallback A: items API — Firefox on Linux may populate items but not files
    if (!files.length && e.dataTransfer.items) {
      files = Array.from(e.dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter(Boolean)
    }

    if (files.length) {
      const contents = await Promise.all(files.map(readFile))
      const inserted = contents.join('\n\n')
      setText(prev => prev ? `${prev}\n\n${inserted}` : inserted)
      return
    }

    // Fallback B: text/uri-list — some Linux DEs pass file:// URIs instead of File objects
    const uriList = e.dataTransfer.getData('text/uri-list')
    if (uriList) {
      const names = uriList.split('\n')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('#'))
        .map(nameFromUri)
        .filter(Boolean)
      if (names.length) {
        const inserted = names.map(labelFromName).join('\n\n')
        setText(prev => prev ? `${prev}\n\n${inserted}` : inserted)
      }
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
      // Backlog regeneration takes ~5s — refresh brain panel after that
      setTimeout(() => window.dispatchEvent(new CustomEvent('brain-captured')), 6000)
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
          className={`brain-capture-input-inline${dragging ? ' brain-capture-drop-active' : ''}`}
          placeholder="Capture a thought to Brain... (or drop a file)"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onPaste={handlePaste}
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
        className={`brain-capture-input${dragging ? ' brain-capture-drop-active' : ''}`}
        placeholder="Capture a thought to Brain... (or drop a file)"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
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
