# Development

## Commands

```sh
npm install
npm test          # vitest (test/faceroll.test.ts)
npm run typecheck # tsc --noEmit
npm run build     # tsup: ESM + CJS + .d.ts + CLI
npm run check:size      # scripts/check-size.mjs — gzip budget per entrypoint
npm run test:smoke       # node --test test/smoke.test.mjs (prebuilt dist)
npm run build:fallback   # scripts/build-fallback.mjs — tsc when tsup is unavailable
npm run playground      # build and serve the playground at http://127.0.0.1:4173
npm run build:playground # standalone static output in playground-dist/
npm run test:playground  # Node tests against the built playground
npm --prefix mcp ci     # install the optional Node 24+ MCP package
npm run build:mcp       # build the core library and template-based MCP server
npm run test:mcp        # MCP protocol, HTTP and stdio integration tests
npm run start:mcp       # serve MCP at http://127.0.0.1:3000/mcp
npm run inspect:mcp     # build and open MCP Inspector with a stdio server
npm run inspect:mcp:http # open Inspector against the running HTTP server
npm run inspect:mcp:cli # build and list tools with Inspector CLI
npm run inspect:mcp:http:cli # list tools on the running HTTP server
```

Vitest runs only `test/**/*.test.ts`. The `.mjs` smoke and playground suites
use Node's test runner via their separate commands and require built output.
The optional `mcp/` package has its own dependencies, lockfile, Vite build and
colocated Vitest tests. See its [server guide](../mcp/README.md).

In the playground, **Cycle moods** plays one complete animation loop per mood
and wraps through all nine moods at the selected speed. Pause also pauses cycling;
Play resumes from the current mood. Selecting a mood or an individual frame stops
cycling. Cycling starts only when explicitly enabled and stops when a reduced-motion
preference is enabled. Hidden pages suspend playback and cycling until visible again.

TypeScript 5.x is required (tsup's declaration bundler doesn't support TS 7 yet).

The playground's **Theme** selector defaults to **System** and follows changes to
`prefers-color-scheme`. **Light** and **Dark** override the system preference and
persist in localStorage separately from the character configuration. Theme setup
runs before styles load so saved preferences apply on the first paint. Restricted
storage still allows theme changes for the current page.

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
scripts/check-size.mjs    gzip budget per entrypoint
scripts/size-baseline.json  recorded gzip sizes to compare against
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

`npm run check:size` gzips each entrypoint at level 9 and compares it with
`scripts/size-baseline.json`, failing above 2 KiB of growth (1 KiB is flagged as
over the preferred budget). Run it after `npm run build` and re-record with
`node scripts/check-size.mjs --write` only when a growth is intended.

## Releases

Push a semantic version tag matching the root `package.json` version, such as
`v0.3.0`, to run `.github/workflows/release.yml`. Update `package.json` and
`package-lock.json` together and commit them before tagging:

```sh
npm version patch --no-git-tag-version
# Update CHANGELOG.md, then commit the version and changelog changes.
git tag -a "v$(node -p 'require("./package.json").version')" -m "Release"
git push origin main --follow-tags
```

The workflow validates the tag and lockfile, runs the same library, playground,
size, smoke and MCP checks as CI, then builds a GitHub Release with generated
notes. Assets include the `faceroll` and `faceroll-mcp` npm tarballs, the static
playground archive and `SHA256SUMS`. The MCP tarball uses its own package version;
update its manifest, lockfile and peer dependency when releasing MCP changes.
Tags with a prerelease suffix (for example `v0.4.0-beta.1`) create prereleases
and are not marked as latest. Builds use only the automatic `GITHUB_TOKEN`;
registry publishing remains a separate `npm publish` operation.

## Commit style

A commit-msg hook enforces conventional commits: `<type>[!][(scope)]: <subject>`
with types `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|release`.
Docs changes use `docs:`.
