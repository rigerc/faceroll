# CLI

Binary: `faceroll` → `./dist/cli.js`. Requires a build first (`npm run build`).

```
faceroll roll [options]            Print a rolled character
faceroll play <state> [options]    Animate one state in the terminal
faceroll children [options]        Derive project thread faces
faceroll states                    List the states and emotions
faceroll parts                     List body, eyes and mouth ids
```

## Flags

| Flag | Commands | Default | Meaning |
|---|---|---|---|
| `--seed <text>` | roll, play | random | Same seed → same character |
| `--vibe <any\|cute\|cool\|weird>` | roll, play | `any` | Restrict the part pools |
| `--name <text>` | roll, play | automatic | Custom character name |
| `--body <id>` | roll, play | — | Lock body (see `parts`) |
| `--eyes <id>` | roll, play | — | Lock eyes |
| `--mouth <id>` | roll, play | — | Lock mouth |
| `--format <text\|prompt\|markdown\|json\|node>` | roll | `text` | Output format |
| `--duration <ms>` | play | `4000` | How long to animate |
| `--count <n>` | children | `5` | Generate the first n stable thread slots |
| `--index <n>` | children | — | Generate exactly one zero-based slot (exclusive with --count) |
| `--format <text\|json>` | children | `text` | Human-readable or full JSON snapshot output |
| `-h, --help` | — | — | Print help |

Unknown vibes, formats, states, part ids, negative durations, and missing
`--flag` values exit with code 2 and the help text. `RangeError`s from bad part
ids are converted to usage errors.

## Examples

```sh
npx faceroll roll --vibe cute --name Pixel
npx faceroll roll --seed pixel --format prompt     # prompt | markdown | json | node | text
npx faceroll play working --seed pixel --duration 3000
npx faceroll states
npx faceroll parts
```

## Formats (`roll --format`)

- `text` — `Name (seed …, body / eyes / mouth)` plus one `Label  still` row per state.
- `prompt` — `toSystemPrompt` output.
- `markdown` — `toMarkdown` output.
- `json` — `serialize` output, pretty-printed.
- `node` — `toNodeSource` output (standalone dependency-free player).

## `play`

Rolls a character from the same `--seed/--vibe/--name/--body/--eyes/--mouth`
flags, then animates `<state>` (one of the nine in `faceroll states`) with the
suffix `  <Name> is <label>`. Uses `createTerminalPlayer`, so non-TTY output
prints the still once instead of animating.

## Presets (v0.3.0)

```sh
faceroll presets                              # list all 24 named faces
faceroll roll --preset kitty                  # choose exactly one preset
faceroll roll --preset bunny --body round     # override a single part
faceroll roll --preset hacker --format json   # export a fixed preset
```

A preset selects fixed parts. Explicit `--body`, `--eyes`, and `--mouth`
flags take precedence. Without a preset, rolls continue to obey seed, vibe,
and locked part options.


Omit `--name` for a stable, unique human name per part configuration. Use
`--name Pixel` to override it; a blank name uses automatic naming.

## Project/thread family (`children`)

```sh
faceroll children --preset kitty --count 5 --seed my-project
faceroll children --preset kitty --index 2 --seed my-project --format json
```

Parent selection uses the regular `--preset`, `--body`, `--eyes`,
`--mouth`, `--name`, `--vibe` and `--seed` flags. With a preset, the seed
controls only the order of child variants. Without a preset it also selects
parent parts. Each child keeps the parent body while varying eyes and/or mouth.
Slots are reproducible for fixed parent parts and family seed; assign a slot
when a new thread is created and store it with the thread. The plain-text
format shows the parent and numbered children. JSON contains the parent snapshot
and an array of `{ index, character }` entries. The command rejects invalid or
out-of-capacity requests instead of returning duplicate faces.
