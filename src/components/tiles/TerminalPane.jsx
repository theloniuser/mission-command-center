import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import 'xterm/css/xterm.css'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useTerminal } from '../../context/TerminalContext.jsx'

const DARK_THEME = {
  background: '#1c1c1c',
  foreground: '#e8e8e8',
  cursor: '#ff6b00',
  selectionBackground: 'rgba(255,107,0,0.3)',
  red: '#ff6b00',
  brightRed: '#ff8c38',
  blue: '#339fd9',
  brightBlue: '#5bb8e8',
  cyan: '#339fd9',
  brightCyan: '#5bb8e8',
}

const LIGHT_THEME = {
  background: '#f8f8f7',
  foreground: '#1e1e1e',
  cursor: '#e05a00',
  selectionBackground: 'rgba(255,107,0,0.2)',
  black: '#e0e0e0',
  brightBlack: '#cccccc',
  red: '#b83200',
  brightRed: '#c04000',
  green: '#2d6a00',        // 5.8:1 vs #f8f8f7
  brightGreen: '#3a7a00',  // 4.8:1 vs #f8f8f7
  yellow: '#7a5c00',       // 5.5:1 vs #f8f8f7
  brightYellow: '#8a6800', // 4.8:1 vs #f8f8f7
  blue: '#1565a0',
  brightBlue: '#1e71aa',
  magenta: '#7b1fa2',      // 5.5:1 vs #f8f8f7
  brightMagenta: '#8e24aa',// 4.7:1 vs #f8f8f7
  cyan: '#00696e',         // 5.1:1 vs #f8f8f7
  brightCyan: '#00838a',   // 4.6:1 vs #f8f8f7
  white: '#3a3a3a',
  brightWhite: '#1e1e1e',
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[()][AB012]/g
const RECONNECT_BASE_MS = 750
const RECONNECT_MAX_MS = 10_000
const RECONNECT_MAX_ATTEMPTS = 12
const KEEPALIVE_MS = 25_000

// Claude Code's own CLI recolors two distinct things with 16-color ANSI codes
// (confirmed against a live session's raw PTY buffer in config/sessions.json):
// the "thinking" spinner glyph uses bright yellow (ESC[93m), and a selected
// row in an interactive list (e.g. "1. Yes, commit" in a confirm prompt) uses
// bright white (ESC[97m) — an earlier version of this function assumed the
// list-selection highlight was also yellow/bold; the raw buffer showed the
// selected option's text is ESC[97m while unselected options are ESC[37m
// (plain white), so recoloring only yellow left selections unchanged. Both
// are overridden here rather than intercepting raw PTY output. Note: this
// replaces LIGHT_THEME's contrast-tuned yellow/brightWhite, so minimumContrastRatio
// (set below) is relied on to keep accent colors with poor contrast against
// the light background readable.
function themeWithAccent(base, accentColor) {
  if (!accentColor) return base
  return { ...base, yellow: accentColor, brightYellow: accentColor, brightWhite: accentColor }
}

export default function TerminalPane({ projectPath, projectId, terminalId: terminalIdProp, launchCommand, pasteText, accentColor }) {
  const terminalId = terminalIdProp ?? projectId
  const containerRef = useRef(null)
  const paneRef = useRef(null)
  const termRef = useRef(null)
  const wsRef = useRef(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const { theme } = useTheme()
  const { consumePendingCommand, registerTerminal, unregisterTerminal, registerTerminalFocus, unregisterTerminalFocus, registerTerminalReader, unregisterTerminalReader, registerTerminalLineCount, unregisterTerminalLineCount } = useTerminal()

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = themeWithAccent(theme === 'dark' ? DARK_THEME : LIGHT_THEME, accentColor)
      termRef.current.options.minimumContrastRatio = theme === 'dark' ? 1 : 4.5
    }
  }, [theme, accentColor])

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      copyOnSelect: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      theme: themeWithAccent(theme === 'dark' ? DARK_THEME : LIGHT_THEME, accentColor),
      minimumContrastRatio: theme === 'dark' ? 1 : 4.5,
    })
    termRef.current = term

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    const vp = term.element?.querySelector('.xterm-viewport')
    let vpScrollListener = null
    let hideScrollBtnTimer = null
    if (vp) {
      vpScrollListener = () => {
        const atBottom = vp.scrollTop + vp.clientHeight >= vp.scrollHeight - 5
        if (!atBottom) {
          if (hideScrollBtnTimer) { clearTimeout(hideScrollBtnTimer); hideScrollBtnTimer = null }
          setShowScrollBtn(true)
        } else {
          if (!hideScrollBtnTimer) {
            hideScrollBtnTimer = setTimeout(() => {
              setShowScrollBtn(false)
              hideScrollBtnTimer = null
            }, 1500)
          }
        }
      }
      vp.addEventListener('scroll', vpScrollListener)
    }

    // Ctrl+Shift+V: paste from clipboard (Linux browser convention)
    term.attachCustomKeyEventHandler((e) => {
      if (e.type === 'keydown' && e.ctrlKey && e.shiftKey && e.key === 'V') {
        navigator.clipboard?.readText().then(text => { if (text) term.paste(text) }).catch(() => {})
        return false
      }
      return true
    })

    requestAnimationFrame(() => fitAddon.fit())

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = `${proto}://${window.location.host}/terminal`

    let shouldReconnect = true
    let isFirstConnect = true
    let reconnectAttempts = 0
    let socketSeq = 0
    let reconnectTimer = null
    let pendingCommandTimer = null
    let reconnectNoticeShown = false
    let keepaliveTimer = null

    function socketIsCurrent(ws, seq) {
      return shouldReconnect && wsRef.current === ws && socketSeq === seq
    }

    function clearReconnectTimer() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    function startKeepalive(ws) {
      stopKeepalive()
      keepaliveTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) send(ws, { type: 'keepalive' })
      }, KEEPALIVE_MS)
    }

    function stopKeepalive() {
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer)
        keepaliveTimer = null
      }
    }

    function send(ws, payload) {
      if (ws?.readyState !== WebSocket.OPEN) return
      try {
        ws.send(JSON.stringify(payload))
      } catch {
        scheduleReconnect('send-failed')
      }
    }

    async function checkAccessBlocked() {
      try {
        const r = await fetch('/api/ping', { method: 'GET', cache: 'no-store' })
        const data = await r.json()
        return data?.ok !== true  // if JSON parse fails or ok!=true, Access redirected us to login page
      } catch {
        return true  // couldn't parse JSON — Access redirect served HTML login page
      }
    }

    function scheduleReconnect(reason = 'closed') {
      if (!shouldReconnect || reconnectTimer) return
      if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
        // Check if server is accessible via HTTP but WebSocket is blocked (Access session expired)
        checkAccessBlocked().then(blocked => {
          if (blocked) {
            term.write(`\r\n\x1b[31m[Session expired — reload the page to reconnect]\x1b[0m\r\n`)
          } else {
            term.write(`\r\n\x1b[33m[Connection unavailable — retrying in 30s…]\x1b[0m\r\n`)
            // Auto-retry after a longer pause so server restart is transparent
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null
              reconnectAttempts = 0
              reconnectNoticeShown = false
              scheduleReconnect('auto-retry')
            }, 30_000)
          }
        })
        return
      }

      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts, RECONNECT_MAX_MS)
      reconnectAttempts += 1
      if (!reconnectNoticeShown) {
        term.write('\r\n\x1b[33m[Connection lost - reconnecting...]\x1b[0m\r\n')
        reconnectNoticeShown = true
      }
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect(reason)
      }, delay)
    }

    function reconnectNow() {
      if (!shouldReconnect) return
      const current = wsRef.current
      if (current?.readyState === WebSocket.OPEN || current?.readyState === WebSocket.CONNECTING) return
      reconnectAttempts = 0
      clearReconnectTimer()
      connect('wake')
    }

    function connect(reason = 'initial') {
      if (!shouldReconnect) return
      const current = wsRef.current
      if (current?.readyState === WebSocket.OPEN || current?.readyState === WebSocket.CONNECTING) return

      const ws = new WebSocket(wsUrl)
      const seq = socketSeq + 1
      socketSeq = seq
      wsRef.current = ws

      ws.onopen = () => {
        if (!socketIsCurrent(ws, seq)) {
          ws.close()
          return
        }
        const { cols, rows } = term
        const wasFirstConnect = isFirstConnect

        reconnectAttempts = 0
        reconnectNoticeShown = false
        startKeepalive(ws)

        if (!wasFirstConnect) {
          // Clear the terminal before buffer replay so content isn't doubled
          term.reset()
        }
        isFirstConnect = false

        send(ws, { type: 'init', terminalId, projectPath, launchCommand: launchCommand || '', pasteText: pasteText || '', cols, rows })

        // Only consume pending command on fresh connect (not reconnect after sleep)
        const pending = wasFirstConnect ? consumePendingCommand(terminalId) : null
        if (pending) {
          pendingCommandTimer = setTimeout(() => {
            pendingCommandTimer = null
            if (socketIsCurrent(ws, seq) && ws.readyState === WebSocket.OPEN) {
              send(ws, { type: 'input', data: pending })
              term.focus()
            }
          }, 700)
        }
      }

      ws.onmessage = (e) => {
        if (!socketIsCurrent(ws, seq)) return
        let msg
        try { msg = JSON.parse(e.data) } catch { return }
        if (msg.type === 'output') term.write(msg.data)
      }

      ws.onerror = () => {
        if (!socketIsCurrent(ws, seq)) return
        if (ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) ws.close()
        scheduleReconnect('error')
      }

      ws.onclose = (event) => {
        stopKeepalive()
        if (event?.code === 4000) {
          // Superseded by another tab or concurrent connection — don't compete
          wsRef.current = null
          return
        }
        if (!socketIsCurrent(ws, seq)) return
        wsRef.current = null
        if (!shouldReconnect) return
        scheduleReconnect(reason)
      }
    }

    connect()

    // These callbacks use wsRef.current so they always target the active connection
    registerTerminal(terminalId, (data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        send(wsRef.current, { type: 'input', data })
      }
    })
    registerTerminalFocus(terminalId, () => term.focus())
    registerTerminalReader(terminalId, (fromLine = 0) => {
      const buf = term.buffer.active
      const lines = []
      for (let i = fromLine; i < buf.length; i++) {
        lines.push(buf.getLine(i)?.translateToString(true) ?? '')
      }
      return lines.join('\n').replace(ANSI_RE, '').trimEnd()
    })
    registerTerminalLineCount(terminalId, () => term.buffer.active.length)

    const dataDisposable = term.onData(data => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        send(wsRef.current, { type: 'input', data })
      }
    })

    const ro = new ResizeObserver(() => {
      const el = containerRef.current
      if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) return
      fitAddon.fit()
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        send(wsRef.current, { type: 'resize', cols: term.cols, rows: term.rows })
      }
    })
    ro.observe(containerRef.current)

    const onWakeSignal = () => reconnectNow()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') reconnectNow()
    }
    window.addEventListener('online', onWakeSignal)
    window.addEventListener('focus', onWakeSignal)
    window.addEventListener('pageshow', onWakeSignal)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      shouldReconnect = false  // prevent reconnect on intentional close
      clearReconnectTimer()
      stopKeepalive()
      clearTimeout(pendingCommandTimer)
      window.removeEventListener('online', onWakeSignal)
      window.removeEventListener('focus', onWakeSignal)
      window.removeEventListener('pageshow', onWakeSignal)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      unregisterTerminal(terminalId)
      unregisterTerminalFocus(terminalId)
      unregisterTerminalReader(terminalId)
      unregisterTerminalLineCount(terminalId)
      if (hideScrollBtnTimer) clearTimeout(hideScrollBtnTimer)
      if (vpScrollListener) {
        term.element?.querySelector('.xterm-viewport')?.removeEventListener('scroll', vpScrollListener)
      }
      dataDisposable.dispose()
      ro.disconnect()
      wsRef.current?.close()
      wsRef.current = null
      term.dispose()
      termRef.current = null
    }
  }, [projectPath])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const block = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.preventDefault()
    }
    el.addEventListener('wheel', block, { passive: false })
    return () => el.removeEventListener('wheel', block)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onDragOver = (e) => e.preventDefault()

    const onDrop = async (e) => {
      e.preventDefault()
      e.stopPropagation()
      const files = Array.from(e.dataTransfer.files)
      if (!files.length) return
      for (const file of files) {
        let content
        if (/\.(txt|md|markdown|json|js|jsx|ts|tsx|css|html|htm|xml|yaml|yml|csv|sh|py|rb|go|rs|c|cpp|h|java|swift|kt|vue|svelte)$/i.test(file.name)) {
          content = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (ev) => resolve(ev.target.result)
            reader.onerror = reject
            reader.readAsText(file)
          })
        } else {
          content = file.name
        }
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'input', data: content }))
        }
      }
      termRef.current?.focus()
    }

    el.addEventListener('dragover', onDragOver)
    el.addEventListener('drop', onDrop)
    return () => {
      el.removeEventListener('dragover', onDragOver)
      el.removeEventListener('drop', onDrop)
    }
  }, [])

  // A pane scrolling into view claims chat focus, unless the user is
  // deliberately focused on some other input (a modal field, the sidebar
  // capture box) — only steal focus from the document body or another
  // terminal's own hidden input, never from an unrelated field.
  useEffect(() => {
    const el = paneRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry.isIntersecting) return
      const active = document.activeElement
      const stealable = !active || active === document.body || active.classList?.contains('xterm-helper-textarea')
      if (stealable) termRef.current?.focus()
    }, { threshold: 0.6 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // xterm already focuses itself when a click lands on its own rendered
  // content — this only covers the container's dead-zone padding, where a
  // real trusted mousedown's native default action (blur-to-body, since a
  // plain div isn't focusable) would otherwise undo a same-handler focus()
  // call unless that default action is suppressed first.
  function handlePaneMouseDown(e) {
    if (e.target.closest('.xterm')) return
    e.preventDefault()
    termRef.current?.focus()
  }

  return (
    <div className="terminal-container" ref={paneRef} onMouseDown={handlePaneMouseDown}>
      <div ref={containerRef} style={{ height: '100%' }} />
      {showScrollBtn && (
        <button
          onClick={() => { termRef.current?.scrollToBottom(); setShowScrollBtn(false) }}
          title="Scroll to bottom"
          style={{
            position: 'absolute',
            bottom: 44,
            right: 24,
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.15)',
            background: theme === 'dark' ? 'rgba(40,40,40,0.92)' : 'rgba(255,255,255,0.92)',
            color: theme === 'dark' ? '#ffffff' : '#1a1a1a',
            fontSize: 15,
            lineHeight: 1,
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.15)',
            WebkitAppearance: 'none',
            appearance: 'none',
            outline: 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  )
}
