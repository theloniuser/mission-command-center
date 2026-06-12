import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import os from 'os'

function expandPath(p) {
  if (!p) return null
  return p.startsWith('~') ? join(os.homedir(), p.slice(1)) : p
}

function parseDate(filename) {
  // changes.YYYY-MM-DD.HH-MM.md
  const m = filename.match(/^changes\.(\d{4}-\d{2}-\d{2})\.(\d{2}-\d{2})\.md$/)
  if (!m) return null
  return new Date(`${m[1]}T${m[2].replace('-', ':')}:00`)
}

function makePreview(content) {
  return content
    .split('\n')
    .map(l => l.replace(/^#+\s*/, '').trim())
    .filter(l => l.length > 0)
    .slice(0, 5)
    .join('\n')
}

export function scanChangelogs(projectPath) {
  const dir = expandPath(projectPath)
  if (!dir || !existsSync(dir)) return []

  let files
  try {
    files = readdirSync(dir).filter(f => /^changes\..+\.md$/.test(f))
  } catch {
    return []
  }

  return files
    .map(filename => {
      const date = parseDate(filename)
      let content = ''
      try {
        content = readFileSync(join(dir, filename), 'utf8')
      } catch {
        return null
      }
      return {
        filename,
        date: date ? date.toISOString() : null,
        preview: makePreview(content),
        content,
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (!a.date && !b.date) return a.filename < b.filename ? 1 : -1
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(b.date) - new Date(a.date)
    })
}
