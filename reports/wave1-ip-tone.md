# Wave 1 IP and tone review

Reviewer: ip-and-tone-guard#1, Wave 1, Tue 13 Oct 2026. Read only; no source or spec was changed.

Scope: `design/spec/FROZEN.md`, `sim.md`, `home.md`, `play.md`, `ui.md`, `art.md`, `audio.md`, `voice.md`; `src/content/strings/*.ts`; `src/content/personal.ts`; sprite, palette and outfit keys in `src/art/base/`. Checked against `CLAUDE.md`, `design/ELLIE.md`, `design/BRIEF.md` §19 and §20, and game 1 (`reference/every-version-of-me.html`) for reused letters or hearts text.

## Verdict: BLOCKED

Three one-line hard-rule breaches (band names outside record sleeves). Everything else is clean or needs small fixes. Once B1 to B3 land, this is **CLEAN WITH FIXES**.

Counts: **3 block, 9 fix, 10 nit.**

## Findings

| # | File:line | Quote | Rule broken | Sev | Suggested replacement |
| --- | --- | --- | --- | --- | --- |
| B1 | `src/content/strings/cats.ts:211` | `'ellie.records.01': 'Who keeps moving the Deftones records?'` | BRIEF §20 and FROZEN §5: real band names appear only as text on record sleeves | block | `'Who keeps moving my records? Salem. It was Salem.'` |
| B2 | `design/spec/voice.md:78` | `9. Who keeps moving the Deftones records?` | Same as B1 (this sample is where B1 came from) | block | `9. Who keeps moving my records?` |
| B3 | `design/spec/art.md:306` | `` `poster_band` ... retro (UI draws a band name as text on hover only) `` | BRIEF §20; also contradicts `home.md:261` ("No poster or other item carries a band name") | block | `` `poster_gig` ... retro (abstract original artwork, no band name, no text) `` |
| F1 | `design/spec/play.md:516` | `` `cb.crit.plipp` "Plipp" `` (Splash starter) | IP: a Splash starter called "Plipp" sits too close to Piplup, a Pokémon water starter | fix | `` `cb.crit.drippet` "Drippet" `` (id `crit.drippet`, save enum `'drippet'`) |
| F2 | `design/spec/play.md:1171` | `"A royal tour. Follow me. Slowly, I am old and important."` | voice.md:85, where George never says "I" or "me" (the only exception is the bed line) | fix | `"A royal tour. Follow us. Slowly. We are old and important."` |
| F3 | `src/content/strings/ui.ts:68` | `'ui.mood.okay': 'Fine'` | IP: "Fine" is The Sims 4's neutral mood label, and here it sits under a mood portrait | fix | `'ui.mood.okay': 'Alright'` |
| F4 | `design/spec/sim.md:691`, `:849`, `:911`; `play.md:1243` | `The bath (he runs past it)`; `Salem: she plays the console, he watches the screen`; `while he's awake`; `he can't read` | Salem is "she" in game 1 and `voice.md:15` | fix | `(she runs past it)`; `Salem: she plays the console, Salem watches the screen`; `while she's awake`; `she can't read` |
| F5 | `design/spec/home.md:259`, `:780` | `string key item.frame_grazie.text` / `item.frame_grazie.text (exactly "Grazie per essere te stessa")` | ELLIE.md tone rule 5 and voice.md:28: the phrase lives only in `personal.ts`. A string key duplicates it and will trip the banned-phrase test | fix | `shows only FRAMED_PRINT_TEXT from src/content/personal.ts (no string key)`. Delete the `item.frame_grazie.text` entry from the writer list at :780 |
| F6 | `src/content/strings/onboarding.ts:25` | `"See the bars? That's how you're doing! I can't read them!"` | Accuracy: FROZEN §5 says needs are six candles | fix | `"See the candles? That's how you're doing! I can't read them!"` |
| F7 | `src/content/strings/onboarding.ts:36` | `"That little face up top is your mood. A song helps."` | Accuracy: the mood portrait is bottom-left (`ui.md` §5.1) | fix | `"That little face in the corner is your mood. A song helps."` |
| F8 | `interactions.ts:44`, `ui.ts:26`, `onboarding.ts:49`, `mail.ts:11`, `wishes.ts:62`, `wishes.ts:65` | `Browse the catalog`, `Catalog`, `Open the catalog`, `Order from the catalog`, `fill the catalog`, `Half the catalog` | British English (voice.md:7). Keys can keep `catalog`; displayed text should not | fix | Use `catalogue` in the displayed text only, for example `'Browse the catalogue'`, `'Catalogue'` |
| F9 | `src/content/strings/wishes.ts:40-66` | `asp.hyroxHero.*`, `asp.homeMaker.tier.2: 'One cosy room'`, `tier.3: 'A matching set'` | FROZEN #7 ids (`asp.hyrox`, `asp.royalty`, `asp.home`, `asp.collect`). FROZEN #8 makes T2 "first set" and T3 "3 rooms and 3 sets", so these titles describe the wrong goals | fix | Rekey to the FROZEN ids. Home Maker titles: T2 `'A matching set'`, T3 `'Three rooms, three sets'` |
| N1 | `design/spec/play.md:545` | `Nap Nook` | IP caution: in a Nintendo-flavoured minigame, "Nook" recalls Animal Crossing, and the spot works like a Pokémon Center | nit | `Nap Nest` |
| N2 | `design/spec/play.md:705` | `` A heart shape of stars, with a Peaches line `star.const.heart.peaches` `` | Game 1 has the line "There. A cat and a heart. Somebody up there has taste." Don't reuse it, and keep this one light | nit | Add: `Line must be new and non-romantic, e.g. "Stars made a heart. Show-offs."` |
| N3 | `design/spec/play.md:826` (and sim.md) | `a moodlet moodlet.wish` | "Moodlet" was coined by The Sims 3. It's fine as an internal id but must never reach players | nit | Add: `"moodlet" is internal only; player text says "mood boost".` |
| N4 | `src/content/strings/ui.ts` (`ui.mode.live`, `ui.mode.build`, `ui.settings.freeWill`, `ui.journal.aspirations`, `ui.journal.wishes`) | `Live`, `Build`, `Free will`, `Aspirations`, `Wishes` | These match The Sims' names for the same features, but BRIEF §5, §8 and §11 call for them and they are plain English | nit | No change. Keep them as plain text in our own fonts and colours, with no Sims green and no diamond motifs |
| N5 | `design/spec/art.md:291-293`, `home.md:420`, `home.md:422` | `tv_small`, `console`, `handheld_console`, `arcade_cabinet` | IP caution: there's no art note against recognisable hardware or screens | nit | Add to art.md §105: `Consoles, handheld, controller and arcade cabinet use original shapes: no Game Boy brick, no Joy-Con split, no recognisable arcade game on screen (show Critterbound).` |
| N6 | `src/content/strings/cats.ts:111` | `"Same book again. I'm not listening. Do the voices."` | Invents a habit for Ellie (rereading, reading aloud) that isn't in ELLIE.md | nit | `"Turn the page. I'm not reading along. I'm resting."` |
| N7 | `cats.ts:89`, `:96`, `:97`, `:104`, `:106`, `:107`; `voice.md:130` | e.g. `'Two more. Then stop. Then one more.'` | `voice.md:119` says Shadow uses at most two sentences, but its own sample at :130 has three | nit | Relax voice.md:119 to `at most three short fragments`, or trim the lines to two |
| N8 | `src/content/strings/cats.ts:208` | `'ellie.happy.01': 'Yeah. This is nice.'` | Specific beats general | nit | `'Warm mug. Cat on my feet. Yeah.'` |
| N9 | `src/content/strings/ui.ts:14` | `'Start over? The cats will forget.'` | Tone: a little sad and guilt-tinged | nit | `'Start over? Everything goes back in the boxes.'` |
| N10 | `design/spec/play.md:1289` | `a list of shiny things he wants` | voice.md:15 says Poe takes no pronoun, just "Poe" | nit | `a list of shiny things Poe wants` |

