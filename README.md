# Command Center

A local dashboard for Claude Code power users. Monitor active sessions, manage your project backlog, capture thoughts, and launch new sessions — all from one browser tab.

## What it does

- **Project tiles** — see all your projects at a glance with live session status (active / idle / closed)
- **Task backlog** — built-in local task list, or connect [Beads](https://github.com/theloniuser/beads) if you use it
- **Thought capture** — capture notes to a local file, or wire up any POST endpoint (Open Brain, Notion, etc.)
- **Changelog feed** — per-project changelog viewer for `changes.YYYY-MM-DD.HH-MM.md` files
- **Terminal emulator** — launch Claude or any command directly from a project tile
- **Brand theming** — ships with a Generic theme; swap in your own CSS design tokens

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
git clone https://github.com/theloniuser/ads-command-center
cd ads-command-center
npm install

cp config/settings.json.example config/settings.json
cp config/projects.json.example config/projects.json
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:5173/ads-command-center/` in your browser.

## Adding projects

Go to **Settings → Projects** and add each project with its local path. The path is used to scan for active Claude sessions and changelog files.

## Optional integrations

### Task backlog

Command Center ships with a built-in local task list (stored in `config/tasks.json`). Zero config, works everywhere.

For a more powerful backlog, install **[Beads](https://github.com/gastownhall/beads)** — a dependency-aware, git-backed issue tracker built for AI coding agents. Works on macOS, Linux, Windows, and FreeBSD.

```bash
# Install
curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash

# Initialize in your project and wire up your AI assistant
cd your-project && bd init && bd setup claude   # or: bd setup codex
```

If `bd` is found at server startup, Command Center uses it automatically. If not, it falls back to local tasks — no config change needed.

### Thought capture

By default, captured thoughts are appended to `config/notes.md`.

To send captures to a remote API instead, configure the endpoint in **Settings → Custom Action**:

- **Endpoint URL** — any POST endpoint that accepts `{ "text": "..." }` with an `x-api-key` header
- **API key env var** — the name of the environment variable holding your key (e.g. `CAPTURE_API_KEY`). The value is read from your shell environment — never stored in config.

### Brain backlog (Open Brain / custom)

If you have a brain system that produces a `backlog.json` file (with `{ "brain": { "for_claude": [], "to_do": [] } }` shape), set the absolute path in **Settings → Backlog path**. Leave blank to disable.

## Brand theming

**Settings → Brand** has three modes:

| Mode | Description |
|------|-------------|
| Generic | Built-in neutral slate/indigo theme (default) |
| ADS | Arc Design Studio brand tokens |
| Custom | Point to your own CSS token file and logo |

Custom mode accepts an absolute path to any `.css` file that defines CSS custom properties.

## Config files

`config/` is gitignored. Your personal config (projects, settings) stays local. The `.example` files show the expected shape.

| File | Purpose |
|------|---------|
| `config/projects.json` | Your project list |
| `config/settings.json` | Alerts, custom action, brand, backlog path |
| `config/tasks.json` | Local task list (auto-created) |
| `config/notes.md` | Local brain capture log (auto-created) |

## Architecture

- **Frontend** — React + Vite, served at `/ads-command-center/`
- **Backend** — Express server on port 3001, proxied through Vite in dev
- **Terminal** — WebSocket + node-pty for in-browser terminal sessions
