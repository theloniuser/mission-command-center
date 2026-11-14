import express from 'express'
import http from 'http'
import { WebSocket, WebSocketServer } from 'ws'
import pty from 'node-pty'
import os from 'os'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { exec, execSync } from 'child_process'
import { promisify } from 'util'
import { readFileSync, writeFileSync, renameSync, unlinkSync, appendFileSync, existsSync, createReadStream } from 'fs'
import { readdir, mkdir } from 'fs/promises'
import { extname, resolve, join, dirname as _dirOf } from 'path'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const _serverDir = _dirOf(fileURLToPath(import.meta.url))
const CONFIG_DIR = resolve(_serverDir, '../config')
const SESSIONS_FILE = join(CONFIG_DIR, 'sessions.json')
import { readConfig, writeConfig } from './configManager.js'
import { scanAllSessions } from './sessionScanner.js'

import { launchTerminal } from './terminalLauncher.js'
import { scanChangelogs } from './changelogScanner.js'

function readEnvKey(keyName) {
  return process.env[keyName] || null
}


const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3002

const TILE_COLORS = [
  '#ff7f00',
  '#339fd9',
  '#2a9d8f',
  '#7b68ee',
  '#52b788',
  '#e07a5f',
  '#f4a261',
]

app.use(cors())
app.use(express.json())

// Health check — lets the client distinguish "Access blocked" from "server down"
app.get('/api/ping', (req, res) => res.json({ ok: true }))

// ── Projects ──────────────────────────────────────────────

app.get('/api/projects', (req, res) => {
  res.json(readConfig('projects.json'))
})

app.post('/api/projects', (req, res) => {
  const projects = readConfig('projects.json')
  const project = {
    id: randomUUID(),
    name: req.body.name,
    path: req.body.path,
    launch_command: req.body.launch_command || '',
    color: req.body.color || TILE_COLORS[projects.length % TILE_COLORS.length],
  }
  projects.push(project)
  writeConfig('projects.json', projects)
  res.status(201).json(project)
})

app.put('/api/projects/:id', (req, res) => {
  const projects = readConfig('projects.json')
  const idx = projects.findIndex(p => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  projects[idx] = { ...projects[idx], ...req.body, id: req.params.id }
  writeConfig('projects.json', projects)
  res.json(projects[idx])
})

app.delete('/api/projects/:id', (req, res) => {
  const projects = readConfig('projects.json')
  const filtered = projects.filter(p => p.id !== req.params.id)
  if (filtered.length === projects.length) return res.status(404).json({ error: 'Not found' })
  writeConfig('projects.json', filtered)
  res.status(204).end()
})

// ── Tasks ─────────────────────────────────────────────────

app.get('/api/tasks', (req, res) => {
  const tasks = readConfig('tasks.json') || []
  res.json(tasks.filter(t => t.status !== 'closed'))
})

app.post('/api/tasks', (req, res) => {
  const { title } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'title required' })
  const tasks = readConfig('tasks.json') || []
  const task = { id: randomUUID(), title: title.trim(), status: 'open', created_at: new Date().toISOString() }
  tasks.unshift(task)
  writeConfig('tasks.json', tasks)
  res.status(201).json(task)
})

app.delete('/api/tasks/:id', (req, res) => {
  const tasks = readConfig('tasks.json') || []
  writeConfig('tasks.json', tasks.filter(t => t.id !== req.params.id))
  res.status(204).end()
})

// ── Sessions ──────────────────────────────────────────────

app.get('/api/sessions', (req, res) => {
  const projects = readConfig('projects.json')
  try {
    const result = scanAllSessions(projects)
    res.json(result)
  } catch (err) {
    console.error('sessionScanner error:', err)
    res.status(500).json({ error: 'Session scan failed', sessions: [], summary: {} })
  }
})

// ── Temp projects ─────────────────────────────────────────

app.get('/api/temp-projects', (req, res) => {
  res.json(readConfig('temp-projects.json') || [])
})

