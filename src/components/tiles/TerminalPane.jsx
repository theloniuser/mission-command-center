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
  red: '#e05a00',
  brightRed: '#ff6b00',
  blue: '#267bb4',
  brightBlue: '#339fd9',
  cyan: '#267bb4',
  brightCyan: '#339fd9',
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[()][AB012]/g

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
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      theme: theme === 'dark' ? DARK_THEME : LIGHT_THEME,
    })
    termRef.current = term

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    requestAnimationFrame(() => fitAddon.fit())

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = `${proto}://${window.location.host}/terminal`

    let shouldReconnect = true
    let isFirstConnect = true

    function connect() {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        const { cols, rows } = term

        if (!isFirstConnect) {
          // Clear the terminal before buffer replay so content isn't doubled
          term.reset()
        }
        isFirstConnect = false

        ws.send(JSON.stringify({ type: 'init', terminalId, projectPath, launchCommand: launchCommand || '', cols, rows }))

        // Only consume pending command on fresh connect (not reconnect after sleep)
        const pending = consumePendingCommand(terminalId)
        if (pending) {
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'input', data: pending }))
              term.focus()
            }
          }, 700)
        }
      }

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'output') term.write(msg.data)
      }

      ws.onclose = () => {
        if (!shouldReconnect) return
        term.write('\r\n\x1b[33m[Connection lost — reconnecting...]\x1b[0m\r\n')
        setTimeout(connect, 3000)
      }
    }

    connect()

    // These callbacks use wsRef.current so they always target the active connection
    registerTerminal(terminalId, (data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }))
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

    term.onData(data => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }))
      }
    })

    const ro = new ResizeObserver(() => {
      const el = containerRef.current
      if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) return
      fitAddon.fit()
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
      }
    })
    ro.observe(containerRef.current)

    return () => {
      shouldReconnect = false  // prevent reconnect on intentional close
      unregisterTerminal(terminalId)
      unregisterTerminalFocus(terminalId)
      unregisterTerminalReader(terminalId)
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
