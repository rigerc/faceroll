# Development

## Commands

```sh
npm install
npm test          # vitest (test/faceroll.test.ts)
npm run typecheck # tsc --noEmit
npm run build     # tsup: ESM + CJS + .d.ts + CLI
npm run test:smoke       # node --test test/smoke.test.mjs (prebuilt dist)
npm run build:fallback   # scripts/build-fallback.mjs — tsc when tsup is unavailable
```

Note: `npm test` also picks up `test/smoke.test.mjs`, which has no vitest suite
and reports as a failed file under vitest — that file is meant for
`npm run test:smoke`. The 38 vitest tests themselves pass.

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
