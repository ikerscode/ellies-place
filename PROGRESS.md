# PROGRESS

- **Start:** Mon 12 Oct 2026 22:34 SAST
- **Last update:** Tue 13 Oct 22:16 SAST
- **Current wave:** 1 (design freeze). First dispatch (Mon 22:51) was killed by a forced PC restart before any commits; partial files survive in audio-dev, pixel-artist-lead, writer worktrees. Re-dispatched Tue 15:51 in two batches of 4 to keep memory down: batch A architect#1 + 3 game designers (running); architect done 16:08; writer + pixel-artist#lead dispatched 16:09 (told to merge main for contracts); game-designer#systems done (sim.md 767d2e5); audio-dev dispatched 16:12; game-designer#play done (play.md ce081b7); ui-dev dispatched 16:16 (all 8 dispatched). writer done (w1/writer, 63 tests). game-designer#home done (home.md 239827e). pixel-artist#lead done (33 sprites, base.png checked by lead: ported characters look right; cats front-only, new poses + side/up views go to Wave 2 pixel-artist#A). audio-dev done (bf89807, 105 tests, peaks ≤0.76; contract request: AudioCue build.wall, build.floor, race.horn). ui-dev done (205f685, ui.md, 5 additive contract requests). All 8 Wave 1 agents done. integrator#1 merged all 7 branches, no conflicts, 148 tests, e2e smoke green (Chromium). FROZEN.md written. Next: architect contracts v2 + ip-and-tone-guard, then code-reviewer, then Gate 1. Earlier, all three hit the account session limit ~16:20 (resets 20:00); resumed via SendMessage 22:16 with context intact (audio 5 commits, pixel 5 commits, ui 0). Lead drafting FROZEN decisions (home.md vs play.md economy conflicts found).
- **Merged branches:** all Wave 1 (game-designer-systems, -home, -play, writer, pixel-artist-lead, audio-dev, ui-dev) on main.
- **Gate status:** Gate 0 GREEN on Chromium (typecheck, lint, 15 unit tests, build 174.6 KB, e2e smoke, soak stub). WebKit NOT run, see below.

## Decisions

- Project lives at `~/Projects/ellies-place`. Worktrees live at `~/Projects/ellies-place-wt/<agent-id>`, branch `w<wave>/<agent-id>`.
- Kit agent types are not registered in the lead session, so each agent is dispatched as a general-purpose agent that reads its role file in `.claude/agents/<type>.md`.
- The lead creates worktrees before dispatch (no built-in isolation). `node_modules` in each worktree is a hardlink copy (`cp -al`) of main's, so agents skip `npm ci` unless `package.json` changed.

- **WebKit:** Playwright's WebKit needs Ubuntu 24.04 libs (ICU 74, libjpeg-turbo8, libxml2 2.9, libvpx9) that Kali lacks. Lead downloaded those .debs from archive.ubuntu.com into `.webkit-libs/` (gitignored) and proved WebKit then boots the game from file://. Running the gate that way was blocked by the session's auto-mode safety check ("code from external"), so the libs were removed from the Playwright cache again and all agents run with `EP_SKIP_WEBKIT=1`. Needs the user's OK to re-enable; then copy `.webkit-libs/lib/*` into `~/.cache/ms-playwright/webkit-2370/minibrowser-{wpe,gtk}/sys/lib/`.

- Agents are told to commit early and often so a restart loses at most one section.

## Next step

architect#2 applies FROZEN §4 contracts v2; ip-and-tone-guard reviews specs + strings; then code-reviewer on contracts; then Gate 1.