app.post('/api/temp-projects', (req, res) => {
  const { path: projPath, name } = req.body
  if (!projPath) return res.status(400).json({ error: 'path required' })
  const temps = readConfig('temp-projects.json') || []
  const item = { id: randomUUID(), path: projPath, name: name || projPath.split('/').filter(Boolean).pop() }
  temps.unshift(item)
  writeConfig('temp-projects.json', temps)
  res.status(201).json(item)
})

app.delete('/api/temp-projects/:id', (req, res) => {
  const temps = (readConfig('temp-projects.json') || []).filter(t => t.id !== req.params.id)
  writeConfig('temp-projects.json', temps)
  res.status(204).end()
})

app.post('/api/temp-projects/:id/promote', (req, res) => {
  const temps = readConfig('temp-projects.json') || []
  const item  = temps.find(t => t.id === req.params.id)
  if (!item) return res.status(404).json({ error: 'not found' })
  const name  = req.body.name?.trim() || item.name
  const projects = readConfig('projects.json')
  const promoted = {
    id: randomUUID(),
    name,
    path: item.path,
    launch_command: '',
    color: TILE_COLORS[projects.length % TILE_COLORS.length],
  }
  projects.push(promoted)
  writeConfig('projects.json', projects)
  writeConfig('temp-projects.json', temps.filter(t => t.id !== req.params.id))
  res.status(201).json(promoted)
})

// ── Launch ────────────────────────────────────────────────

app.post('/api/launch', async (req, res) => {
  const { projectPath, command } = req.body
  if (!projectPath) return res.status(400).json({ error: 'projectPath required' })
  try {
    await launchTerminal(projectPath, command || 'claude')
    res.json({ ok: true })
  } catch (err) {
    console.error('launch error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── Changelogs ────────────────────────────────────────────

app.get('/api/changelogs/:projectId', (req, res) => {
  const projects = readConfig('projects.json')
  const project = projects.find(p => p.id === req.params.projectId)
  if (!project) return res.json([])
  try {
    res.json(scanChangelogs(project.path))
  } catch {
    res.json([])
  }
})

// ── Brand assets ──────────────────────────────────────────

app.get('/api/brand-css', (req, res) => {
  const { path: cssPath } = req.query
  if (!cssPath || !cssPath.endsWith('.css')) {
    return res.status(400).send('/* invalid path */')
  }
  if (!existsSync(cssPath)) {
    return res.status(404).send('/* file not found */')
  }
  try {
    const css = readFileSync(cssPath, 'utf8')
    res.setHeader('Content-Type', 'text/css')
    res.send(css)
  } catch {
    res.status(500).send('/* read error */')
  }
})

app.get('/api/brand-asset', (req, res) => {
  const { path: assetPath } = req.query
  const allowed = ['.svg', '.png', '.jpg', '.jpeg']
  if (!assetPath || !allowed.includes(extname(assetPath).toLowerCase())) {
    return res.status(400).end()
  }
  if (!existsSync(assetPath)) return res.status(404).end()
  const mimeMap = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }
  res.setHeader('Content-Type', mimeMap[extname(assetPath).toLowerCase()])
  createReadStream(assetPath).pipe(res)
})

// ── Folder browser ────────────────────────────────────────

app.get('/api/ls', async (req, res) => {
  const dir = req.query.path || process.env.HOME || '/Users'
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const dirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b))
    res.json({ path: dir, dirs })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/api/mkdir', async (req, res) => {
  const { path: dir } = req.body
  if (!dir) return res.status(400).json({ error: 'path required' })
  try {
    await mkdir(dir, { recursive: true })
    res.json({ path: dir })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/api/browse-folder', async (req, res) => {
  try {
    const { stdout } = await execAsync(
      `osascript -e 'POSIX path of (choose folder with prompt "Select project directory:")'`
    )
    res.json({ path: stdout.trim() })
  } catch {
    // User cancelled or osascript unavailable
    res.json({ path: null })
  }
})

// ── Settings ──────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  res.json(readConfig('settings.json'))
})

