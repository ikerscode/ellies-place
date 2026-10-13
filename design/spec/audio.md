# Audio spec

Owner: audio-dev. Code: `src/audio/`. Tests: `tests/unit/audio/`. Contract: `design/spec/contracts.md` §16 and `src/core/types.ts` §19.

Everything is synthesised live with Web Audio. There are no audio files and no samples. The engine is game 1's (`reference/every-version-of-me.html`: `initAudio`, `scheduleBar`, the `v*` instruments, `meow`, `sfx`, `setAmbience`), ported to TypeScript and extended.

## 1. Start-up

- The `AudioContext` is created only in `unlock()`. The app calls it from the first user gesture. `createAudio` also arms one-shot `pointerdown`, `keydown` and `touchend` listeners (capture phase) on `window` as a fallback, and removes them once unlocked.
- Before unlock, cues are dropped, and the latest `MusicContext` is kept so the music starts in the right place.
- If Web Audio is missing or throws, the game runs silent. Nothing else changes.
- On `app.visibility` hidden the context is suspended, and on visible it resumes. The scheduler re-anchors after a long gap instead of catching up (see §5).

## 2. Graph and buses

```
decks -> music -> duck -> muffle (low-pass) -> level --+--> master x2.6 -> glue comp -> limiter -> ceiling -> analyser -> out
                                                       +--> reverb send 0.7
sfx  (sfx volume x1.25)  --> master, reverb send 0.25
mini (sfx volume x1.2)   --> master, reverb send 0.5     (gym, race, rusk, sushi cues)
ambience (ambience volume x0.9): rain bed, room tone bed, garden air bed, spot sounds -> window low-pass
reverb: convolver with a generated impulse (2.8 s of noise under (1 - t)^2.6), return 0.4
```

| Stage | Settings | Source |
| --- | --- | --- |
| Master gain | 2.6 | game 1 |
| Glue compressor | threshold -16 dB, ratio 3 | game 1 |
| Limiter | threshold -4 dB, knee 0, ratio 20, attack 1 ms, release 80 ms | new |
| Ceiling | WaveShaper, linear to 0.6, tanh knee to 0.8, no oversampling | new |
| Analyser | fftSize 2048, feeds `levels()` | new |

The ceiling makes a peak above 0.8 impossible. Oversampling is off because its filters could ring past the curve.

Volumes come from `Settings` (`musicVolume`, `sfxVolume`, `ambienceVolume`, all 0..1). The trims above make the defaults (0.7, 0.8, 0.6) match game 1's mix. `applySettings` and the `settings.changed` bus event glide each bus over 0.1 s.

## 3. Instruments

| Instrument | What it is | From |
| --- | --- | --- |
| `vBell` | sine and octave partial, triangle twelfth for the strike | game 1 |
| `vPad` | detuned saw pairs (±7 cents) per note through a 950 Hz low-pass, slow swell | game 1 |
| `vBass` | sine with a short triangle octave | game 1 |
| `vPluck` | triangle through a closing low-pass (4.2 kHz to 600 Hz) | game 1 |
| `vKeys` | sine with 4.5 Hz tremolo and a tine click | game 1 |
| `vFlute` | sine with delayed 5.2 Hz vibrato | game 1 |
| `vHat`, `vKick`, `vSnare` | noise hat, pitch-drop kick, noise and triangle snare | game 1 |
| `vChug`, `vLead` | tanh(6x) distorted power chord and square lead | game 1 |
| `vClap`, `vTom`, `vRim`, `vCrackle` | clap, floor tom, rim click, vinyl crackle | new |

## 4. The theme and its arrangements

The theme is game 1's: **Am F C G Am F E Am**, one chord per bar of 4/4, with a 25-note melody split into eight bars of four beats. The E bar's G# is the harmonic-minor leading tone. Each arrangement plays the melody on even loops. On odd loops it plays an accompaniment figure instead, so no loop repeats twice in a row.

