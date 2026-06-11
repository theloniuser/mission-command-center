# ADS Command Center

A local operations dashboard for managing multiple Claude Code and Codex sessions across projects.

## `_build_plan/`

The `_build_plan/` folder contains the initial PRD and per-milestone prompts used to scaffold this codebase during its initial build-out phase. These files are **temporary** — they exist for documentation and guidance only. They are **not** functional: no code, configuration, or runtime logic in this codebase should import, reference, or depend on anything inside `_build_plan/`.

Do not treat `_build_plan/` as long-living documentation for the codebase. The codebase will evolve past the assumptions and decisions captured here. Once the initial milestones are complete, this folder is expected to be deleted.

## ADS Brand

This project uses ADS brand tokens. All HTML/CSS must pass `/ads-brand-audit` with zero failures before any milestone is considered complete. Reference `arc-design-studio-brand/DESIGN.md` and `arc-design-studio-brand/ads-tokens.css`.

## Starting a milestone

Open the relevant `_build_plan/milestones/N-{slug}/prompt.md` and ask the agent to enter plan mode using that file as context.