app.put('/api/settings', (req, res) => {
  const current = readConfig('settings.json')
  const updated = {
    alerts: { ...current.alerts, ...req.body.alerts },
    customAction: { ...current.customAction, ...req.body.customAction },
    brand: { ...current.brand, ...req.body.brand },
  }
  writeConfig('settings.json', updated)
  res.json(updated)
})

// ── Static frontend (serves dist/ so Thelonius is self-contained) ──

const distPath = resolve(_serverDir, '../dist')

if (existsSync(distPath)) {
  app.use('/mission-command-center', express.static(distPath))
  app.get('/mission-command-center/*', (req, res) => {
    const idx = resolve(distPath, 'index.html')
    if (existsSync(idx)) res.sendFile(idx)
    else res.status(404).end()
  })
  app.get('/', (req, res) => res.redirect('/mission-command-center/'))
}

// ── Terminal session kill ─────────────────────────────────

app.delete('/api/terminal/:terminalId', (req, res) => {
  const key = decodeURIComponent(req.params.terminalId)
  const session = ptySessions.get(key)
  if (!session) return res.status(404).json({ error: 'session not found' })
  clearTimeout(session.cleanupTimer)
  session.buffer = []  // clear replayed output so next open is clean
  if (session.ws?.readyState === WebSocket.OPEN) session.ws.close(4001, 'killed by user')
  session.ptyProcess?.kill()
  ptySessions.delete(key)
  persistSessions()
  res.json({ ok: true })
})

// ── WebSocket + PTY ───────────────────────────────────────
// PTY sessions survive WebSocket disconnects for SESSION_TIMEOUT_MS.
// On reconnect with the same terminalId, the existing PTY is reattached
// and buffered output is replayed — session persists across navigation.

const SESSION_TIMEOUT_MS = 600_000  // 10 min — survives typical sleep/wake cycles

const BUFFER_MAX = 500
const ptySessions = new Map() // terminalId → { ptyProcess, buffer, ws, cleanupTimer }

const wss = new WebSocketServer({ server, path: '/terminal' })

// ── Session persistence ───────────────────────────────────
// Checkpoint sessions to disk so a crash/restart doesn't wipe terminal state.
// On restart, restoreSessions() re-spawns PTYs in the saved cwd and pre-fills
// the buffer — clients that reconnect get their scrollback and a live shell.

function persistSessions() {
  const entries = []
  for (const [key, session] of ptySessions.entries()) {
    if (!session.ptyProcess) continue
    entries.push({
      terminalId: key,
      projectPath: session.projectPath || '',
      cwd: session.cwd || os.homedir(),
      buffer: session.buffer.slice(-200),
      launchCommand: session.launchCommand || null,
    })
  }
  const tmp = SESSIONS_FILE + '.tmp'
  try {
    writeFileSync(tmp, JSON.stringify(entries, null, 2))
    renameSync(tmp, SESSIONS_FILE)  // atomic on POSIX — SIGKILL mid-write leaves old file intact
  } catch (err) {
    console.error('[persist] sessions write failed:', err.message)
  }
}

