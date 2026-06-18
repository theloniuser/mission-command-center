import http from 'http'
import { WebSocketServer } from 'ws'
import pty from 'node-pty'

const PORT = process.env.PORT || 3002

const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('PTY server OK\n')
})

const wss = new WebSocketServer({ server, path: '/terminal' })

wss.on('connection', (ws) => {
  let ptyProcess = null

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    if (msg.type === 'init' && !ptyProcess) {
      ptyProcess = pty.spawn('/bin/bash', [], {
        name: 'xterm-color',
        cols: msg.cols || 80,
        rows: msg.rows || 24,
        cwd: '/home/jimc',
        env: { ...process.env, TERM: 'xterm-256color' },
      })
      ptyProcess.onData(data => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'output', data }))
        }
      })
      ptyProcess.onExit(() => {
        if (ws.readyState === ws.OPEN) ws.close()
      })
    }

    if (msg.type === 'input' && ptyProcess) {
      ptyProcess.write(msg.data)
    }

    if (msg.type === 'resize' && ptyProcess) {
      ptyProcess.resize(Math.max(1, msg.cols), Math.max(1, msg.rows))
    }
  })

  ws.on('close', () => {
    if (ptyProcess) { ptyProcess.kill(); ptyProcess = null }
  })
})

server.listen(PORT, () => {
  console.log(`PTY server listening on port ${PORT}`)
})
