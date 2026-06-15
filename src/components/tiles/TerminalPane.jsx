import { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import 'xterm/css/xterm.css'
import { useTheme } from '../../context/ThemeContext.jsx'

const DARK_THEME = {
  background: '#1c1c1c',
  foreground: '#e8e8e8',
  cursor: '#ff6b00',
  selectionBackground: 'rgba(255,107,0,0.3)',
}

const LIGHT_THEME = {
  background: '#f8f8f7',
  foreground: '#1e1e1e',
  cursor: '#e05a00',
  selectionBackground: 'rgba(255,107,0,0.2)',
}

export default function TerminalPane({ projectPath }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const { theme } = useTheme()

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
      ro.disconnect()
      ws.close()
      term.dispose()
      termRef.current = null
    }
  }, [projectPath])

  return <div className="terminal-container" ref={containerRef} />
}
