# Changelog

## 0.2.0 — Merged TypeScript library

- Added `createFaceroll()` / `Faceroll` stateful editor with persistent part locks,
  targeted rerolls, configurable bounded undo (default 30), configuration snapshots
  and repeatable sequences via `seed` or injectable `rng`.
- Retained the existing immutable `rollCharacter()`, `createCharacter()` and
  `rerollPart()` functions and ESM/CommonJS exports.
- Preserve `parts.mouth` as the selected mouth on bear bodies; bear continues to
  render its own required `ᴥ` mouth until the body changes.
- Deep-freeze all generated animation frames, frame arrays, animations and kits.
- Added `toNodeSource()` and CLI `--format node` for dependency-free Node output.
- Added `examples/browser.html`, with lock controls, per-part reroll, undo,
  export previews, `localStorage` configuration persistence and reduced-motion handling.
- Added Vitest coverage and offline Node smoke tests, including packaging checks
  for ESM, CJS, CLI and generated Node source.
- Included prebuilt ESM, CJS and declaration files in the distribution archive;
  added an offline TypeScript compiler fallback build.
- Verified animation parity for all 2,970 combinations against the previous build.

## 0.1.0 — Initial npm library

- Deterministic character generation, nine animations, ESM/CommonJS,
  terminal playback, CLI, prompt/Markdown/JSON exports and type definitions.
