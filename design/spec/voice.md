# Voice guide

Owner: writer. Every player-facing line in Ellie's Place follows this page. Personal facts come only from `design/ELLIE.md`. Game 1 (`reference/every-version-of-me.html`) set these voices; match them, and never reuse its letters or hearts text.

## House rules

- **British English.** Colour, favourite, cosy, telly, post, biscuit, mum, realise. Displayed text says "catalogue"; keys and ids keep `catalog`. Sushi is always vegetarian when Ellie makes it.
- **Short.** Most lines are one or two sentences. Some are one word. Mix the lengths so a run of bubbles doesn't read like a metronome.
- **Specific beats general.** "Salem is in the box. Salem lives in the box now." beats "Salem loves boxes!"
- **Funny first, warm underneath.** The cats are devoted to Ellie and would sooner eat cucumber than say so (except Salem, who says so every four seconds).
- **No romance.** No confessions, no love letters, no hearts text from game 1. The giver never appears or speaks. Mail from the giver lives only in `src/content/personal.ts`, and he writes it himself.
- **No IP.** No names, creatures, catchphrases, items or invented-language words from The Sims, Pokémon, Nintendo or any other game or show. The life sim and the monster RPG are ours. Real band names appear only as text on record sleeves, with no lyrics. Internal terms such as "moodlet" never reach players: player text says "mood boost".
- **Punctuation.** No em or en dashes, and no `--` standing in for one. Use three full stops for a trailing pause (`...`), never the single ellipsis character. Straight quotes and apostrophes only, because the pixel font is ASCII-first. `é` in "café" is the one exception.
- **Placeholders:** `{name}` for Ellie's name, `{cat}` for a cat's name, `{n}` for a number. Nothing else.
- **Pronouns:** George, Shadow, Bruce and Pickle are "he". Salem and Peaches are "she". Poe is "Poe".

## Banned phrases and patterns

The unit test in `tests/unit/strings/` enforces most of these, plus some voice rules: George never says "I" or "me", Shadow never uses "!", every Poe line ends with "Caw.", and Pickle stops at two ribbits a line.

- Em dash, en dash, `--`, and the `…` character
- "Honestly?", "Here's the thing", "a testament to", "not just X but Y"
- "elevate", "seamless", "vibrant", "tapestry", "journey" (unless someone is literally travelling), "delve", "embark", "unleash", "nestled"
- Motivational-poster endings: "You've got this!", "Believe in yourself", "Every step counts", "You deserve it"
- Reflexive groups of three ("cosy, calm and connected")
- Romance: "love letter", "I love you", "my love", "darling", "sweetheart", "kiss", "confess", "valentine"
- IP: "Sims", "Simlish", "Pokémon", "Pokemon", "Poké", "Nintendo", "plumbob", "gotta catch", "Sul sul", "trainer battle"
- The framed-print phrase. "Grazie per essere te stessa" lives only in `personal.ts`, behind its flag.
- American spellings: color, favorite, cozy, center, gray, mom, candy, cookie, realize, apartment

## Length limits

| What | Key prefix | Limit |
| --- | --- | --- |
| Interaction labels | `int.` | 22 characters |
| Wish titles | `wish.` | 40 characters |
| Aspiration names and tier titles | `asp.*.name`, `asp.*.tier.n` | 40 characters |
| Aspiration goals and rewards | `asp.*.tier.n.goal`, `.reward` | 70 characters |
| Aspiration blurbs | `asp.*.desc` | 80 characters |
| Speech bubbles | `cat.`, `visitor.`, `ellie.`, `onboard.` | 70 characters |
| Toasts and hints | `ui.toast.`, `ui.hint.` | 80 characters |
| Confirm prompts and taglines | `*Confirm`, `*.tagline` | 80 characters |
| Need tooltips and reasons | `ui.need.*.help`, `ui.reason.*`, `build.err.*` | 80 characters |
| Grade labels | `grade.*` | 16 characters |
| Other UI labels | `ui.`, `onboard.ui.` | 32 characters |
| Mail subject | `mail.*.subject` | 40 characters |
| Mail body | `mail.*.body` | 4 lines, each 56 characters or fewer, split with `\n` |
| Item names | `item.*.name` | 28 characters |
| Item blurbs | `item.*.desc` | 80 characters |
| Anything else | | 80 characters |

Limits count characters after placeholders are filled with typical values (`{name}` as "Ellie", `{cat}` as "Peaches", `{n}` as "50").

## Key naming

`domain.subject.situation.nn`: a lower-case domain, then camelCase segments, then a two-digit variant number for speech. Ids from content tables keep their own spelling (`item.sofa_small.name`).

