# Parts catalog

Defined in `src/parts.ts`. `partPool(kind, vibe)` filters these tables.

## Bodies (27)

| id | left | right | vibes | note |
|---|---|---|---|---|
| `round` | `(` | `)` | cute, cool, weird | |
| `bear` | `ʕ` | `ʔ` | cute | forces mouth `bear` (`ᴥ`) for rendering; your selected mouth is preserved in `parts.mouth` |
| `wave` | `ヽ(` | `)ﾉ` | cute | |
| `hug` | `⊂(` | `)⊃` | cute | |
| `cloud` | `꒰` | `꒱` | cute | |
| `bot` | `[` | `]` | cool, weird | |
| `shrug` | `╭(` | `)╮` | cool | |
| `flex` | `ᕦ(` | `)ᕤ` | cool | |
| `angle` | `<(` | `)>` | weird | |
| `curly` | `{` | `}` | weird | |
| `owl` | `ʢ` | `ʡ` | weird | |

## Eyes (16)

Each eye defines glyph pairs for `open / blink / happy / wide / sad / angry / sleep`.

| id | vibes | open | happy | wide | sad | angry | sleep |
|---|---|---|---|---|---|---|---|
| `dot` | cute, cool | `• •` | `^ ^` | `⊙ ⊙` | `╥ ╥` | `ò ó` | `˘ ˘` |
| `round` | cute, weird | `◕ ◕` | `◠ ◠` | `◉ ◉` | `ಥ ಥ` | `ಠ ಠ` | `ᴗ ᴗ` |
| `tiny` | cute, cool | `· ·` | `^ ^` | `° °` | `; ;` | `` ´ `` | `- -` |
| `smug` | cool | `¬ ¬` | `≧ ≦` | `⊙ ⊙` | `´ ｀` | `≖ ≖` | `- -` |
| `box` | cool, weird | `■ ■` | `^ ^` | `◉ ◉` | `T T` | `ò ó` | `- -` |
| `ring` | weird | `◔ ◔` | `◠ ◠` | `◉ ◉` | `╥ ╥` | `҂ ҂` | `ᴗ ᴗ` |

Most eyes blink as `- -`; newly added styles may use their own blink glyphs.

## Mouths (15)

Each mouth defines glyphs for `calm / smile / big / open / sad / flat / unsure / angry / sleep`.

| id | vibes | calm | smile | big | open | sad | flat | unsure | angry | sleep |
|---|---|---|---|---|---|---|---|---|---|---|
| `w` | cute, weird | `ω` | `‿` | `▽` | `o` | `︿` | `_` | `~` | `Д` | `ω` |
| `three` | cute, weird | `3` | `ᴗ` | `▽` | `o` | `︿` | `_` | `~` | `Д` | `3` |
| `bear` | cute | `ᴥ` | `ᴥ` | `▽` | `o` | `﹏` | `ᴥ` | `~` | `ᴥ` | `ᴥ` |
| `plain` | cool, weird, cute | `_` | `‿` | `▽` | `o` | `︿` | `_` | `~` | `_` | `_` |
| `dead` | cool, weird | `‸` | `‿` | `◡` | `ロ` | `﹏` | `‸` | `~` | `皿` | `‸` |

## Vibes

`vibe` is `"any" | "cute" | "cool" | "weird"`. It only filters which ids a roll
may pick — `createCharacter` and `editor.setParts` accept any valid id regardless
of vibe. Pool sizes: 27 bodies, 16 eyes, 15 mouths → 6,480 part combinations × 10 states
= 58,320 animations covered by tests.

## Added part IDs (v0.3.0)

The original parts above remain available. New bodies:
`square`, `double`, `flower`, `spark`, `cat`, `bunny`, `ghost`,
`tentacle`, `robot`, `shield`, `arms`, `dancer`, `alien`,
`diamond`, `frame`, `bat`.

New eyes: `sparkle`, `star`, `wink`, `sleepy`, `pixel`, `cross`,
`teary`, `triangle`, `shy`, `cat`.

New mouths: `smirk`, `grin`, `tiny`, `cat`, `fang`, `pixel`,
`oval`, `tongue`, `heart`, `scream`.

The full glyph and vibe definitions are maintained in `src/parts.ts`.
Use `faceroll parts`, `partPool(kind, vibe)`, or the exported `BODIES`,
`EYES`, and `MOUTHS` arrays to inspect the complete catalog.

See the new `src/presets.ts` catalog and `FACE_PRESETS` export for 24
curated combinations. `getFacePreset(id)` validates a preset ID and
`createPresetCharacter(id)` returns a complete animated character.
