# Milestone 4 — Changelog Feed and Brand Config

You are entering plan mode to plan and then build milestone 4 of this project.

## Context

- Read `@_build_plan/prd.html` for the full project context, scope, data model, and tech stack.
- Read `@_build_plan/milestones/1-foundation-dashboard-shell/milestone-log.md` for milestone 1.
- Read `@_build_plan/milestones/2-live-session-monitoring/milestone-log.md` for milestone 2.
- Read `@_build_plan/milestones/3-alerts-actions-backlog/milestone-log.md` for milestone 3.

## Your task

1. Plan the implementation for **only** milestone 4 as defined in the PRD. Do not plan or build anything beyond what is scoped here.
2. After the user confirms the plan, build only what is in milestone 4's scope.
3. Verify your work against the "Done when" criteria for milestone 4 in the PRD.
4. When complete, write a `milestone-log.md` in this folder (`_build_plan/milestones/4-changelog-feed-brand-config/milestone-log.md`). Structure it as follows:
   - **Start with a `## What's new in the app` section at the very top.** Concise bulleted list of main user-facing features added — written so a non-technical reviewer can see what's new. Each bullet is a capability the user will now see or be able to do.
   - Then a final summary section:
     - What was built in this milestone
     - Any decisions made during implementation not pre-specified in the PRD
     - Overall v1 completion status
     - Any deviations from the PRD and why

## Key context for this milestone

- Changelog feed reads `changes.*.md` files from each configured project's local path — use a file watcher to detect new files automatically
- Generic theme is a first-class design deliverable: it must look professional and considered, not like a fallback. Design it as if it were the only brand option.
- Brand config switching must apply immediately without restarting the app or reloading the page
- Final ads-brand-audit must pass zero failures on ADS mode before declaring this milestone complete — run `/ads-brand-apply` then `/ads-brand-audit`

## ADS brand final audit

Before declaring milestone 4 (and v1) complete:
- Run `/ads-brand-apply` on all HTML/CSS
- Run `/ads-brand-audit` — zero failures required, no exceptions
- This is the final gate for v1 shipment

Ask me any clarifying questions using the AskUserQuestion tool to lock in the implementation plan for this milestone.
