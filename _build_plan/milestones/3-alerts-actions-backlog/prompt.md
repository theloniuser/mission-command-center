# Milestone 3 — Alerts, Actions and Backlog

You are entering plan mode to plan and then build milestone 3 of this project.

## Context

- Read `@_build_plan/prd.html` for the full project context, scope, data model, and tech stack.
- Read `@_build_plan/milestones/1-foundation-dashboard-shell/milestone-log.md` for what was built in milestone 1.
- Read `@_build_plan/milestones/2-live-session-monitoring/milestone-log.md` for what was built in milestone 2, especially how session data is structured and how polling works.

## Your task

1. Plan the implementation for **only** milestone 3 as defined in the PRD. Do not plan or build anything from later milestones.
2. After the user confirms the plan, build only what is in milestone 3's scope.
3. Verify your work against the "Done when" criteria for milestone 3 in the PRD.
4. When complete, write a `milestone-log.md` in this folder (`_build_plan/milestones/3-alerts-actions-backlog/milestone-log.md`). Structure it as follows:
   - **Start with a `## What's new in the app` section at the very top.** Concise bulleted list of main user-facing features added — written so a non-technical reviewer can see what's new. Each bullet is a capability the user will now see or be able to do.
   - Then include implementation detail sections for the next milestone's agent:
     - What was built (alert system, audio approach, beads integration, terminal spawning, Brain API wiring, etc.)
     - Any decisions made during implementation not pre-specified in the PRD
     - Anything milestone 4 will need to know
     - Any deviations from the PRD and why

## Key context for this milestone

- Beads data comes from running `bd list` as a shell command — parse its output for the sidebar panel
- Brain API endpoint and key are read from config (endpoint URL) and arc-secrets.env (CAPTURE_API_KEY) — never hardcoded
- Terminal launching: prefer iTerm2 via AppleScript, fallback to macOS Terminal
- Audio: use the Web Audio API or HTML5 audio — curated set of 4-6 distinct sounds, no custom file uploads
- The Brain capture button is persistent in the dashboard header, not buried in a menu

Ask me any clarifying questions using the AskUserQuestion tool to lock in the implementation plan for this milestone.
