# PROGRESS

- **Start:** Mon 12 Oct 2026 22:34 SAST
- **Last update:** Wed 14 Oct ~10:55 SAST
- **Current wave:** 1 (design freeze), final step: code-reviewer#2 re-checking blockers B1-B6 (reports/wave1-recheck.md). Done since pause: contracts v3 (b558fba), string keys (5 commits), art checklist, docs paths. Next: commit "wave 1: spec frozen", then Wave 2.
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

## Usage-saving plan (user asked 14 Oct ~15:30)

- Wave 2+ builders run on Sonnet 5.5 at medium effort; Opus only for architect and integrator.
- Each brief names only the spec sections the agent needs (no whole-spec reads; types.ts is ~3,300 lines, so grep and line ranges).
- Pixel artists: 4 -> 2 (A+D characters/garden/icons, B+C furniture). Wave 2 writer folded into Wave 3 writer.
- No extra review rounds beyond gates; reviewers at medium effort and narrow scope.
- Waves dispatched in batches of 4 or 5. MVP scope first (FROZEN §6); full scope only if budget allows.
- User told to keep other Claude sessions closed (shared usage).
