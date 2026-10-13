# CLI

Binary: `faceroll` → `./dist/cli.js`. Requires a build first (`npm run build`).

```
faceroll roll [options]            Print a rolled character
faceroll play <state> [options]    Animate one state in the terminal
faceroll states                    List the states and emotions
faceroll parts                     List body, eyes and mouth ids
```

## Flags

| Flag | Commands | Default | Meaning |
|---|---|---|---|
| `--seed <text>` | roll, play | random | Same seed → same character |
| `--vibe <any\|cute\|cool\|weird>` | roll, play | `any` | Restrict the part pools |
| `--name <text>` | roll, play | `Agent` | Character name |
| `--body <id>` | roll, play | — | Lock body (see `parts`) |
| `--eyes <id>` | roll, play | — | Lock eyes |
| `--mouth <id>` | roll, play | — | Lock mouth |
| `--format <text\|prompt\|markdown\|json\|node>` | roll | `text` | Output format |
| `--duration <ms>` | play | `4000` | How long to animate |
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
