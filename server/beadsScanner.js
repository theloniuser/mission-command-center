// server/beadsScanner.js
import { exec } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)

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

  // group by project prefix
  const map = new Map()
  for (const item of items) {
    if (!map.has(item.project)) map.set(item.project, [])
    map.get(item.project).push(item)
  }

  const groups = [...map.entries()].map(([name, beads]) => ({
    project: name,
    beads: beads.sort((a, b) => a.priority - b.priority),
  }))

  return { groups }
}
