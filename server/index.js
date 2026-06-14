import express from 'express'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFileSync, existsSync, createReadStream } from 'fs'
import { extname, resolve, dirname as _dirOf } from 'path'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const _serverDir = _dirOf(fileURLToPath(import.meta.url))
import { readConfig, writeConfig } from './configManager.js'
import { scanAllSessions } from './sessionScanner.js'
import { scanBeads } from './beadsScanner.js'
import { launchTerminal } from './terminalLauncher.js'
import { scanChangelogs } from './changelogScanner.js'

function readEnvKey(keyName) {
  if (process.env[keyName]) return process.env[keyName]
  try {
    const content = readFileSync('/Users/Shared/arc-secrets.env', 'utf8')
    const match = content.match(new RegExp(`^export\\s+${keyName}=["']?([^"'\\n]+)["']?`, 'm'))
    if (match) return match[1].trim()
  } catch {}
  return null
}

const app = express()
const PORT = 3001

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
    beads_ids: req.body.beads_ids || [],
    color: TILE_COLORS[projects.length % TILE_COLORS.length],
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

// ── Brain items (from tools/backlog.json) ─────────────────

app.get('/api/brain-items', (req, res) => {
  try {
    const backlogPath = resolve(_serverDir, '../../tools/backlog.json')
    if (!existsSync(backlogPath)) return res.json({ for_claude: [], to_do: [] })
    const data = JSON.parse(readFileSync(backlogPath, 'utf8'))
    res.json(data.brain || { for_claude: [], to_do: [] })
  } catch {
    res.json({ for_claude: [], to_do: [] })
  }
})

// ── Beads ─────────────────────────────────────────────────

app.get('/api/beads', async (req, res) => {
  try {
    const result = await scanBeads()
    res.json(result)
  } catch (err) {
    console.error('beadsScanner error:', err)
    res.status(500).json({ groups: [] })
  }
})

app.post('/api/beads/new', async (req, res) => {
  const { title } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'title required' })
  try {
    const safe = title.trim().replace(/"/g, '\\"')
    await execAsync(`bd add "${safe}"`, {
      env: { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}` },
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Promote brain item → beads backlog ───────────────────
// Creates a bead and marks the brain item RESOLVED in one shot.

app.post('/api/promote-to-backlog', async (req, res) => {
  const { title, prefix } = req.body  // prefix = 'To do:' | 'For Claude:'
  if (!title?.trim()) return res.status(400).json({ error: 'title required' })

  const settings = readConfig('settings.json')
  const endpointUrl = settings.customAction?.endpoint_url
  const keyVar      = settings.customAction?.api_key_env_var || 'BRAIN_API_KEY'
  const apiKey      = readEnvKey(keyVar)

  const errors = []

  // 1. Create bead
  try {
    const safe = title.trim().replace(/"/g, '\\"')
    await execAsync(`bd add "${safe}"`, {
      env: { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}` },
    })
  } catch (err) {
    errors.push(`bd add failed: ${err.message}`)
  }

  // 2. Capture RESOLVED to brain
  if (endpointUrl && apiKey) {
    const resolvedText = `RESOLVED: ${prefix} ${title}`.trim()
    try {
      await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ text: resolvedText }),
      })
    } catch (err) {
      errors.push(`brain capture failed: ${err.message}`)
    }
  }

  // 3. Regenerate backlog in background
  const scriptPath = resolve(_serverDir, '../../scripts/generate-backlog.sh')
  if (existsSync(scriptPath)) {
    execAsync(`bash "${scriptPath}"`, {
      env: { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}` },
    }).catch(() => {})
  }

  if (errors.length) return res.status(207).json({ ok: false, errors })
  res.json({ ok: true })
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

// ── Brain Capture ─────────────────────────────────────────

app.post('/api/brain-capture', async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })

  const settings = readConfig('settings.json')
  const endpointUrl = settings.customAction?.endpoint_url
  const keyVar      = settings.customAction?.api_key_env_var || 'CAPTURE_API_KEY'

  if (!endpointUrl) return res.status(400).json({ error: 'Brain endpoint URL not configured in Settings' })

  const apiKey = readEnvKey(keyVar)
  if (!apiKey) return res.status(400).json({ error: `${keyVar} not found in env or arc-secrets.env` })

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ text }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return res.status(502).json({ error: 'Brain API error', status: response.status, data })

    // Regenerate backlog.json in background so sidebar updates immediately
    const scriptPath = resolve(_serverDir, '../../scripts/generate-backlog.sh')
    if (existsSync(scriptPath)) {
      execAsync(`bash "${scriptPath}"`, {
        env: { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}` },
      }).catch(() => {})
    }

    res.json({ ok: true, data })
  } catch (err) {
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

// ── Folder picker (macOS) ─────────────────────────────────

app.post('/api/browse-folder', async (req, res) => {
  try {
    const { execSync } = await import('child_process')
    const path = execSync("osascript -e 'POSIX path of (choose folder)'", { timeout: 30000 })
      .toString().trim()
    res.json({ path })
  } catch (err) {
    if (err.status === 1) return res.json({ path: null }) // user cancelled
    res.status(500).json({ error: err.message })
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
  app.use('/ads-command-center', express.static(distPath))
  app.get('/ads-command-center/*', (req, res) => {
    const idx = resolve(distPath, 'index.html')
    if (existsSync(idx)) res.sendFile(idx)
    else res.status(404).end()
  })
  app.get('/', (req, res) => res.redirect('/ads-command-center/'))
}

// ── Start ─────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`ADS Command Center running at http://localhost:${PORT}`)
})
