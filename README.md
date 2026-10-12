# Ellie's Place: Claude Code build kit

This folder is everything Claude Code needs to design and build **Ellie's Place**, a cosy life sim in the spirit of The Sims, set in the same world as *Every Version of Me*. One lead session plans the work and runs a team of up to 12 specialist agents in waves, with tests and reviews between every wave. The result is one HTML file that plays offline on her MacBook.

## What's in here

| Path | What it is |
| --- | --- |
| `PROMPT.md` | The lead's run plan. This is what you tell Claude Code to follow. |
| `CLAUDE.md` | Project rules every agent reads automatically. |
| `design/BRIEF.md` | The game design: home, needs, cats, build mode, activities, progression. |
| `design/ELLIE.md` | Everything personal: her look, her cats, her favourite things, tone rules. |
| `design/TECH.md` | Starting architecture, folder ownership and quality gates. |
| `.claude/agents/` | 18 specialist agents (architect, artists, engine, sim, cats, QA, reviewers...). |
| `.claude/settings.json` | Pre-approved commands so the run doesn't stop for permission every minute. |
| `reference/` | The first game and its engineering document, for agents to reuse code from. |

## Before you start

- Node 20 or newer, and git.
- Claude Code installed and signed in.
- About 1 GB of disk space (dependencies plus browsers for testing).
- Plan for roughly 6 to 7 hours of runtime. The plan builds in a 1.5 hour buffer before your usage resets.

## Run it

1. Unzip the kit, then open a terminal inside the `ellies-place-kit` folder (rename it first if you like).
2. Start Claude Code with edits pre-approved:
   ```
   claude --permission-mode acceptEdits
   ```
3. Type:
   ```
   Read PROMPT.md and run it end to end. Don't stop to ask me questions.
   ```
4. Leave it running. Check `PROGRESS.md` any time to see which wave it's on.

If the session stops or gets interrupted, start Claude Code again in the same folder and type:
```
Read PROGRESS.md and PROMPT.md, then continue from where the run left off.
```

## When it's done

- The game is `dist/ellies-place.html`. Double-click it to play.
- `docs/PLAYER_GUIDE.md` explains how to play, and `docs/PERSONALISE.md` explains what you can change.
- Play it yourself for at least 30 minutes before you give it to her.

## Make it yours

`src/content/personal.ts` holds every personal detail in one place, including an empty personal mail slot. Mail you add there arrives at her front door in the game, on dates you choose. The agents are told not to write anything romantic, so anything in that voice has to come from you.
