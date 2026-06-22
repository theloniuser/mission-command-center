# Command Center

A local dashboard for Claude Code, Codex, and other AI coding assistants. See all your projects, launch terminal sessions, and manage your AI coding workflow — all from one browser tab.

---

## Tiers

Command Center is free and open source. Start with Starter — add integrations as you need them.

| Feature | Starter | Standard | Pro |
|---------|:-------:|:--------:|:---:|
| Project tiles with live session status | ✓ | ✓ | ✓ |
| In-browser terminal (multi-pane) | ✓ | ✓ | ✓ |
| Changelog feed (`changes.*.md` viewer) | ✓ | ✓ | ✓ |
| Local task list | ✓ | ✓ | ✓ |
| Brand theming (Generic / Custom) | ✓ | ✓ | ✓ |
| [Beads](https://github.com/gastownhall/beads) backlog integration | | ✓ | ✓ |
| Brain capture (remote API) | | | ✓ |
| Brain backlog feed (For Claude / To Do) | | | ✓ |

---

## Prerequisites

- Node.js 18+
- npm

---

## Starter — zero config, works immediately

```bash
git clone https://github.com/theloniuser/mission-command-center.git
cd mission-command-center
npm install

cp config/settings.json.example config/settings.json
cp config/projects.json.example config/projects.json

npm run dev
```

Open `http://localhost:5173/mission-command-center/` — the dashboard loads.

Go to **Settings → Projects**, add a project with its local path, and you're running.

---

## Adding projects

**Settings → Projects → Add project.** Each project needs:

- **Name** — display label on the tile
- **Path** — absolute path to the project directory on disk
- **Launch command** (optional) — defaults to `claude`; can be `codex`, `cursor`, etc.

The path is used to detect active Claude Code sessions and scan for changelog files.

---

## Standard — add Beads

[Beads](https://github.com/gastownhall/beads) is a dependency-aware, git-backed issue tracker built for AI coding agents. Works on macOS, Linux, Windows, and FreeBSD.

```bash
# Install
curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash

# Initialize in your project and wire up your AI assistant
cd your-project && bd init && bd setup claude   # or: bd setup codex
```

If `bd` is found when Command Center starts, it uses Beads automatically. If not, it falls back to the local task list — no config change needed.

macOS GUI: `brew tap beadbox/cask && brew install --cask beadbox`

---

## Pro — add Brain

Brain adds two things: **thought capture** (send a note to any remote API from the sidebar) and **brain backlog** (a live "For Claude / To Do" feed from your external brain system).

The thought capture endpoint shape is compatible with [Open Brain (OB1)](https://github.com/NateBJones-Projects/OB1) by Nate B. Jones — a self-hosted personal knowledge infrastructure built on Supabase. If you're looking for a brain backend, that's the one to start with.

### Thought capture

By default, captures go to `config/notes.md` (local). To send to a remote endpoint instead, configure it in **Settings → Custom Action**:

```json
"customAction": {
  "name": "Capture to Brain",
  "endpoint_url": "https://your-endpoint/capture",
  "api_key_env_var": "MY_API_KEY"
}
```

`api_key_env_var` is the name of an env var, not the key itself. Set the value in your shell profile:

```bash
export MY_API_KEY="your-actual-key-here"
```

Command Center POSTs `{ "text": "..." }` with an `x-api-key` header. Works with any endpoint — Open Brain, Notion wrapper, n8n webhook, Webhook.site, or custom.

### Brain backlog feed

If your brain system produces a `backlog.json` file, set its absolute path in **Settings → Backlog path**:

```json
{
  "brain": {
    "for_claude": ["item text", "..."],
    "to_do": ["item text", "..."]
  }
}
```

Leave blank to disable. The sidebar shows "All clear ✓" when no path is set — that's expected.

---

## Brand theming

**Settings → Brand** has three modes:

| Mode | Description |
|------|-------------|
| Generic | Built-in neutral slate/indigo theme (default) |
| Custom | Point to your own CSS token file (absolute path) and optional logo |


---

## Config files

`config/` is gitignored — your settings stay local.

| File | Purpose |
|------|---------|
| `config/settings.json` | All settings (brand, custom action, backlog path) |
| `config/projects.json` | Your project list |
| `config/tasks.json` | Local task list (auto-created) |
| `config/notes.md` | Local capture log (auto-created) |

---

## Architecture

- **Frontend** — React + Vite, served at `/mission-command-center/`
- **Backend** — Express server on port 3001, proxied through Vite in dev
- **Terminal** — WebSocket + node-pty for in-browser terminal sessions

---

## Troubleshooting

**Server won't start** — check `node --version` (must be ≥ 18), then re-run `npm install`.

**Tiles missing** — no projects configured yet. Go to Settings → Projects → Add project.

**Brain capture returns "Failed"** — verify `endpoint_url` is reachable and the env var is exported in the shell where you ran `npm run dev` (`echo $MY_API_KEY`).

**Beads panel shows "No open tasks" when bd is installed** — confirm `bd list` works in the same terminal. Check `which bd` — Command Center looks in `/usr/local/bin` and `/opt/homebrew/bin`.

**Port conflict** — Express runs on 3001, Vite on 5173. Kill with: `lsof -ti:3001 | xargs kill` or `lsof -ti:5173 | xargs kill`.
