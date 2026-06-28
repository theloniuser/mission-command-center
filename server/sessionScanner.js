import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// CLAUDE_HOME overrides the default homedir for Docker/remote deployments
const _claudeHome = process.env.CLAUDE_HOME || homedir()
const PROJECTS_DIR = join(_claudeHome, '.claude', 'projects')
const GLOBAL_SETTINGS = join(_claudeHome, '.claude', 'settings.json')

const ACTIVE_MS = 5 * 60 * 1000
const IDLE_MS   = 30 * 60 * 1000

const PRICING = {
  sonnet: { input: 3/1e6,    output: 15/1e6,  cacheWrite: 3.75/1e6,  cacheRead: 0.30/1e6 },
  opus:   { input: 15/1e6,   output: 75/1e6,  cacheWrite: 18.75/1e6, cacheRead: 1.50/1e6 },
  haiku:  { input: 0.80/1e6, output: 4/1e6,   cacheWrite: 1.0/1e6,   cacheRead: 0.08/1e6 },
}

function getPrice(model = '') {
  const m = model.toLowerCase()
  if (m.includes('opus'))  return PRICING.opus
  if (m.includes('haiku')) return PRICING.haiku
  return PRICING.sonnet
}

function pathToDirName(projectPath) {
  const expanded = projectPath.startsWith('~/')
    ? join(homedir(), projectPath.slice(2))
    : projectPath
  return expanded.replace(/\//g, '-')
}

function formatModel(raw = '') {
  const m = raw.match(/claude-(\w+)-([\d]+-[\d]+)/)
  if (!m) return raw || '—'
  const name = m[1].charAt(0).toUpperCase() + m[1].slice(1)
  const ver  = m[2].replace('-', '.')
  return `${name} ${ver}`
}

function cleanServerName(raw = '') {
  // plugin_context-mode_context-mode → context-mode
  if (raw.startsWith('plugin_')) return raw.slice(7).split('_')[0]
  return raw
}

function readConfiguredMcps(settingsPath) {
  try {
    if (!existsSync(settingsPath)) return []
    const data = JSON.parse(readFileSync(settingsPath, 'utf8'))
    const servers = data.mcpServers || data.mcp?.servers || {}
    return Object.keys(servers).map(cleanServerName)
  } catch { return [] }
}

function extractMcpServer(toolName = '') {
  if (!toolName.startsWith('mcp__')) return null
  const parts = toolName.split('__')
  return parts[1] ? cleanServerName(parts[1]) : null
}

function scanSession(projectPath, projectId, projectName) {
  const dirName = pathToDirName(projectPath)
  const sessionDir = join(PROJECTS_DIR, dirName)

  if (!existsSync(sessionDir)) return { projectId, projectName, status: 'closed' }

  let files
  try {
    files = readdirSync(sessionDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => {
        const fp = join(sessionDir, f)
        return { path: fp, mtime: statSync(fp).mtime }
      })
      .sort((a, b) => b.mtime - a.mtime)
  } catch { return { projectId, status: 'closed' } }

  if (files.length === 0) return { projectId, status: 'closed' }

  const { path: jsonlPath, mtime } = files[0]
  const now = Date.now()
  const age = now - mtime.getTime()
  const status = age < ACTIVE_MS ? 'active' : age < IDLE_MS ? 'idle' : 'closed'

  let lines = []
  try {
    const content = readFileSync(jsonlPath, 'utf8')
    lines = content.trim().split('\n').filter(Boolean).slice(-500)
  } catch { return { projectId, status } }

  let tokenCount = 0
  let model = ''
  let startedAt = null
  let spendUsd = 0
  const mcpLastUsed = {}

  for (const line of lines) {
    let entry
    try { entry = JSON.parse(line) } catch { continue }

    if (!startedAt && entry.timestamp) startedAt = entry.timestamp

    if (entry.type === 'assistant' && entry.message) {
      const usage    = entry.message.usage || {}
      const newInp   = usage.input_tokens || 0
      const cacheW   = usage.cache_creation_input_tokens || 0
      const cacheR   = usage.cache_read_input_tokens || 0
      const out      = usage.output_tokens || 0
      const ctxSize  = newInp + cacheW + cacheR
      if (ctxSize > 0) tokenCount = ctxSize
      if (entry.message.model) model = entry.message.model
      const price = getPrice(entry.message.model)
      spendUsd += newInp * price.input + out * price.output + cacheW * price.cacheWrite + cacheR * price.cacheRead

      const content = entry.message.content
      if (Array.isArray(content)) {
        for (const block of content) {
          const server = block.type === 'tool_use' ? extractMcpServer(block.name) : null
          if (server) {
            const ts = entry.timestamp || null
            if (!mcpLastUsed[server] || (ts && ts > mcpLastUsed[server])) {
              mcpLastUsed[server] = ts
            }
          }
        }
      }
    }
  }

  // "Needs response" = last typed entry is from assistant (Claude finished, waiting for user)
  let needsResponse = false
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry
    try { entry = JSON.parse(lines[i]) } catch { continue }
    if (entry.type === 'assistant') { needsResponse = true; break }
    if (entry.type === 'user') { needsResponse = false; break }
  }

  // "Engaged" = appeared in last 50 lines
  const last50 = lines.slice(-50)
  const engagedServers = new Set()
  for (const line of last50) {
    let entry
    try { entry = JSON.parse(line) } catch { continue }
    if (entry.type === 'assistant' && Array.isArray(entry.message?.content)) {
      for (const block of entry.message.content) {
        const server = block.type === 'tool_use' ? extractMcpServer(block.name) : null
        if (server) engagedServers.add(server)
      }
    }
  }

  // Project-local configured MCPs (not global — would be too noisy)
  const localMcps = readConfiguredMcps(join(projectPath, '.claude', 'settings.json'))
  const localMcpJson = readConfiguredMcps(join(projectPath, '.mcp.json'))
  const configuredLocalNames = [...new Set([...localMcps, ...localMcpJson])]

  // Show: observed in session + project-local configured
  const allNames = [...new Set([...Object.keys(mcpLastUsed), ...configuredLocalNames])]
  const mcps = allNames.map(name => ({
    name,
    engaged: engagedServers.has(name),
    last_used: mcpLastUsed[name] || null,
  }))

  return {
    projectId,
    projectName,
    status,
    model: formatModel(model),
    agent_type: 'Claude Code',
    token_count: tokenCount,
    started_at: startedAt,
    last_active_at: mtime.toISOString(),
    spend_usd: Math.round(spendUsd * 10000) / 10000,
    needs_response: status !== 'closed' && needsResponse,
    mcps,
  }
}

export function scanAllSessions(projects) {
  const sessions = projects.map(p => scanSession(p.path, p.id, p.name))

  const sessions_active = sessions.filter(s => s.status === 'active').length
  const mcps_engaged    = sessions.reduce((n, s) => n + (s.mcps?.filter(m => m.engaged).length ?? 0), 0)
  const spend_today     = Math.round(sessions.reduce((n, s) => n + (s.spend_usd ?? 0), 0) * 100) / 100

  return { sessions, summary: { sessions_active, mcps_engaged, spend_today } }
}
