# Development

## Commands

```sh
npm install
npm test          # vitest (test/faceroll.test.ts)
npm run typecheck # tsc --noEmit
npm run build     # tsup: ESM + CJS + .d.ts + CLI
npm run test:smoke       # node --test test/smoke.test.mjs (prebuilt dist)
npm run build:fallback   # scripts/build-fallback.mjs — tsc when tsup is unavailable
npm run playground      # build and serve the playground at http://127.0.0.1:4173
npm run build:playground # standalone static output in playground-dist/
npm run test:playground  # Node tests against the built playground
```

Vitest runs only `test/**/*.test.ts`. The `.mjs` smoke and playground suites
use Node's test runner via their separate commands and require built output.

In the playground, **Cycle moods** plays one complete animation loop per mood
and wraps through all nine moods at the selected speed. Pause also pauses cycling;
Play resumes from the current mood. Selecting a mood or an individual frame stops
cycling. Cycling starts only when explicitly enabled and stops when a reduced-motion
preference is enabled. Hidden pages suspend playback and cycling until visible again.

TypeScript 5.x is required (tsup's declaration bundler doesn't support TS 7 yet).

## Layout

```
src/
  index.ts      public exports
  types.ts      Vibe, Look, Pair, expressions, BodyDef/EyeDef/MouthDef, Frame, StateInfo
  parts.ts      11 bodies / 6 eyes / 5 mouths + partPool + getters
  states.ts     9 STATES + STATE_NAMES + getState
  build.ts      buildAnimations — the nine frame tables
  character.ts  Character, rollCharacter, createCharacter, rerollPart, listParts
  player.ts     createPlayer, frameAt, frameIndexAt
  terminal.ts   createTerminalPlayer, playInTerminal (faceroll/terminal)
  export.ts     toSystemPrompt, toMarkdown, serialize, deserialize, toNodeSource
  editor.ts     Faceroll, createFaceroll (stateful designer)
  rng.ts        hashSeed (FNV-1a), seededRng (mulberry32), randomSeed, pick
  width.ts      cellWidth (wide = 2, combining = 0, else 1)
  cli.ts        faceroll binary (roll / play / states / parts)
test/
  faceroll.test.ts   38 vitest tests
  smoke.test.mjs     6 node --test checks against prebuilt dist
examples/browser.html  designer demo (imports ../dist/index.js)
playground/             framework-free frontend (imports its packaged lib/index.js)
scripts/build-playground.mjs  copies frontend and library into playground-dist/
scripts/serve-playground.mjs  local static server for playground-dist/
scripts/build-fallback.mjs
```

## Tests

`test/faceroll.test.ts` (38 tests) covers: all 2,970 part×state combinations
(complete animations, stable durations), ESM/CJS export parity, frozen frames,
seeded reproducibility, locks/undo/mouth preference, `toNodeSource`
executability, CLI formats, and the browser example importing the shipped ESM
build. `test/smoke.test.mjs` repeats 6 of these against `dist/` with plain
`node --test` (offline packaging check).

## Builds

`tsup.config.ts` emits ESM (`dist/*.js`), CJS (`dist/cjs/*.js` + shims
`dist/index.cjs`, `dist/terminal.cjs`), and `.d.ts` files; `dist/cli.js` is the
executable. Package exports map `faceroll` → ESM/CJS and `faceroll/terminal` →
terminal entry. `files` ships `dist`, `examples`, `README.md`, `LICENSE`.

## Commit style

A commit-msg hook enforces conventional commits: `<type>[!][(scope)]: <subject>`
with types `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|release`.
Docs changes use `docs:`.
