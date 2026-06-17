import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG_DIR = join(__dirname, '..', 'config')

const DEFAULTS = {
  'projects.json': [],
  'tasks.json': [],
  'temp-projects.json': [],
  'settings.json': {
    alerts: {
      compact_threshold: 80000,
      handoff_threshold: 120000,
      protocol_threshold: 150000,
      inactivity_timeout: 30,
    },
    customAction: {
      name: 'Capture to Brain',
      endpoint_url: '',
      api_key_env_var: 'CAPTURE_API_KEY',
    },
    brand: {
      theme_mode: 'Generic',
      token_css_path: '',
      logo_path: '',
      primary_color: '',
    },
    backlogPath: '',
  },
}

export function readConfig(filename) {
  const filePath = join(CONFIG_DIR, filename)
  if (!existsSync(filePath)) {
    if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true })
    writeFileSync(filePath, JSON.stringify(DEFAULTS[filename] ?? {}, null, 2))
    return DEFAULTS[filename] ?? {}
  }
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

export function writeConfig(filename, data) {
  const filePath = join(CONFIG_DIR, filename)
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(filePath, JSON.stringify(data, null, 2))
}
