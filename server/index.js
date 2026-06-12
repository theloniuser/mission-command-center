import express from 'express'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { readConfig, writeConfig } from './configManager.js'
import { scanAllSessions } from './sessionScanner.js'
import { scanBeads } from './beadsScanner.js'
import { launchTerminal } from './terminalLauncher.js'

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

// ── Start ─────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`ADS Command Center API running at http://localhost:${PORT}`)
})
