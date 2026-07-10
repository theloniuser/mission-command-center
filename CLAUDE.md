# Command Center — AI Setup Guide

This file is for AI assistants helping a user set up Command Center.
Read it fully before taking any action. It is the authoritative setup playbook.

---

## What Command Center is

A local dashboard that runs in a browser tab alongside any AI coding assistant.
It shows active sessions, manages a task backlog, captures thoughts, and launches new sessions.
It requires Node.js and a terminal. It does NOT require any cloud account to function.

---

## Before you start — ask these four questions

Do not assume answers. Ask the user directly, then proceed based on their responses.

**Q1. What OS are you on?**
- macOS → all integrations available
- Windows / Linux → Beads CLI is not supported; use the built-in local task list instead

**Q2. Do you want your task backlog stored locally, or do you use Beads?**
- Local (default, zero config) → nothing to install; tasks saved in `config/tasks.json`
- Beads CLI → cross-platform (macOS, Linux, Windows); install takes ~30 seconds; confirm with `which bd`

**Q3. Do you want thought capture stored locally, or sent to an external service?**
- Local (default, zero config) → captures append to `config/notes.md`
- External API → user needs an endpoint URL and an API key env var (see Brain Capture section below)

**Q4. Which brand theme?**
- Generic (default) → neutral slate/indigo, no config needed
- Custom → user provides an absolute path to a CSS token file and optionally a logo path
- ADS → Arc Design Studio brand (internal use; requires ADS font files)

---

## Setup steps

Run these in order. Stop and report any error before continuing.

```bash
# 1. Prerequisites check
node --version    # must be 18 or higher
git --version     # must be present

# 2. Clone and install
git clone https://github.com/theloniuser/mission-command-center
cd mission-command-center
npm install

# 3. Copy config templates
cp config/settings.json.example config/settings.json
cp config/projects.json.example config/projects.json

# 4. Start the server
npm run dev
```

Open `http://localhost:5173/mission-command-center/` — the dashboard should load.
If the page is blank or errors, check the terminal for server errors before continuing.

---

## Configuring integrations

### Task backlog

**Local (default):** No configuration needed. Tasks created in the sidebar are saved to
`config/tasks.json`. Add tasks from the sidebar, close them with the × button.
Works on all platforms with zero install.

**Beads CLI (recommended for power users):**
Beads (`bd`) is a dependency-aware, git-backed issue tracker built specifically for AI
coding agents. It works on macOS, Linux, Windows, FreeBSD, and Android/Termux.
Repo: https://github.com/gastownhall/beads — Docs: https://gastownhall.github.io/beads

Install (all platforms):
```bash
curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash
```
Or via Homebrew: `brew install gastownhall/tap/bd`
Or via npm: `npm install -g @gastownhall/beads`

After installing, initialize in the user's project and wire up their AI assistant:
```bash
cd /path/to/their/project
bd init

# Then run the setup for whichever AI assistant they use:
bd setup claude    # Claude Code — installs hooks and settings
bd setup codex     # Codex CLI
bd setup factory   # Factory.ai Droid
# (Gemini: install the gemini-beads extension separately)
```

Confirm it works:
```bash
which bd      # should return a path
bd list       # should run without error (empty list is fine)
```

If `bd` is found when the Command Center server starts, it uses Beads automatically.
If not found, it silently falls back to local tasks — no error, no config change needed.

Beads also has a native macOS GUI app (Beadbox): `brew tap beadbox/cask && brew install --cask beadbox`

### Brain / thought capture

**Local (default):** No configuration needed. Captures append to `config/notes.md`.
The brain items panel (sidebar) will show "All clear ✓" — that is expected behavior
when no external brain service is connected.

**External API:** Command Center POSTs `{ "text": "..." }` with an `x-api-key` header
to any endpoint you configure. The endpoint shape is intentionally generic so it works
with many services.

To configure, edit `config/settings.json`:
```json
"customAction": {
  "name": "Capture to Brain",
  "endpoint_url": "https://your-endpoint/capture",
  "api_key_env_var": "MY_API_KEY"
}
```
`api_key_env_var` is the NAME of an environment variable, not the key value itself.
Set the actual key in your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):
```bash
export MY_API_KEY="your-actual-key-here"
```
Then restart your terminal session (or `source ~/.zshrc`) so the server can read it.

**Compatible services:**

| Service | What you need |
|---------|--------------|
| Open Brain | A Supabase edge function that accepts the above shape. See Open Brain setup below. |
| Notion | Create a database + an integration token; use a serverless wrapper (Vercel/Netlify function) to translate the POST shape to Notion's API |
| Webhook.site | Free testing endpoint — no auth; good for verifying the flow works before committing to a service |
| n8n / Make.com | Webhook trigger node; route captures to any destination |
| Custom | Any language/framework; the contract is: POST endpoint, JSON body `{ text }`, `x-api-key` header |