function restoreSessions() {
  // Clean up any leftover .tmp from a crash between writeFileSync and renameSync
  const tmp = SESSIONS_FILE + '.tmp'
  if (existsSync(tmp)) try { unlinkSync(tmp) } catch {}
  if (!existsSync(SESSIONS_FILE)) return
  let entries
  try {
    entries = JSON.parse(readFileSync(SESSIONS_FILE, 'utf8'))
    if (!Array.isArray(entries) || !entries.length) return
  } catch { return }

  console.log(`[restore] restoring ${entries.length} session(s)`)
  for (const entry of entries) {
    if (!entry.terminalId) continue
    const rawCwd = (entry.cwd || entry.projectPath || '').replace(/^~/, os.homedir())
    const cwd = rawCwd && existsSync(rawCwd) ? rawCwd : os.homedir()

    const ptyProcess = pty.spawn('/bin/zsh', [], {
      name: 'xterm-color',
      cols: 220,
      rows: 50,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
    })

    const session = {
      ptyProcess,
      buffer: Array.isArray(entry.buffer) ? entry.buffer : [],
      ws: null,
      cleanupTimer: null,
      projectPath: entry.projectPath || '',
      cwd,
      launchCommand: entry.launchCommand || null,
    }
    ptySessions.set(entry.terminalId, session)
    const key = entry.terminalId

    if (entry.launchCommand) {
      setTimeout(() => { ptyProcess.write(entry.launchCommand + '\r') }, 400)
    }

    ptyProcess.onData(data => {
      session.buffer.push(data)
      if (session.buffer.length > BUFFER_MAX) session.buffer.shift()
      sendJson(session.ws, { type: 'output', data }, 'ws send error')
    })

    ptyProcess.onExit(() => {
      clearTimeout(session.cleanupTimer)
      if (ptySessions.get(key) === session) ptySessions.delete(key)
      persistSessions()
      if (session.ws?.readyState === WebSocket.OPEN) session.ws.close()
    })

    // Kill after timeout if no client reconnects
    session.cleanupTimer = setTimeout(() => {
      session.ptyProcess?.kill()
      if (ptySessions.get(key) === session) ptySessions.delete(key)
      persistSessions()
    }, SESSION_TIMEOUT_MS)
  }
}

