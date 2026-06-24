import { useEffect, useRef } from 'react'
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
  black: '#2e2e2e',
  brightBlack: '#555555',
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

export default function TerminalPane({ projectPath, projectId, terminalId: terminalIdProp, launchCommand }) {
  const terminalId = terminalIdProp ?? projectId
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const wsRef = useRef(null)
  const { theme } = useTheme()
  const { consumePendingCommand, registerTerminal, unregisterTerminal, registerTerminalFocus, unregisterTerminalFocus, registerTerminalReader, unregisterTerminalReader } = useTerminal()

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = theme === 'dark' ? DARK_THEME : LIGHT_THEME
    }
  }, [theme])

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      copyOnSelect: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      theme: theme === 'dark' ? DARK_THEME : LIGHT_THEME,
    })
    termRef.current = term

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

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

    function scheduleReconnect(reason = 'closed') {
      if (!shouldReconnect || reconnectTimer) return
      if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
        term.write(`\r\n\x1b[31m[Connection unavailable after ${RECONNECT_MAX_ATTEMPTS} attempts. Reconnect will retry when the browser wakes or comes online.]\x1b[0m\r\n`)
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

        send(ws, { type: 'init', terminalId, projectPath, launchCommand: launchCommand || '', cols, rows })

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

      ws.onclose = () => {
        stopKeepalive()
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
    registerTerminalReader(terminalId, () => {
      const buf = term.buffer.active
      const lines = []
      for (let i = 0; i < buf.length; i++) {
        lines.push(buf.getLine(i)?.translateToString(true) ?? '')
      }
      return lines.join('\n').replace(ANSI_RE, '').trimEnd()
    })

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

  return <div className="terminal-container" ref={containerRef} />
}