| Track | BPM | Arrangement | Mood |
| --- | --- | --- | --- |
| `title` | 70 | game 1 "room": pad, bass, bell melody, alt bell chords | the menu, a little nostalgic |
| `home` | 76 | game 1 "garden": pad, bass, pluck arpeggio, flute melody, alt pluck melody | calm day |
| `night` | 58 | game 1 "library": pad, low bells, alt high star bells | late and soft |
| `gym` | 112 | four-on-the-floor kick, claps on 2 and 4, eighth-note octave bass, offbeat hats, pluck melody, alt 16th arpeggio, tom fill on bar 8 | driving |
| `heavy` | 84 | game 1 "metal": eighth chugs, kicks, snare on 2 and 4, distorted lead, double-kick fill on bar 8 | metal remix |
| `lofi` | 74 | game 1 "shop" swing keys, slower: rim clicks, lazy kick, vinyl crackle, keys melody laid back 4% of a beat | study beats |
| `cosy` | 66 | game 1 "balcony": pad, soft arpeggio, bell melody, alt flute and bell | blanket and tea |
| `raceDay` | 124 | march: kick on every beat, snare on 2, 4 and the "and" of 4, snare roll into each phrase, bell fanfare an octave up, alt distorted lead | race morning |
| `housewarming` | 96 | party: swing keys, walking bass, claps, bells on the melody | the housewarming |

## 5. Scheduler

Game 1's lookahead scheduler, now pure (`scheduler.ts`):

- A 50 ms timer calls `tick()`. Each deck plans every bar that starts before `now + 0.35 s`.
- If the next bar is more than 1 s in the past (a background tab), the deck re-anchors to `now + 0.1 s`.
- Bar starts are exact multiples of the bar length, so there is no drift.
- A deck walks a playlist. Theme tracks loop forever. Radio tracks play each song for its station's loop count, then move to the next song.
- A bound of 64 bars per call stops a bad tempo from hanging the main thread.

## 6. Radio stations (record player)

There are three stations: **Heavy**, **Lo-fi** and **Cosy**. Each is a six-song playlist that wraps. Song 0 is the game's own theme in the station's arrangement. Songs 1 to 5 are generated (`songgen.ts`) from a fixed seed per station, so the stations sound the same every session.

| Station | Mode | BPM | Tonics | Loops per song |
| --- | --- | --- | --- | --- |
| Heavy | minor | 88 to 108 | E, D, G, A | 2 |
| Lo-fi | minor | 68 to 82 | A, G, F, C | 3 |
| Cosy | major | 62 to 76 | C, G, D, A | 2 |

Generated songs come only from generic building blocks:

- **Chords:** diatonic triads picked from a few eight-bar scale-degree progressions, voiced like game 1 (bass in octave 2, triad folded into MIDI 55 to 67).
- **Melody:** a constrained walk. Strong beats take a chord tone near the last note, and weak beats move one or two scale steps. The range is MIDI 64 to 83, and the last bar holds the tonic.

Nothing is transcribed from, or shaped after, any real song. Album sleeves name real bands as text only (BRIEF §10.4). The music never imitates them.

## 7. Music state machine

`musicState.ts` is pure. A `MusicContext` (from the `music.context` bus event) goes in, and a `MusicDecision { track, muffled, level }` comes out. Priority, highest first:

1. `mode === 'title'`: **title**
2. `housewarming`: **housewarming**
3. `raceDay`, or an activity id containing "race": **raceDay**
4. `mode === 'activity'` with a gym activity id (gym, hyrox, ski, row, sled, burpee, lunge, wallball, kettlebell, carry, treadmill, workout): **gym**
5. `radio` set: that station. It is **muffled** when Ellie is outdoors (garden or front step): low-pass at 900 Hz and level x0.6, as if heard through the window.
6. `phase === 'night'`: **night**. Otherwise **home**.

