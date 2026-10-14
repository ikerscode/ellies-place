# PROGRESS

- **Start:** Mon 12 Oct 2026 22:34 SAST
- **Last update:** Wed 14 Oct 10:05 SAST
- **Current wave:** 1 (design freeze). First dispatch (Mon 22:51) was killed by a forced PC restart before any commits; partial files survive in audio-dev, pixel-artist-lead, writer worktrees. Re-dispatched Tue 15:51 in two batches of 4 to keep memory down: batch A architect#1 + 3 game designers (running); architect done 16:08; writer + pixel-artist#lead dispatched 16:09 (told to merge main for contracts); game-designer#systems done (sim.md 767d2e5); audio-dev dispatched 16:12; game-designer#play done (play.md ce081b7); ui-dev dispatched 16:16 (all 8 dispatched). writer done (w1/writer, 63 tests). game-designer#home done (home.md 239827e). pixel-artist#lead done (33 sprites, base.png checked by lead: ported characters look right; cats front-only, new poses + side/up views go to Wave 2 pixel-artist#A). audio-dev done (bf89807, 105 tests, peaks ≤0.76; contract request: AudioCue build.wall, build.floor, race.horn). ui-dev done (205f685, ui.md, 5 additive contract requests). All 8 Wave 1 agents done. integrator#1 merged all 7 branches, no conflicts, 148 tests, e2e smoke green (Chromium). FROZEN.md written. Next: architect contracts v2 + ip-and-tone-guard, then code-reviewer, then Gate 1. Earlier, all three hit the account session limit ~16:20 (resets 20:00); resumed via SendMessage 22:16 with context intact (audio 5 commits, pixel 5 commits, ui 0). Lead drafting FROZEN decisions (home.md vs play.md economy conflicts found).
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