**Open Brain setup (self-hosted):**
Open Brain is a Supabase-backed thought capture service. To set one up from scratch:
1. Create a free [Supabase](https://supabase.com) project
2. Create a `thoughts` table: `id uuid, text text, created_at timestamptz`
3. Deploy a Supabase Edge Function that inserts a row and validates the `x-api-key` header
   against a secret you set in Supabase's environment variables
4. The function URL becomes your `endpoint_url`; your secret becomes the env var value
5. Enable the "Brain items" feed by setting `backlogPath` in `config/settings.json` to
   the absolute path of a `backlog.json` file your brain system generates

If Open Brain publishes a public repo or hosted version in the future, link to it here.

### Brain items feed (sidebar "For Claude" / "To Do" panels)

The sidebar can display structured action items from a `backlog.json` file. This requires
an external brain system that generates that file on a schedule.

Expected shape:
```json
{
  "brain": {
    "for_claude": ["item text", ...],
    "to_do": ["item text", ...]
  }
}
```

Set the absolute path in `config/settings.json`:
```json
"backlogPath": "/Users/yourname/path/to/backlog.json"
```

If this is blank or the file does not exist, the sidebar shows "All clear ✓" — correct behavior.

### Brand / theme

Edit `config/settings.json`:
```json
"brand": {
  "theme_mode": "Generic",
  "token_css_path": "",
  "logo_path": "",
  "primary_color": ""
}
```

| `theme_mode` | Behavior |
|-------------|----------|
| `"Generic"` | Built-in neutral theme. No other fields needed. |
| `"Custom"` | Loads `token_css_path` (absolute path to a `.css` file defining CSS custom properties). Optional: `logo_path` (absolute path to an image file). |
| `"ADS"` | Arc Design Studio brand. Requires ADS font files to be installed. |

---

## Adding projects

In the running app: open **Settings → Projects**, click **Add project**.

Each project needs:
- **Name** — display name on the tile
- **Path** — absolute path to the project directory on disk
- **Launch command** (optional) — defaults to `claude`; can be `codex`, `cursor`, etc.

The path is used to detect active Claude Code sessions and scan for changelog files.
It does not need to be a git repo.

---

## Verification checklist

Walk through these after setup:

- [ ] Dashboard loads at `http://localhost:5173/mission-command-center/`
- [ ] At least one project tile appears
- [ ] Opening a new Claude Code session in that project's directory causes the tile to show "active" within ~10 seconds
- [ ] Typing in the sidebar capture box and pressing Enter saves without error
  - Local mode: `config/notes.md` exists and has an entry
  - API mode: the endpoint responded 200
- [ ] Sidebar backlog loads (shows tasks or "No open tasks" — not an error)
- [ ] Changelog feed on a project tile shows entries (if `changes.*.md` files exist in the project)

---

## Troubleshooting

**Server won't start:**
- Check Node version: `node --version` (must be ≥ 18)
- Run `npm install` again — a missing module is the most common cause

**Dashboard loads but tiles are missing:**
- No projects are configured yet → go to Settings → Projects → Add project
- Check that the path you entered actually exists on disk

**Brain capture returns "Failed":**
- If using local mode: check that `config/` directory is writable
- If using API mode: verify `endpoint_url` is set and reachable; verify the env var is exported in the current shell session (`echo $MY_API_KEY`)

**Beads panel shows "No open tasks" when bd is installed:**
- Confirm `bd list` works in the terminal where you ran `npm run dev`
- The server reads `bd` from `/usr/local/bin` or `/opt/homebrew/bin` — confirm: `which bd`

**Session tiles don't update:**
- The session scanner looks for Claude Code session files in project directories
- Confirm the project path matches where Claude Code is actually running

**Port conflict:**
- The Express server runs on port 3002 (set via `PORT` env var, defaults to 3002 in `server/index.js`), Vite on 5173
- If either is in use: `lsof -ti:3002 | xargs kill` or `lsof -ti:5173 | xargs kill`
- Note: port 3001 is used by an unrelated service (the InDesign UXP bridge server) on this machine — don't confuse the two when debugging connectivity

---

## What to tell the user when setup is complete

Once the checklist passes:

> "Command Center is running. Open http://localhost:5173/mission-command-center/ and keep
> it in a browser tab while you work. It will track your active sessions automatically.
> To start it again next time: run `npm run dev` from the `mission-command-center/` directory."

If they want it to start automatically on login, suggest adding `npm run dev` to a
startup script or launchd plist (macOS) / systemd service (Linux) / Task Scheduler (Windows).

---

## AI assistant notes

- Do not modify `config/*.json` files without reading them first — they may have user data
- Do not hardcode API keys anywhere; always use env var names in config
- The `config/` directory is gitignored — changes there are local only
- If the user asks "what is Open Brain / Beads / etc.", explain it is an optional
  integration and the tool works without it; ask if they want to set it up or use local mode
- Restart the dev server (`Ctrl+C` then `npm run dev`) after any changes to `config/settings.json`


<claude-mem-context>
# Recent Activity

### Jun 22, 2026

| ID | Time | T | Title | Read |
|----|------|---|-------|------|
| #2215 | 9:35 PM | 🔵 | Mission Command Center uses generic ADS favicon | ~175 |
</claude-mem-context>