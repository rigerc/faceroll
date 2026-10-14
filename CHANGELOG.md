# Changelog

## Unreleased

- Assign a short, single-word name to every character by default, selected
  deterministically from a curated pool of 324 first names. The original 81 names
  are retained in order; the surname list is gone. Each name is shared by exactly
  20 of the 6,480 face configurations, so different faces may now share a name —
  previously generated automatic display names change, while their parts,
  animations and deterministic reproducibility do not.
- Add `npm run check:size` to report gzip sizes per entrypoint and fail when growth
  over `scripts/size-baseline.json` exceeds 2 KiB.
- Preserve automatic/custom naming mode in editor configs, JSON and MCP snapshots.
- Follow part changes and undo with automatic names; preserve custom and legacy names.
- Use automatic names in the playground, browser example, CLI and Web Component.


## Unreleased

- Added optional ESM React, Vue 3 and native Web Component adapters.
- Exposed dedicated package subpaths with TypeScript declarations and optional
  React/Vue peer dependencies.
- Added reduced-motion handling, stable SSR faces and animation cleanup to
  framework components.
- Added integration documentation and smoke tests for packaging and the native
  custom element.


## 0.3.0 — Expanded faces and curated presets

- Expanded the catalog from 11/6/5 to 27 bodies, 16 eyes and 15 mouths,
  enabling 6,480 part combinations with the existing nine animations.
- Added 24 immutable, named presets with lookup and character generation APIs,
  plus `Faceroll.applyPreset()` with undo and unchanged lock settings.
- Added `faceroll presets` and `--preset` for CLI discovery and selection.
- Added a responsive, filterable Face gallery to the browser example.
- Added tests for presets, the expanded animation matrix and CLI integration.
- Preserved existing part IDs, nine animation states and original frame timings.


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

