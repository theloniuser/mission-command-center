# Session 2026-06-12: ADS Command Center Milestone 4 complete

## What was done

### Milestone 4 — Changelog Feed and Brand Config (COMPLETE)

**Changelog Feed:**
- `server/changelogScanner.js` — reads `changes.YYYY-MM-DD.HH-MM.md` files, parses date from filename, returns reverse-chron entries with previews
- `GET /api/changelogs/:projectId` route — resolves project path, calls scanner, returns `[]` on error (no 500s)
- `src/components/changelog/ChangelogEntry.jsx` — collapsed/expanded accordion; date badge + 5-line preview; click to expand full markdown
- `src/components/changelog/ChangelogPanel.jsx` — fetches on mount, polls 30s, empty/loading states
- `src/components/tiles/ProjectTile.jsx` — Changelog toggle button at tile bottom; inline panel expand

**Brand Config System:**
- `public/ads-tokens.css` — static copy served by Vite for dynamic link loading
- `public/generic-tokens.css` — first-class neutral slate/indigo theme; all token names mapped; dark mode block
- `src/context/BrandContext.jsx` — swaps `<link id="brand-tokens">` href on mode change; `applyBrand()` instant on Settings save
- `index.html` — brand-tokens as first stylesheet; Typekit second
- `src/styles/main.css` — removed `@import './ads-tokens.css'` (tokens now from dynamic link)
- `src/components/settings/SettingsForm.jsx` — ADS/Generic/Custom selector; Custom mode: token CSS path + logo path + primary color fields; `applyBrand()` on save
- `src/components/layout/Header.jsx` — `Logo` component: ADS → SVG swap by theme; Generic → "Command Center" text; Custom + logo_path → `/api/brand-asset` img
- `GET /api/brand-css` and `GET /api/brand-asset` routes for Custom mode (extension validated)

**Brand Audit (ads-brand-audit) — zero ❌ failures achieved:**
- Fixed: 3x `var(--color-orange)` as text on light surfaces → `var(--color-orange-ui)`
- Fixed: `#f5f5f5` hardcoded hex → `var(--color-charcoal-05)`
- Fixed: `bead-priority.p1/p2` white text on orange/blue → `var(--color-charcoal)` (WCAG AA)
- Fixed: 16+ hardcoded `border-radius` px values → `var(--radius-sm/md/lg)` tokens
- Fixed: token link order in `index.html` (brand-tokens now first)

## Files modified

- `server/changelogScanner.js` — created
- `server/index.js` — +3 routes
- `public/ads-tokens.css` — created
- `public/generic-tokens.css` — created
- `src/context/BrandContext.jsx` — created
- `src/components/changelog/ChangelogEntry.jsx` — created
- `src/components/changelog/ChangelogPanel.jsx` — created
- `src/components/tiles/ProjectTile.jsx` — changelog toggle
- `src/components/settings/SettingsForm.jsx` — custom mode fields + applyBrand
- `src/components/layout/Header.jsx` — brand-aware Logo component
- `src/styles/main.css` — token fixes throughout
- `index.html` — brand-tokens link + correct order
- `src/App.jsx` — BrandProvider wrap
- `_build_plan/milestones/4-changelog-feed-brand-config/milestone-log.md` — created

## Next session

**Milestone 5 — Live Chat Interface**: per-tile interactive chat window to send prompts to Claude and see responses inline. Plan with `/gsd:new-milestone` or add `_build_plan/milestones/5-live-chat/prompt.md`.
