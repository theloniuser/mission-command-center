# Session: 2026-06-17 12:30 PM — Command Center Distribution Packaging

**Focus**: Making Command Center distributable as a standalone public repo

---

## Summary

Full packaging pass on Command Center: personal config removed from git, local-first fallbacks built for both Beads and Open Brain, ADS-specific hardcoding stripped from source, README and CLAUDE.md written from scratch. Dashboard sort bug fixed (tiles jumping on poll). Session closed with strategic captures about smart local brain, tiered docs, and productization.

---

## Changes Made

### .gitignore
**File**: `.gitignore`
Added `config/*.json` — personal project paths and Supabase URL no longer tracked in git.
Also ran `git rm --cached` on the three existing committed config files.

### Config example templates
**Files**: `config/settings.json.example`, `config/projects.json.example`
Created clean templates for new users to copy. `settings.json.example` defaults to Generic theme and blank endpoint URL.

### configManager.js
**File**: `server/configManager.js`
- Default `theme_mode` changed from `'ADS'` to `'Generic'`
- Added `tasks.json` and `temp-projects.json` to DEFAULTS
- Added `backlogPath: ''` to settings default

### server/index.js — removed ADS hardcoding
**File**: `server/index.js`
- `readEnvKey()`: removed `/Users/Shared/arc-secrets.env` fallback — now reads process.env only
- Added `CONFIG_DIR` constant (`../config` relative to server/)
- Added `appendFileSync` and `join` to imports
- `brain-items` route: replaced `../../tools/backlog.json` hardcoded path with `settings.backlogPath` (configurable, tilde-expanded)

### server/index.js — local task fallback
**File**: `server/index.js`
Added `isBdAvailable()` (lazy, cached), `shortId()`, `localTasksAsGroups()` helpers.
All three beads routes (`GET /api/beads`, `POST /api/beads/close`, `POST /api/beads/new`) now detect `bd` at startup and fall back to CRUD on `config/tasks.json` when not installed. `promote-to-backlog` also routes through local tasks when bd unavailable.

### server/index.js — local brain capture fallback
**File**: `server/index.js`
`brain-capture` route: when `endpoint_url` is blank in settings, appends `YYYY-MM-DD text\n` to `config/notes.md` instead of returning an error. Error message for missing API key changed from "not found in env or arc-secrets.env" to "not set in environment".

### BeadsPanel.jsx — removed ADS client categories
**File**: `src/components/sidebar/BeadsPanel.jsx`
Deleted `CATEGORY_ORDER` array and `categorize()` function which contained Blue Ribbon, Vanderbilt, JMU, and other ADS client-specific regex. Panel now uses `groups` array from the API directly (project-based grouping). Error state removed — silent empty instead. "No open beads." → "No open tasks."

### Dashboard.jsx — stable tile sort
**File**: `src/pages/Dashboard.jsx`
Sort was using `last_active_at` as tiebreaker within status groups, causing the active session tile to jump to the top on every 10-second poll. Fixed: tiebreaker is now `_idx` (original project list order). Active/idle/closed grouping preserved; positions within each group are stable.

### README.md
**File**: `README.md` (created)
Full user-facing README: what it does, prerequisites, setup steps, optional integrations (Beads, brain capture, backlog feed, brand theming), config file reference, architecture overview.

### CLAUDE.md
**File**: `CLAUDE.md` (created + updated)
AI-assistant setup playbook: four questions to ask before starting, step-by-step setup, full integration decision tree (task backlog, brain capture, backlog feed, brand), project configuration, verification checklist, troubleshooting, AI assistant notes.

Beads section corrected after research: cross-platform (macOS/Linux/Windows/FreeBSD), proper install command (`curl -fsSL ... | bash`), correct repo (`github.com/gastownhall/beads`), `bd setup claude`/`bd setup codex` native AI integrations documented, Mac-only caveat removed.

---

## Decisions Made

1. **One-repo model**: Your working copy IS the distributable. ADS-specific values live in gitignored `config/` files, never in source. No manual sync step before distributing — `git push` to a public remote is sufficient.

2. **Local-first defaults**: Both Beads and Open Brain now have zero-config local fallbacks built in. New users get a fully functional tool without any external accounts.

3. **Beads is cross-platform**: Original "Mac only" assumption was wrong — applies only to Beadbox (native macOS GUI). The `bd` CLI works everywhere via Go binaries.

4. **Smart local brain NOT built yet**: The "For Claude" / "To Do" sidebar panels stay empty for users without Open Brain + generate-backlog.py. This is the next priority before distributing (bead `twd`).

---

## Open Threads (captured to brain + beads)

| Bead | Item |
|------|------|
| `twd` | Smart local brain — parse notes.md for "For Claude:" / "To do:" prefixes, populate sidebar panels. One day of work. Build before distributing. |
| `awg` | Tiered README/CLAUDE.md — Starter / Standard / Pro structure |
| `1cm` | Productization strategy — open core vs. one-time purchase vs. GitHub community / stars |

---

## Running State

- Dev server: not running (stopped during session)
- No background processes, worktrees, or open branches

---

## Next Session

1. Build smart local brain (bead `twd`) — the last piece needed before Command Center is self-contained for new users
2. Decide on tiered doc structure (bead `awg`) and restructure README/CLAUDE.md
3. Productization conversation (bead `1cm`) — needs dedicated time, not a footnote
