# PROGRESS

- **Start:** Mon 12 Oct 2026 22:34 SAST
- **Last update:** Wed 14 Oct ~10:20 SAST. Resumed 14 Oct ~10:25 after the user said "continue".
- **Current wave:** 1 (design freeze), RESUMED: architect#3 running again (steps 4-5 left). No agents running. architect#3 (contracts v3) was stopped mid-task; any uncommitted edits it made are in the main working tree (see git status) and its commits so far are on main. To resume: re-dispatch architect#3 (brief = FROZEN rows 17-40 + reports/wave1-contracts-review.md), then writer#keys, then code-reviewer re-check of blockers B1-B6, then commit "wave 1: spec frozen", then Wave 2.
- **Merged branches:** all Wave 1 (game-designer-systems, -home, -play, writer, pixel-artist-lead, audio-dev, ui-dev) on main.
- **Gate status:** Gate 1 mechanical checks GREEN (Chromium). Contracts review verdict NOT READY (6 blockers, 41 fixes): rulings in FROZEN rows 20-37 (2cc97eb). architect#3 applying contracts v3; pixel-artist#lead2 writing art-checklist. Then writer renames keys, then a short re-review, then Gate 1 commit "wave 1: spec frozen". WebKit still NOT run.

## Decisions

- Project lives at `~/Projects/ellies-place`. Worktrees live at `~/Projects/ellies-place-wt/<agent-id>`, branch `w<wave>/<agent-id>`.
- Kit agent types are not registered in the lead session, so each agent is dispatched as a general-purpose agent that reads its role file in `.claude/agents/<type>.md`.
- The lead creates worktrees before dispatch (no built-in isolation). `node_modules` in each worktree is a hardlink copy (`cp -al`) of main's, so agents skip `npm ci` unless `package.json` changed.

- **WebKit:** Playwright's WebKit needs Ubuntu 24.04 libs (ICU 74, libjpeg-turbo8, libxml2 2.9, libvpx9) that Kali lacks. Lead downloaded those .debs from archive.ubuntu.com into `.webkit-libs/` (gitignored) and proved WebKit then boots the game from file://. Running the gate that way was blocked by the session's auto-mode safety check ("code from external"), so the libs were removed from the Playwright cache again and all agents run with `EP_SKIP_WEBKIT=1`. Needs the user's OK to re-enable; then copy `.webkit-libs/lib/*` into `~/.cache/ms-playwright/webkit-2370/minibrowser-{wpe,gtk}/sys/lib/`.

- Agents are told to commit early and often so a restart loses at most one section.

- Lead model switched to Sonnet 5.5 by the user at 22:3x; commit trailers by lead now say Claude Sonnet 5.5. Agents still use Opus 5.5.
- Rulings 17-19 in FROZEN: sim runs at x1 behind minigames; sim.md interaction ids win; Wave 2 writer does placement-error strings.

## Next step

architect#3 (contracts v3) + pixel-artist#lead2 (art checklist) running. Next: writer#keys (rename Wave 1 string keys per FROZEN 22), code-reviewer re-check of blockers only, commit "wave 1: spec frozen", then Wave 2 worktrees.
