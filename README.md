# Command Center

If you run Claude Code, Codex, or any other AI coding assistant across more than a couple of projects, you already know the problem. Sessions pile up across scattered terminal windows, you lose track of what's actually still running, and every context switch means hunting for the right window again. Command Center puts all of it in a single browser tab: live status for every project, a terminal you can launch straight from the dashboard, and a running record of what changed and why, so you always know where things stand without digging back through history.

It's built and maintained by [Arc Design Studio](mailto:build@arcdesignstudio.com). The core you'll read about below is free and open source, and this guide covers everything you need to run it yourself — plus, further down, what ADS can build on top of it for you.

---

## See it in action

https://github.com/user-attachments/assets/ce8892f6-2d9a-44ec-ac5f-10bdea126d0f

## Features at a glance

| | Feature | What it does for you |
|---|---------|----------------------|
| 1 | **One tab, every project** | A tile per project shows whether its AI session is active, idle, or closed, plus the model, token count, and estimated cost. |
| 2 | **Token gauge and nudges** | A bar fills as a session's context grows, and the tile suggests `/compact` or a handoff before the session gets sluggish. |
| 3 | **Terminal in the browser** | Click the terminal icon on a tile to launch your AI assistant. Your session survives a page refresh. |
| 4 | **Several sessions per project** | Hit `+session` to open another terminal for the same project. |
| 5 | **Dock side by side** | Dock up to 3 sessions next to each other, minimize them, and return them to full width any time. |
| 6 | **One-click `/compact` and `/handoff`** | Buttons on every terminal send the command for you. `/handoff` also copies the summary so you can paste it into a fresh session. |
| 7 | **"Needs response" alerts** | The tile tells you when a session is waiting on you, including when it is stuck on a permission prompt or a question. Pick one of 5 alert sounds per project. |
| 8 | **Reorder tiles** | Move tiles left and right. The order is remembered, and tiles never jump around on their own. |
| 9 | **Changelog feed** | Each tile shows that project's recent change notes, read from `changes.*.md` files (a `changelogs/` folder or the project root). |
| 10 | **Task list** | A simple built-in to-do list in the sidebar. Add tasks and close them out as you go. |
| 11 | **Light and dark themes** | Switch with one click, or apply your own colors and logo under Settings. |
| 12 | **Zero cloud, zero accounts** | Everything runs on your own machine. Nothing leaves it unless you choose to connect something. |

---

## Prerequisites

- Node.js 18+
- npm
- macOS works out of the box. On Linux, also run `npm rebuild node-pty` after `npm install` so the in-browser terminal can build its native module. Windows is untested.

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

## Tiers

**Starter** — free, open source, fully self-serve. Everything below is included out of the box: no code is gated, no license key, no config beyond what's in this README. Good fit if you work solo or on a small team and just want one browser tab that shows what's running and lets you launch more of it.

- Project tiles with live session status and a token gauge
- In-browser terminal with multiple sessions per project, side-by-side docking, and one-click `/compact` and `/handoff`
- Reorderable tiles (order is remembered)
- Changelog feed (`changes.*.md` viewer)
- Per-project audio alerts (5 tones) when a session needs a response or hits a threshold
- Local task list
- Brand theming (Generic / Custom)
- Configurable dashboard title and alert thresholds

**Standard — a backlog that actually knows what's going on**

