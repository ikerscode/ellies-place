# PROGRESS

- **Start:** Mon 12 Oct 2026 22:34 SAST
- **Last update:** 22:35 SAST
- **Current wave:** 0 (scaffold)
- **Merged branches:** none
- **Gate status:** n/a

## Decisions

- Project lives at `~/Projects/ellies-place`. Worktrees live at `~/Projects/ellies-place-wt/<agent-id>`, branch `w<wave>/<agent-id>`.
- Kit agent types are not registered in the lead session, so each agent is dispatched as a general-purpose agent that reads its role file in `.claude/agents/<type>.md`.
- The lead creates worktrees before dispatch (no built-in isolation). `node_modules` in each worktree is a hardlink copy (`cp -al`) of main's, so agents skip `npm ci` unless `package.json` changed.

## Next step

Architect scaffolds Wave 0, then Gate 0.
