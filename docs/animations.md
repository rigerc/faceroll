# Animations

Built by `buildAnimations(parts)` in `src/build.ts`. Every frame keeps the same
body — glances move the face core with a leading/trailing space, tails are
appended — so the body never shifts. `still` is the static face for prompts,
logs, and markdown.

Notation below: `E/M` = eye/mouth expression, `look` = `c|l|r`, `tail` appended,
`ms` per frame. Durations are per-loop totals.

## idle — 7,880 ms

Blinks, then glances left and right. Still: `open/calm`.

| E | M | look | tail | ms |
|---|---|---|---|---|
| open | calm | c | | 2400 |
| blink | calm | c | | 110 |
| open | calm | c | | 1500 |
| open | calm | l | | 650 |
| open | calm | r | | 650 |
| open | calm | c | | 1300 |
| blink | calm | c | | 110 |
| open | calm | c | | 150 |
| blink | calm | c | | 110 |

## working — 900 ms

Eyes scan (`c l l c r r`) while a `...` tail cycles. Still: face + ` ...`.

| look | tail | ms |
|---|---|---|
| c | ` .   ` | 150 |
| l | ` ..  ` | 150 |
| l | ` ... ` | 150 |
| c | `  .. ` | 150 |
| r | `   . ` | 150 |
| r | `     ` | 150 |

Eyes `open`, mouth `flat` throughout.

## waiting — 2,910 ms

Dots grow, then a blink. Still: face + ` ...`.

| E | tail | ms |
|---|---|---|
| open | | 700 |
| open | ` .` | 450 |
| open | ` ..` | 450 |
| open | ` ...` | 700 |
| blink | ` ...` | 110 |
| open | ` ...` | 500 |

Mouth `calm` throughout.

## questioning — 2,710 ms

Unsure mouth, glances, `?` tail. Still: face + ` ?`.

| E | look | tail | ms |
|---|---|---|---|
| open | c | | 500 |
| open | l | ` ?` | 500 |
| open | r | ` ?` | 500 |
| open | c | ` ??` | 600 |
| blink | c | ` ?` | 110 |
| open | c | ` ?` | 500 |

## happy — 1,300 ms

Dances side to side with music notes. Still: `happy/big` + ` ♪`.

| look | tail | ms |
|---|---|---|
| c | | 350 |
| l | ` ♪` | 300 |
| c | | 350 |
| r | ` ♫` | 300 |

## sad — 3,040 ms

Droops, blinks, trails off with `…`. Still: `sad/sad`.

| E | look | tail | ms |
|---|---|---|---|
| sad | c | | 900 |
| blink | c | | 140 |
| sad | c | | 600 |
| sad | l | ` …` | 700 |
| sad | c | | 700 |

## surprised — 2,040 ms

Double-take, then holds `!!`. Still: `wide/open` + `!!`.

| E | M | look | tail | ms |
|---|---|---|---|---|
| open | calm | c | | 500 |
| wide | open | l | `!` | 110 |
| wide | open | r | `!` | 110 |
| wide | open | l | `!!` | 110 |
| wide | open | r | `!!` | 110 |
| wide | open | c | `!!` | 1100 |

## angry — 1,840 ms

Shakes (`l r l r`), then ` #`, ` ##`. Still: `angry/angry` + ` #`.

| look | tail | ms |
|---|---|---|
| c | | 500 |
| l | | 80 |
| r | | 80 |
| l | | 80 |
| r | | 80 |
| c | ` #` | 500 |
| c | ` ##` | 500 |

## sleepy — 2,900 ms

`z` tail grows. Still: `sleep/sleep` + ` zzZ`.

| tail | ms |
|---|---|
| | 900 |
| ` z` | 600 |
| ` zz` | 600 |
| ` zzZ` | 800 |

## Layout

Each `Animation` carries `width` (widest frame in terminal columns via
`cellWidth`). In a browser, reserve it to stop jitter:

```ts
el.style.width = `${animation.width}ch`;
el.style.whiteSpace = "pre";
```

Use `still` anywhere that cannot animate (logs, markdown, chat). Respect
`prefers-reduced-motion` by showing `still` instead of playing.
