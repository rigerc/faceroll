# Parts catalog

Defined in `src/parts.ts`. `partPool(kind, vibe)` filters these tables.

## Bodies (11)

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

## Eyes (6)

Each eye defines glyph pairs for `open / blink / happy / wide / sad / angry / sleep`.

| id | vibes | open | happy | wide | sad | angry | sleep |
|---|---|---|---|---|---|---|---|
| `dot` | cute, cool | `• •` | `^ ^` | `⊙ ⊙` | `╥ ╥` | `ò ó` | `˘ ˘` |
| `round` | cute, weird | `◕ ◕` | `◠ ◠` | `◉ ◉` | `ಥ ಥ` | `ಠ ಠ` | `ᴗ ᴗ` |
| `tiny` | cute, cool | `· ·` | `^ ^` | `° °` | `; ;` | `` ´ `` | `- -` |
| `smug` | cool | `¬ ¬` | `≧ ≦` | `⊙ ⊙` | `´ ｀` | `≖ ≖` | `- -` |
| `box` | cool, weird | `■ ■` | `^ ^` | `◉ ◉` | `T T` | `ò ó` | `- -` |
| `ring` | weird | `◔ ◔` | `◠ ◠` | `◉ ◉` | `╥ ╥` | `҂ ҂` | `ᴗ ᴗ` |

All eyes blink as `- -`.

## Mouths (5)

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
of vibe. Pool sizes: 11 bodies, 6 eyes, 5 mouths → 330 part combinations × 9 states
= 2,970 animations covered by tests.