// Reads the actual cwd of a running PTY process via lsof (macOS/Linux).
// Called before each persist so restored sessions land in the right directory.
async function updateCwds() {
  for (const session of ptySessions.values()) {
    if (!session.ptyProcess?.pid) continue
    try {
      const { stdout } = await execAsync(
        `lsof -p ${session.ptyProcess.pid} -a -d cwd -Fn 2>/dev/null | grep '^n' | head -1`,
        { env: { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}` } }
      )
      const cwd = stdout.trim().slice(1)  // strip leading 'n' from lsof -Fn output
      if (cwd) session.cwd = cwd
    } catch {}
  }
}

// Periodic background flush — protects against SIGKILL between WS events.
setInterval(async () => {
  if (!ptySessions.size) return
  await updateCwds()
  persistSessions()
}, 30_000).unref()

function sendJson(ws, payload, label) {
  if (ws?.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify(payload), (err) => {
    if (err) console.error(`[${label}]`, err.code || err.message)
  })
}

wss.on('connection', (ws) => {
  let sessionKey = null

  ws.on('error', (err) => {
    console.error('[ws error]', err.code || err.message)
  })

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    if (msg.type === 'init') {
      sessionKey = msg.terminalId || msg.projectPath
      if (!sessionKey) {
        ws.close(1008, 'terminalId or projectPath required')
        return
      }

      if (ptySessions.has(sessionKey)) {
        // Reconnect to existing PTY — cancel cleanup, swap ws, replay buffer
        const session = ptySessions.get(sessionKey)
        clearTimeout(session.cleanupTimer)
        if (session.ws && session.ws !== ws && session.ws.readyState < WebSocket.CLOSING) {
          session.ws.close(4000, 'superseded by reconnect')
        }
        session.ws = ws
        for (const chunk of session.buffer) {
          sendJson(ws, { type: 'output', data: chunk }, 'ws replay error')
        }
        if (session.ptyProcess && msg.cols && msg.rows) {
          session.ptyProcess.resize(Math.max(1, msg.cols), Math.max(1, msg.rows))
        }
        return
      }

      // New session — spawn PTY
      const rawCwd = (msg.projectPath || '').replace(/^~/, os.homedir())
      const cwd = rawCwd && existsSync(rawCwd) ? rawCwd : os.homedir()
      const ptyProcess = pty.spawn('/bin/zsh', [], {
        name: 'xterm-color',
        cols: Math.max(1, msg.cols || 80),
        rows: Math.max(1, msg.rows || 24),
        cwd,
        env: { ...process.env, TERM: 'xterm-256color' },
      })

      const session = {
        ptyProcess, buffer: [], ws, cleanupTimer: null,
        projectPath: rawCwd, cwd, launchCommand: msg.launchCommand || null,
      }
      ptySessions.set(sessionKey, session)
      persistSessions()
      const key = sessionKey

      ptyProcess.onData(data => {
        session.buffer.push(data)
        if (session.buffer.length > BUFFER_MAX) session.buffer.shift()
        sendJson(session.ws, { type: 'output', data }, 'ws send error')
      })

      ptyProcess.onExit(({ exitCode }) => {
        clearTimeout(session.cleanupTimer)
        if (ptySessions.get(key) === session) ptySessions.delete(key)
        persistSessions()
        if (session.ws?.readyState === WebSocket.OPEN) session.ws.close()
      })

      if (msg.launchCommand) {
        setTimeout(() => { ptyProcess.write(msg.launchCommand + '\r') }, 400)
      }
    }

    if (msg.type === 'input' && sessionKey) {
      const session = ptySessions.get(sessionKey)
      if (session?.ws === ws) session.ptyProcess?.write(msg.data)
    }

    if (msg.type === 'resize' && sessionKey) {
      const session = ptySessions.get(sessionKey)
      if (session?.ws === ws && session.ptyProcess) session.ptyProcess.resize(Math.max(1, msg.cols), Math.max(1, msg.rows))
    }

    // Application-level keepalive — echoed back so Cloudflare proxy doesn't idle-timeout
    if (msg.type === 'keepalive') {
      sendJson(ws, { type: 'keepalive' }, 'keepalive')
    }
  })

  ws.on('close', () => {
    if (!sessionKey) return
    const session = ptySessions.get(sessionKey)
    if (!session) return
    if (session.ws !== ws) return
    session.ws = null
    clearTimeout(session.cleanupTimer)
    persistSessions()  // checkpoint buffer — server may restart during grace period
    // Keep PTY alive; kill after timeout if no reconnect
    session.cleanupTimer = setTimeout(() => {
      session.ptyProcess?.kill()
      if (ptySessions.get(sessionKey) === session) ptySessions.delete(sessionKey)
      persistSessions()
    }, SESSION_TIMEOUT_MS)
  })
})

// ── Global error guards — prevent unhandled events from crashing the process ──

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err)
  try { persistSessions() } catch {}
  process.exit(1)  // sessions persisted to disk; launchd restarts cleanly
})

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})

wss.on('error', (err) => {
  console.error('[wss error]', err)
})

// ── Start ─────────────────────────────────────────────────

// Only a leftover Command Center server from this same folder is safe to stop automatically.
// Anything else holding the port belongs to another app, so explain and exit instead.
function staleOwnServerPids() {
  try {
    const pids = execSync(`lsof -ti:${PORT} -sTCP:LISTEN`, { encoding: 'utf8' }).split('\n').filter(Boolean)
    const ours = pids.filter(pid => {
      const cmd = execSync(`ps -p ${pid} -o command=`, { encoding: 'utf8' })
      const cwd = execSync(`lsof -a -p ${pid} -d cwd -Fn`, { encoding: 'utf8' })
        .split('\n').find(l => l.startsWith('n'))?.slice(1)
      return cmd.includes('server/index.js') && cwd === process.cwd()
    })
    return ours.length === pids.length ? ours : []
  } catch {
    return []
  }
}

let _bindAttempted = false
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && !_bindAttempted) {
    _bindAttempted = true
    const pids = staleOwnServerPids()
    if (pids.length) {
      console.log(`[server] port ${PORT} held by an earlier Command Center server; stopping it and retrying`)
      try { execSync(`kill ${pids.join(' ')}`, { stdio: 'ignore' }) } catch {}
      setTimeout(() => server.listen(PORT), 800)
      return
    }
    console.error(`[server] Port ${PORT} is already in use by another program.`)
    console.error(`[server] Stop that program, or start Command Center on a different port: PORT=3012 npm run dev`)
    process.exit(1)
  } else {
    console.error('[server error]', err)
    process.exit(1)
  }
})

function onShutdown() {
  persistSessions()
  process.exit(0)
}
process.on('SIGTERM', onShutdown)
process.on('SIGINT', onShutdown)

restoreSessions()
server.listen(PORT, () => {
  console.log(`Mission Command Center running at http://localhost:${PORT}`)
})
