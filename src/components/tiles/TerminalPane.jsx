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
}

const LIGHT_THEME = {
  background: '#f8f8f7',
  foreground: '#1e1e1e',
  cursor: '#e05a00',
  selectionBackground: 'rgba(255,107,0,0.2)',
  red: '#e05a00',
  brightRed: '#ff6b00',
}

export default function TerminalPane({ projectPath, projectId }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const { theme } = useTheme()
  const { consumePendingCommand, registerTerminal, unregisterTerminal } = useTerminal()

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

    const wsUrl = `ws://${window.location.host}/terminal`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      const { cols, rows } = term
      ws.send(JSON.stringify({ type: 'init', projectPath, cols, rows }))

      registerTerminal(projectId, (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }))
        }
      })

      const pending = consumePendingCommand(projectId)
      if (pending) {
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'input', data: pending + '\n' }))
          }
        }, 700)
      }
    }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'output') term.write(msg.data)
    }

    term.onData(data => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }))
      }
    })

    const ro = new ResizeObserver(() => {
      fitAddon.fit()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
      }
    })
    ro.observe(containerRef.current)

    return () => {
      unregisterTerminal(projectId)
      ro.disconnect()
      ws.close()
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

  return <div className="terminal-container" ref={containerRef} />
}
