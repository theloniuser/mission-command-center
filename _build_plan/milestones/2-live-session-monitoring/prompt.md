# Milestone 2 — Live Session Monitoring

You are entering plan mode to plan and then build milestone 2 of this project.

## Context

- Read `@_build_plan/prd.html` for the full project context, scope, data model, and tech stack.
- Read `@_build_plan/milestones/1-foundation-dashboard-shell/milestone-log.md` to understand what was built in milestone 1.

## Your task

1. Plan the implementation for **only** milestone 2 as defined in the PRD. Do not plan or build anything from later milestones.
2. After the user confirms the plan, build only what is in milestone 2's scope.
3. Verify your work against the "Done when" criteria for milestone 2 in the PRD.
4. When complete, write a `milestone-log.md` in this folder (`_build_plan/milestones/2-live-session-monitoring/milestone-log.md`). Structure it as follows:
   - **Start with a `## What's new in the app` section at the very top.** Concise bulleted list of main user-facing features added — written so a non-technical reviewer can see what's new. Each bullet is a capability the user will now see or be able to do.
   - Then include implementation detail sections for the next milestone's agent:
     - What was built (files created, routes added, data reading approach, etc.)
     - Any decisions made during implementation not pre-specified in the PRD
     - Anything milestone 3 will need to know (especially: how session data is structured, what polling approach was used, how MCP status is detected)
     - Any deviations from the PRD and why

## Key context for this milestone

- Claude Code session data lives in `~/.claude/projects/` as JSONL files — read these to get token counts and session state
- Codex session monitoring is best-effort; document what was found and what wasn't available
- All data reading is local — no external API calls for this milestone
- The token gauge thresholds are 80K (yellow), 120K (orange), 150K (red)

Ask me any clarifying questions using the AskUserQuestion tool to lock in the implementation plan for this milestone.
