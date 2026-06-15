import { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import 'xterm/css/xterm.css'

export default function TerminalPane({ projectPath }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      theme: {
        background: '#111111',
        foreground: '#e8e8e8',
        cursor: '#ff6b00',
        selectionBackground: 'rgba(255,107,0,0.3)',
      },
    })

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
    }
  }, [projectPath])

  return <div className="terminal-container" ref={containerRef} />
}