Other activities, such as the rusk dunk or Critterbound, keep the room's music. Photo mode keeps the track at level x0.7.

**Transitions.** A track change starts a new deck at `now + 0.1 s` and fades every old deck out linearly. Old decks stop scheduling bars past the end of their fade, and are disconnected 4 s later. A change in muffle or level on the same track glides over 0.8 s.

| From, to | Crossfade |
| --- | --- |
| silence to anything | 2 s |
| anything to silence | 1.5 s |
| to or from a radio station (the needle) | 0.6 s |
| to or from gym or race day | 1 s |
| title to the game | 3 s |
| into housewarming | 1.5 s |
| home and night (follows the clock) | 4 s |

Moving between rooms indoors changes nothing. There is no restart and no fade.

**Ducking.** The music bus (not sfx, ambience or minigame) dips to x0.25 (about -12 dB). The attack is 80 ms and the release 600 ms. Overlapping ducks extend the hold.

| Trigger | Hold |
| --- | --- |
| `photo.shutter` | 700 ms |
| `mail.open` | until `mail.close` (capped at 60 s) |
| `duck(ms)` from the app (letters, story beats) | `ms` |

## 8. Ambience

`ambiencePlan.ts` (pure) maps the same `MusicContext` to layer levels. The engine glides the beds and rolls spot sounds every 120 ms.

| Layer | Kind | When |
| --- | --- | --- |
| Birds | spot: 2 to 4 rising sine chirps around 2.6 to 4 kHz | morning 1, day 0.7, evening 0.25; x0.7 when cloudy, x0.15 in rain |
| Crickets | spot: game 1's three-pulse trill at 4.3 to 4.8 kHz | evening 0.5, night 1; x0.4 in rain |
| Rain | bed: noise band-passed at 2.6 kHz, plus game 1's drips | weather rain: 1 outdoors, 0.55 indoors |
| Room tone | bed: brown noise low-passed at 180 Hz, plus a rare creak | indoors |
| Garden air | bed: noise low-passed at 380 Hz | outdoors |

Indoors, outdoor spot sounds are heard through the window at x0.3, and a 2.5 kHz low-pass softens them. The title screen is silent.

## 9. Sound effects

Every cue below exists and has a recipe (`sfx.ts`). A missing recipe is a type error. Misses and refusals are soft and low. **There is no buzzer anywhere.** The cues routed to the minigame bus are gym, race, rusk and sushi.

### Cats and visitors (game 1 signatures)

| Cue | Sound |
| --- | --- |
| `meow` | saw through a sweeping band-pass, pitch rising then falling. Per cat [pitch, length]: George [0.95, 0.55 s], Salem [1.55, 0.32 s], Shadow [0.7, 0.62 s], Peaches [1.2, 0.45 s], Bruce [0.85, 0.5 s] |
| `purr` | low-passed noise with LFO amplitude, 1.4 s. Salem 27 Hz, the others 23 Hz (Bruce 21 Hz). Shadow low-passed at 220 Hz, the others 320 Hz (Bruce 280 Hz) |
| `mrrp` | triangle trill (28 Hz vibrato) rising 380 to 640 Hz times the cat's pitch |
| `chirp` | new: two quick upward triangle blips (bird-watching chatter) |
| `huff` | new: short falling noise breath (unimpressed, not a hiss) |
| `blip` | dialogue blip on the speaker's note: Ellie 76 sine, George 60, Salem 84 sine, Shadow 53, Peaches 70, Bruce 62, Poe 57 square, Pickle 50 square |
| `poe.caw` | game 1's two-caw saw |
| `pickle.ribbit` | game 1's two-pulse square ribbit |
| `cat.land`, `cat.knock`, `cat.zoomies`, `cat.scratch`, `cat.boxIn`, `cat.crunch`, `cat.lap`, `cat.bell` | soft thump; tap then clatter; eight quick paw pats; four scratch strokes; cardboard rustle and thump; kibble crunch; four lapping blips; collar bell |

