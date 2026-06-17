// server/beadsScanner.js
import { exec } from 'child_process'
import { promisify } from 'util'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
const execAsync = promisify(exec)

const __dirname = dirname(fileURLToPath(import.meta.url))
// Parent project's beads DB (ads-command-center/server/ → ADS-skills/.beads/)
const BEADS_DB = resolve(__dirname, '../../.beads/beads.db')

const KEYWORD_INTERVALS = {
  daily:   1, overnight: 1,
  weekly:  7, sunday: 7, monday: 7, tuesday: 7, wednesday: 7, thursday: 7, friday: 7, saturday: 7,
  monthly: 30,
  quarterly: 90,
}

function inferIntervalMs(title) {
  const lower = title.toLowerCase()
  for (const [kw, days] of Object.entries(KEYWORD_INTERVALS)) {
    if (lower.includes(kw)) return days * 86_400_000
  }
  return null
}

async function getRitualInfo(title) {
  try {
    const prefix = title.slice(0, 25).replace(/'/g, "''")
    const sql = `SELECT closed_at FROM issues WHERE title LIKE '${prefix}%' AND status='closed' ORDER BY closed_at DESC LIMIT 2;`
    const { stdout } = await execAsync(`sqlite3 "${BEADS_DB}" "${sql}"`)
    const rows = stdout.trim().split('\n').filter(Boolean)
    if (!rows.length) return { lastRun: null, nextRunMs: null }
    const lastRun = rows[0]
    const gap = rows.length >= 2
      ? new Date(rows[0]) - new Date(rows[1])
      : inferIntervalMs(title)
    const nextRunMs = gap ? new Date(rows[0]).getTime() + gap : null
    return { lastRun, nextRunMs }
  } catch {
    return { lastRun: null, nextRunMs: null }
  }
}

// bd list line format:
// ADS-skills-cmz [P2] [task] open - Title text
// ADS-skills-1r8 [P2] [task] open [other] - Title text
const LINE_RE = /^(.+)-(\w{3})\s+\[P(\d+)\]\s+\[(\w+)\]\s+(\w+)(?:\s+\[([^\]]+)\])?\s+-\s+(.+)$/

export async function scanBeads() {
  let stdout
  try {
    ;({ stdout } = await execAsync('bd list', { env: { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}` } }))
  } catch {
    return { groups: [] }
  }

  const items = []
  for (const line of stdout.trim().split('\n')) {
    const m = line.match(LINE_RE)
    if (!m) continue
    const [, project, id, priority, type, status, tags, title] = m
    items.push({ id, project, priority: Number(priority), type, status, tags: tags || null, title })
  }

  // Attach lastRun to each ritual bead before building groups
  const ritualItems = items.filter(b => b.title.toLowerCase().includes('ritual'))
  await Promise.all(ritualItems.map(async b => {
    const { lastRun, nextRunMs } = await getRitualInfo(b.title)
    b.lastRun = lastRun
    b.nextRunMs = nextRunMs
  }))

  // Separate rituals from regular items, then group remainder by project
  const rituals = items.filter(b => b.title.toLowerCase().includes('ritual'))
  const regular = items.filter(b => !b.title.toLowerCase().includes('ritual'))

  const map = new Map()
  for (const item of regular) {
    if (!map.has(item.project)) map.set(item.project, [])
    map.get(item.project).push(item)
  }

  const groups = []
  if (rituals.length) {
    groups.push({ project: 'Rituals', isRitual: true, beads: rituals.sort((a, b) => a.priority - b.priority) })
  }
  groups.push(...[...map.entries()].map(([name, beads]) => ({
    project: name,
    beads: beads.sort((a, b) => a.priority - b.priority),
  })))

  return { groups }
}
