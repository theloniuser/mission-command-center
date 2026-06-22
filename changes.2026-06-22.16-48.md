# Session 2026-06-22 (16:48) — Mission Command Center public prep

## What was done

### Renamed: ads-command-center → Mission Command Center
- Renamed project to `mission-command-center` (LLM-agnostic, no studio branding)
- Updated `vite.config.js` base URL, `package.json` name, `server/index.js` routes and console log, `README.md`, `CLAUDE.md`

### Tiered README rewrite
- Full rewrite with Starter / Standard / Pro feature matrix
- Starter (zero deps), Standard (Beads), Pro (Brain) clearly delineated
- Clone-ready setup instructions leading with Starter path

### Starter tier audit — zero-dep cleanliness
- `config/notes.md` added to `.gitignore` (personal captures would have leaked)
- `package.json` description debranded
- `server/beadsScanner.js` — fixed hardcoded `../../.beads/beads.db` path (assumed ADS-skills parent); now uses `process.cwd()/.beads/beads.db` so standalone clone works correctly
- `src/context/BrandContext.jsx` — default brand mode changed from `'ADS'` to `'Generic'`
- `src/components/settings/SettingsForm.jsx` — Generic listed first and labeled "(default)"; ADS moved to second option
- `hetzner/` added to `.gitignore` (contains arcdevstudio.com domain configs)
- `index.html` — static default title and token CSS updated

### Configurable dashboard title
- New `title` field in `config/settings.json.example` and `configManager.js` defaults
- `BrandContext.jsx` — exposes `title` and `applyTitle`; loads from settings on mount; falls back to "Mission Command Center"
- `Header.jsx` — renders `{title}` in header, syncs to `document.title` via `useEffect`
- `SettingsForm.jsx` — "Dashboard" section at top with Title input; live-updates on save
- Users can set "ADS Command Center", "X Command Center", etc. in Settings → Dashboard → Title

### Public repo created
- `theloniuser/mission-command-center` created as private on GitHub
- Pushed via `git subtree push --prefix=ads-command-center mcc main`
- Remote `mcc` added to ADS-skills repo pointing to SSH URL

## Files modified
- `ads-command-center/.gitignore`
- `ads-command-center/README.md`
- `ads-command-center/CLAUDE.md`
- `ads-command-center/package.json`
- `ads-command-center/vite.config.js`
- `ads-command-center/index.html`
- `ads-command-center/config/settings.json.example`
- `ads-command-center/server/index.js`
- `ads-command-center/server/beadsScanner.js`
- `ads-command-center/server/configManager.js`
- `ads-command-center/src/context/BrandContext.jsx`
- `ads-command-center/src/components/layout/Header.jsx`
- `ads-command-center/src/components/settings/SettingsForm.jsx`

## Next session
- Test fresh clone from `theloniuser/mission-command-center` with Generic theme
- Verify title setting works end-to-end
- When satisfied, make repo public
- Revisit bead `1cm` (productization strategy) and `awg` (tiered README) — both largely addressed this session
