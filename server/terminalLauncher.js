// server/terminalLauncher.js
import { exec } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)

function escapeAppleScript(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export async function launchInITerm(projectPath, command) {
  const path = escapeAppleScript(projectPath)
  const cmd  = escapeAppleScript(command || 'claude')
  const script = `
    tell application "iTerm"
      activate
      create window with default profile
      tell current session of current window
        write text "cd \\"${path}\\" && ${cmd}"
      end tell
    end tell
  `
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
}

export async function launchInTerminal(projectPath, command) {
  const path = escapeAppleScript(projectPath)
  const cmd  = escapeAppleScript(command || 'claude')
  const script = `tell application "Terminal" to do script "cd \\"${path}\\" && ${cmd}"`
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
  await execAsync(`osascript -e 'tell application "Terminal" to activate'`)
}

export async function launchTerminal(projectPath, command) {
  try {
    await launchInITerm(projectPath, command)
  } catch {
    await launchInTerminal(projectPath, command)
  }
}
