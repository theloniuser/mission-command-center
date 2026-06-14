// server/terminalLauncher.js
import { exec } from 'child_process'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
const execAsync = promisify(exec)

export async function launchTerminal(projectPath, command) {
  const scriptPath = join(tmpdir(), `cc-launch-${Date.now()}.command`)
  writeFileSync(scriptPath, `#!/bin/bash\ncd "${projectPath}"\n${command || 'claude'}\n`, { mode: 0o755 })
  await execAsync(`open "${scriptPath}"`, { timeout: 5000 })
}