### Footsteps (`step`, per floor)

| Floor | Filter | Level |
| --- | --- | --- |
| wood | band-pass 700 Hz | 0.05 |
| tile | band-pass 1.5 kHz | 0.035 |
| carpet | low-pass 520 Hz | 0.03 |
| rug | low-pass 680 Hz | 0.028 |
| grass | high-pass 2.6 kHz | 0.022 |
| stone | band-pass 950 Hz | 0.045 |
| gymMat | low-pass 320 Hz, plus a thump | 0.05 |
| gravel | band-pass 2.2 kHz, plus a second grain | 0.04 |

Each step varies its pitch by ±8%. Outdoors in rain, 40% of steps add a splash.

### UI

| Cue | Sound |
| --- | --- |
| `ui.click` | triangle tick |
| `ui.hover` | very soft high tick |
| `ui.open`, `ui.close` | paper swish and two bells (up or down) |
| `ui.confirm` | two bells |
| `ui.back` | falling triangle |
| `ui.nope` | two soft low sines |
| `ui.toggle` | tick |
| `ui.tab` | tick and swish |
| `ui.page` | page turn and pad |
| `ui.toast` | bell |
| `ui.petals` | three rising bells |
| `ui.queueAdd`, `ui.queueCancel` | bell pair up or down |
| `ui.speed` | double tick |
| `ui.pause` | low tick |
| `ui.hearts` | game 1 five-bell rise |
| `ui.wish` | pad and four bells |
| `ui.sticker` | peel and bells |
| `ui.unlock` | game 1 unlock |
| `ui.aspiration` | game 1 start fanfare |
| `mode.build`, `mode.live`, `mode.photo` | toolbox knock; two bells; lens whirr |

### Build mode

| Cue | Sound |
| --- | --- |
| `build.pickUp` | rising sine and lift |
| `build.place` | wooden thump, knock and a tiny bell |
| `build.blocked` | two soft low thuds |
| `build.rotate` | three-click ratchet |
| `build.sell` | whoosh and two coin bells |
| `build.paint` | two brush strokes |
| `build.undo`, `build.redo` | falling or rising triangle |
| `build.duplicate` | double bell |
| `build.eyedropper` | bloop |
| `build.wall`, `build.floor` | local extras: heavy thump; two slides |

### Home

| Cue | Sound |
| --- | --- |
| `door.knock` | the delivery knock: three knocks, 180 ms apart |
| `door.open`, `door.close` | game 1 door sweep; thump |
| `mail.arrive` | letterbox flap and bell |
| `mail.open`, `mail.close` | paper rustle |
| `box.open` | tape rip and cardboard |
| `photo.shutter` | two-part click (and ducks the music) |
| `lamp.on`, `lamp.off` | switch click |
| `record.start` | needle drop and crackle |
| `record.stop` | tape-stop slide |
| `tv.on`, `tv.off` | static pop; collapse |
| `console.boot` | original four-bell chime |
| `kettle.boil` | rising hiss and bubbles |
| `coffee.pour` | pour |
| `rusk.dunk` | bloop |
| `rusk.perfect` | four bells |
| `rusk.plop` | the rusk falls in: thump, splash |
| `sushi.chop`, `sushi.roll`, `sushi.plate` | knife; mat roll; ceramic ping |
| `lantern.light` | match strike, whoomph and bell |
| `star.shoot`, `star.wish` | falling glide with sparkles; pad and slow bells |
| `eat.crunch`, `sit.sofa`, `bed.flop`, `water.run`, `dress.change` | crunches; cushion fwump; fwump and spring; tap water; cloth whoosh and bell |
| `housewarming` | pad and six-bell fanfare |

### Gym and race (minigame bus)