[Beads](https://github.com/gastownhall/beads) itself is open source and installs in about 30 seconds (`bd init` in your repo). That's not what you're paying for. What you're paying for is the dashboard experience built on top of it — the part `bd` alone doesn't give you:

- Live backlog in the sidebar, grouped by project, always current — no terminal command needed to check status
- **Launch** a task straight into a new AI coding session pre-loaded with that task as context — one click
- **Copy** a task's title to hand off to any other agent or chat
- Check a task off right from the sidebar — it closes everywhere else that reads the tracker too
- Recurring tasks ("rituals") tracked separately with last-run / next-run timers, so nothing scheduled quietly falls through

ADS builds and wires this whole sidebar into your Command Center instance, in place of the local task list. **Starting at $350.**

**Pro — your own knowledge system, wired straight into your workflow**

If Standard gives your agents a shared backlog, Pro gives them shared memory — capture and retrieval wired directly into Command Center instead of living in a separate tab. Notion, Obsidian, Open Brain, a custom Supabase setup — whatever you already use to track notes, decisions, and open loops, Pro connects it in. Every knowledge system's API is different, so this is scoped, hands-on integration work, not a templated install:

- Capture a thought, a pasted link, or a dropped file — including PDFs and images — into your knowledge system without ever leaving your terminal
- A live "For Claude" / "To Do" feed pulled straight from that same system, right in the sidebar, always current
- Promote any item into an actual tracked task with one click — no re-typing it into the backlog by hand

**Starting at $750.**

**Custom Branding — make it look like yours**

Starter already supports pointing Command Center at your own colors and logo (Settings → Brand → Custom) — nothing stops you from doing that yourself, and it's covered in full under Settings below. But a self-applied palette swap and a real brand pass aren't the same thing. If you're delivering this to a client or want it to feel native to your own company, [Arc Design Studio](mailto:build@arcdesignstudio.com) will design and build the whole brand treatment for you — tokens, logo placement, every component checked against your brand — so it reads as built for you, not reskinned after the fact.

This isn't a roadmap slide — Standard, Pro, and Custom Branding are all running today inside ADS's own internal Command Center. Interested in any of them? Email [build@arcdesignstudio.com](mailto:build@arcdesignstudio.com) to scope it.

---

## Settings

Everything in the Settings page, section by section.

### Dashboard

Why: if you run more than one instance (say, one per client, or one personal / one work), a distinct title keeps browser tabs from looking identical.

| Field | Description |
|-------|-------------|
| Title | The name shown in the header and browser tab. Defaults to "Command Center" if left blank. |

### Alert Thresholds

Why: long AI coding sessions quietly get worse as context fills up — retrieval accuracy drops, responses slow down, cost per turn climbs. These thresholds put a visible nudge on the tile before that happens, instead of you noticing only after the session's gone sluggish.

| Field | Description |
|-------|-------------|
| Compact nudge (tokens) | Token count at which the tile suggests running `/compact` |
| Handoff warning (tokens) | Token count at which the tile suggests a mid-session handoff |
| Full protocol (tokens) | Token count at which the tile suggests the full session-end protocol |
| Inactivity (minutes) | Minutes of no activity before a session is considered idle |

### Custom Action

Why: this is the setting for wiring the sidebar's "capture a thought" button to your own note-taking or knowledge system — jot something down without leaving the terminal, and have it land wherever you keep notes (Open Brain, Notion, an n8n webhook, anything that accepts a POST).

| Field | Description |
|-------|-------------|
| Button label | Text shown on the capture button (e.g. "Capture to Brain") |
| Endpoint URL | Where the capture is POSTed |
| API key env var | Name of an environment variable holding the auth key — never the key value itself |

**Current status: configuration only.** These fields save to `config/settings.json`, but Starter doesn't yet ship a capture button that uses them — that UI is part of the Pro implementation (see Tiers above). If you'd rather build your own trigger against these settings, the schema is ready and endpoint-agnostic — it POSTs `{ "text": "..." }` with an `x-api-key` header built from whichever env var you name.

### Brand

Why: useful if you're demoing or delivering this to a client and want it to match their brand instead of the default palette, without touching any code.

| Field | Description |
|-------|-------------|
| Theme mode | `Generic` (default, neutral slate/indigo) or `Custom` |
| Token CSS path *(Custom only)* | Absolute path to a `.css` file defining your own CSS custom properties |
| Logo path *(Custom only)* | Absolute path to a `.svg`, `.png`, or `.jpg` logo |
| Primary color *(Custom only)* | Optional hex override, e.g. `#6366f1` |

Custom mode is fully self-serve — build your own token file and point the logo path at your own image. Want it done for you instead? See Custom Branding under Tiers above.

---

## Config files

`config/` is gitignored — your settings stay local.

| File | Purpose |
|------|---------|
| `config/settings.json` | All settings (title, alerts, custom action, brand) |
| `config/projects.json` | Your project list |
| `config/tasks.json` | Local task list (auto-created) |

---

## Architecture

- **Frontend** — React + Vite, served at `/mission-command-center/`
- **Backend** — Express server on port 3002, proxied through Vite in dev
- **Terminal** — WebSocket + node-pty for in-browser terminal sessions

---

## Troubleshooting

**Server won't start** — check `node --version` (must be ≥ 18), then re-run `npm install`.

**Tiles missing** — no projects configured yet. Go to Settings → Projects → Add project.

**Custom Action fields don't seem to do anything** — expected for now. See the Custom Action note under Settings above; there's no capture button wired up in Starter yet.

**Port conflict** — The server runs on 3002 and Vite on 5173. If another program already uses 3002, the server stops with a message instead of touching that program. Start on a different port with `PORT=3012 npm run dev`. If an earlier Command Center from the same folder is still running, it is stopped and replaced automatically.

**Terminal won't open on Linux** — run `npm rebuild node-pty`, then restart with `npm run dev`.

---

## License

MIT. See [LICENSE](LICENSE).