## Checked and clean

- **The Sims:** no plumbob or floating diamond. The bloom is an icon arc with a stem, not a radial text pie menu. The HUD clusters differ from The Sims 3 and 4 bottom bars. The dialogue blips are tones, not a babble language. Nothing in the text uses "Sims", "Simlish", "Sul sul" or "WooHoo".
- **Pokémon and Nintendo:** Critterbound's vocabulary is original (crew, spar, Pep, trick, Snack Tin, Grit, wanderer). Its triangle is not Pokémon's type chart. Fizzlet, Mossby, Kettlecoil, Brineling, Thistlepup, Pip, Marlow and Old Wren are original.
- **Bands:** apart from B1 to B3, band names appear only as sleeve text (`play.md` §5.1, `home.md:261`). There are no lyrics or sound-alikes (`audio.md:92`). The band tee is an original bat print with no text.
- **Hyrox:** no logos. The race office is unbranded.
- **Romance:** none in any spec or string. The giver never appears, and the credits explicitly don't name him (`ui.md:977`). `personal.ts` is empty apart from a neutral commented example. There's no 5-word overlap with game 1's letters or hearts text; the only overlaps are allowed cat voice lines and the skip toast.
- **ELLIE.md facts:** the cats' colours and sizes in `palette.ts` and `cats.ts` match. Ellie's palette has the green streak, nose ring and tattoos. Her favourites are used as written, and sushi is always veggie.
- **Writing style:** no em or en dashes and no banned phrases in `src/content/`. Each cat stays in voice: George uses "we", Poe always ends on "Caw.", Pickle never says more than two ribbits, Shadow never uses "!", Peaches never shouts. The en dashes in `sim.md` and `FROZEN.md` are spec number ranges, not player text.
- **Not verifiable yet:** `reports/art/base.png` is a blank checkerboard, so I couldn't visually check Ellie's sprite for likeness to existing characters. Re-check when the sheet renders.