| Cue | Sound |
| --- | --- |
| `gym.countdown` | one 880 Hz beep (send one per count) |
| `gym.go` | high beep and bells |
| `gym.rep` | tick and thump |
| `gym.stroke` skiErg | whoosh and flywheel |
| `gym.stroke` sledPush | grinding rumble |
| `gym.stroke` sledPull | rope pull and drag |
| `gym.stroke` burpeeBroadJump | landing thump and breath |
| `gym.stroke` rowing | seat slide and flywheel |
| `gym.stroke` farmersCarry | kettlebell clink and step |
| `gym.stroke` sandbagLunges | sand thump |
| `gym.stroke` wallBalls | wall hit, then catch |
| `gym.stroke` treadmill, kettlebell | local extras |
| `gym.hit` | perfect: two bells; good: one bell; miss: soft low tap |
| `race.crowd` | intensity 0..1: two crowd beds; above 0.6, whistles |
| `race.cheer`, `race.finish`, `race.pb`, `race.medal` | crowd at 0.8; crowd and fanfare; five-bell rise; metallic bells and shimmer |
| `race.horn` | local extra: two-note saw horn |

## 10. AudioCue list

The shared union lives in `src/core/types.ts` (`AudioCue`, `SimpleCueName`). `src/audio/cues.ts` keeps the local `Cue` union, which is a superset of it. Two compile-time checks enforce this: `fromCore(c: AudioCue): Cue` and `SIMPLE_CUES_COVER_CORE`.

- **Payload cues:** `meow`, `purr`, `mrrp`, `chirp`, `huff` (each with `cat: Meower`), `blip` (`voice`), `step` (`floor`, optional local `wet`), `gym.stroke` (`station`, a local superset adding `treadmill` and `kettlebell`), `gym.hit` (`grade`), and `race.crowd` (`intensity`).
- **Simple cues:** every name in §9.
- **Local extras** (proposed for core in `CONTRACT_REQUEST.md`): `build.wall`, `build.floor`, `race.horn`.

## 11. API

```ts
createAudio(deps: AudioDeps): LocalAudioApi   // LocalAudioApi extends AudioApi
  unlock(): Promise<void>          // creates or resumes the AudioContext (first gesture)
  unlocked: boolean
  play(cue: Cue): void             // also reached by bus 'audio.cue'
  setMusic(ctx: MusicContext)      // also reached by bus 'music.context'; alias setMusicState
  duck(ms: number): void
  applySettings(s: Settings)       // also reached by bus 'settings.changed'; setVolumes({music, sfx, ambience})
  levels(): { peak, rms } | null   // from the AnalyserNode after the ceiling
  dispose(): void
  engine: AudioEngine | null       // tests and a meter page
```

`src/audio/offline.ts` has `renderTrack(track, seconds)`, `renderCue(cue)`, `renderAllTracks()` and `renderAllCues()`. They render through the full master chain in an `OfflineAudioContext` with every volume at 1 (the worst case), and return the peak and RMS. They are meant for qa's Playwright level spec.

## 12. Levels (measured)

The rule is **peak ≤ 0.8**, with no clipping. Chromium (headless), 40 s offline render per track, all volumes at 1, through the full chain, including the room-tone bed:

| Track | Peak | RMS |
| --- | --- | --- |
| title | 0.503 | 0.076 |
| home | 0.384 | 0.077 |
| night | 0.379 | 0.068 |
| gym | 0.648 | 0.073 |
| heavy | 0.712 | 0.085 |
| lofi | 0.608 | 0.058 |
| cosy | 0.502 | 0.086 |
| raceDay | 0.612 | 0.084 |
| housewarming | 0.747 | 0.067 |

- **Sound effects:** the loudest is `race.pb` at 0.700, and the quietest is `ui.hover` at 0.013.
- **Live path:** a real `AudioContext` with a click unlock, Heavy crossfading to Night while a shutter and a meow play, read through `levels()`: peak 0.76.