- **Speech:** `cat.<cat>.<situation>.nn`, `visitor.<bruce|poe|pickle>.<situation>.nn`, `ellie.<situation>.nn`. Lines that share everything but the number are interchangeable variants, numbered 01, 02... with no gaps, so code can pick one with the seeded RNG by counting keys under the prefix.
- **Common situations:** `pet`, `idle`, `food`, `nap`, `bed`, `morning`, `newItem`, `approve`/`disapprove` (George on new furniture), `race`, `caption` (photo captions), `lowMood`, `grass`, plus each cat's own (`box`, `ham`, `knock`, `zoomies`, `laser` for Salem; `sunbeam`, `record`, `lid` for Peaches; `heavy`, `lap`, `trust` for Shadow; `fish`, `pillow`, `bow`, `knight` for George).
- **Onboarding:** `onboard.<speaker>.<step>.nn`, in play order, and `onboard.ui.*` for its buttons.
- **Content (FROZEN 22; one builder per family in `src/core/keys.ts`, which is the truth for spelling):**
  - Interactions: `int.<interactionId>` with the `sim.md` §4.3 and §8.6 id (`int.bed.sleep`, `int.cat.pet`, `int.gym.<station>.train`). A reason written for one interaction is `int.<id>.why.<n>`.
  - Wishes: `wish.<wishId>`, where the id does not repeat the prefix (`wish.bow_george`); an optional cat reaction is `wish.<wishId>.done`.
  - Mail: `mail.<mailId>.subject` and `.body` (`mail.pickle.welcome.subject`); `.from` for the sender where `play.md` names one.
  - Items: `item.<ItemId>.name` and `.desc`. Rooms: `room.<roomId>`.
  - Aspirations: `asp.<id>.name` and `.desc`, then per tier `asp.<id>.tier.<1-4>` (title), `.goal` and `.reward`. Ids: `hyrox`, `royalty`, `home`, `collect` (FROZEN 7).
  - Placement errors: `build.err.<PlacementError>`, one per member (nineteen).
- **UI keyed by contract enums,** so code can build the key (the coverage test in `tests/unit/core/keyCoverage.test.ts` walks every one, with no allowlist left): `ui.need.<need>.name` and `.help` (six Ellie needs, eight cat needs), `ui.bond.<0-4>`, `ui.mood.<MoodBand>`, `ui.phase.<dawn|day|dusk|night>`, `ui.mode.<GameMode>`, `ui.speed.<0-3>`, `ui.day.<Weekday>`, `ui.category.<ItemCategory>`, `ui.style.<StyleTag>`, `ui.cosy.<CosyFactor>`, `ui.journal.<JournalTab>`, `ui.radio.<RadioStation>`, `ui.hyrox.<HyroxStation>`, `ui.reason.<ReasonCode>` (why a petal is greyed or an action refused), `grade.<perfect|great|good|okay>`.
- **Other UI:** `ui.<area>.<thing>`; toasts are `ui.toast.*`, hints `ui.hint.*`.

## The voices

### Ellie

Few words. Dry, warm, a bit tired in the mornings. She speaks rarely, so each line should earn its bubble. She notices her own favourite things without explaining them. Never write facts about her that aren't in `ELLIE.md`.

- Avoid: gushing, exclamation marks before 10 a.m., explaining her feelings, talking about the giver.

1. Coffee first. Then words.
2. Morning. Allegedly.
3. George. That's my pillow.
4. Five more minutes. Six.
5. Wall balls. Who named them that.
6. Veggie, please. Always veggie.
7. Salem, that's the delivery. Oh. Fine. It's yours.
8. This is the good grass.
9. Who keeps moving my records?
10. One more battle. Then bed. Probably.

### George

Royal "we", formal, judgemental, secretly devoted. He inspects everything, approves of little, and sits wherever Ellie wanted to sit. He wants fish in the sushi and never gets it. After the Knighting he calls her "Sir {name}".

- Avoid: "I" or "me" (it is always "we" and "us"), being openly soft, slang. The one exception is the brief's own tour line, "This is your bed. It was mine. You may borrow it."

1. The King permits this. Briefly.
2. We have inspected the new sofa. We have notes.
3. Fish? No? We are wounded. We will survive.
4. We did not wait up. We were simply awake, near the door.
5. Kneel. Lower. Fine, that will do.
6. This rug is beneath us. Literally. We approve.
7. Sir {name}. It has a ring to it. We chose well.
8. The vase was ugly. We said nothing. Salem said something.
9. You may have the pillow tonight. The left half. The small half.
10. We are not sitting on your laptop. We are guarding it.

### Salem

Small, black, sweet and goofy. All caps when excited, in short bursts. Loves ham. Can't read, and is proud of it. Follows Ellie everywhere and adores her out loud. Lives in every box.

- Avoid: long sentences, sarcasm, reading anything correctly, being sad for more than one line.

1. BEST. DAY. EVER.
2. A BOX! Is it for me? It's for me. I'm in it.
3. Is that ham? It smells like ham. Is everything ham?
4. I read your post! It said ham. I think it said ham.
5. Where are you going? Can I come? I'm coming.
6. IT'S 3 A.M.! ZOOM TIME!
7. I pushed it off to see if it still worked. It doesn't.
8. I can't read, but I can sit on reading. Same thing.
9. I live in the box now. Send ham.
10. You came back from the kitchen! I missed you SO much!

### Shadow

Big, black, unimpressed. Minimal and deadpan. Denies having feelings, then quietly turns up when Ellie is low. Likes the dark: under the bed, on the wardrobe, in the closet. Leaves when the Heavy station goes on.

- Avoid: exclamation marks, more than three short fragments (at most three per line), admitting anything.

1. I'm not purring. That's the floor.
2. Move things. Quietly.
3. I was already sitting here. You came to me.
4. This changes nothing.
5. Heavy. I'll be under the bed.
6. No.
7. Don't look at me. Read your book.
8. The wardrobe is mine. You may keep clothes in it.
9. I'm not here because you look sad. The floor's warmer here.
10. Fine. One minute. I'm timing it.

### Peaches

Average size, dilute calico, laid-back. Relaxed and musical, and she says less than she means. Follows sunbeams across the floor, loves records and anything warm. Sits on the record player lid when it's off, as a hint.

- Avoid: urgency, all caps, telling Ellie what to do directly (she hints).

1. Oh, that's the spot.
2. Flip the record? No rush.
3. The sun moved. So I moved.
4. This one's got a good bassline. Mm.
5. Laptop's warm. I'll keep it warm for you.
6. I'm on the lid. That's a hint.
7. Turn it up a bit. Bit more. There.
8. Nobody's in a hurry today.
9. Shadow left. More floor for us.
10. Wake me if the sun comes back.

### Bruce

Flame point Siamese, a secret visitor. Insists he isn't there, even mid-sentence. Hides at the garden fence, under the kitchen table, behind the TV, on top of the fridge and in a delivery box, and eventually lives on the garden wall.

- Avoid: admitting he's there without taking it back, explaining where he came from.

1. I was never here.
2. Nobody invited me. I came anyway.
3. This isn't a fence. I'm not on it.
4. I'm a cushion. Sit somewhere else.
5. You didn't see me behind the telly. Good.
6. Bruce? Never heard of him. Lovely cat, apparently.
7. I live on the wall now. The wall doesn't know.
8. This box is taken. By nobody. Me.
9. It's warm on the fridge. I've never been up here.
10. Don't tell the ginger one.

### Poe

A raven who trades at the bird bath. Clipped, businesslike, obsessed with shiny things. Ends lines with "Caw."

- Avoid: long sentences, forgetting the "Caw.", caring about anything that doesn't glint.

1. Caw.
2. That's shiny. I'll take it. Caw.
3. One button for one lamp. Fair trade. Caw.
4. A bottle cap with a dent. Exquisite. Caw.
5. The small black cat drops good things. Caw.
6. I don't do refunds. Caw.
7. Your bird bath. My office. Caw.
8. Nose ring. Very shiny. Not for sale? Pity. Caw.
9. Spoon. Spoon. Not a spoon. Caw.
10. Back tomorrow. Polish something. Caw.

### Pickle

A frog who runs Pickle's Deliveries. An upbeat shopkeeper who says "Ribbit" too much and sometimes explains it. Every order comes with a knock, a box and a note.

- Avoid: more than two ribbits per line, any monster-type jokes (that's someone else's IP), being anything less than delighted.

1. Ribbit! Delivery for {name}!
2. Ribbit. That one was just me being pleased.
3. Sign here. A pawprint's fine.
4. Box is yours. Cat is in it. Ribbit.
5. Ribbit ribbit. That's two. It's a big order.
6. Pickle's Deliveries! We deliver. That's the whole name.
7. Everything's in stock except flies. Ribbit.
8. I knocked. Then I ribbited. Both count.
9. Fragile! I was very careful. Mostly I hopped.
10. Ribbit. Sorry. Customer service voice.

## Narrator

Toasts, item blurbs and journal text are in a light, wry third person, present tense. "Salem is in the box. Salem lives in the box now." The narrator never addresses Ellie as "you" in a gushing way and never ends on a lesson.

## Process

Draft, then ask "what makes this sound AI-written?" and fix it. Read each cat's lines in a row: if two could swap speakers, rewrite one of them.
