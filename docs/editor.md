# Editor (`Faceroll` / `createFaceroll`)

Source: `src/editor.ts`. A stateful layer over the immutable `Character` model
for character-designer UIs. No DOM, storage, or timer dependencies.

```ts
import { createFaceroll } from "faceroll";

const editor = createFaceroll({ name: "Pixel", vibe: "cute", seed: "my-agent" });
editor.setLocked("eyes", true);
editor.roll();          // reroll body + mouth
editor.reroll("body");  // one part
editor.undo();          // revert
editor.export("json");  // "prompt" | "markdown" | "json" | "node"
```

## Options (`FacerollOptions`)

| Option | Default | Meaning |
|---|---|---|
| `name` | automatic | Custom character name; blank restores automatic naming |
| `nameMode` | inferred from `name` | `"auto"` follows parts; `"custom"` keeps a nonblank name. Pass saved mode when restoring. |
| `vibe` | `"any"` | Pool filter; validated, `RangeError` on unknown |
| `parts` | `{ body: "round", eyes: "dot", mouth: "w" }` | Starting selection |
| `locks` | all `false` | Per-part locks |
| `seed` | `Math.random` | Repeatable *sequence* of rolls (stateful RNG) |
| `rng` | — | Custom `() => number` in `[0,1)`; takes precedence over `seed` |
| `random` | — | Deprecated alias for `rng` |
| `historyLimit` | `30` | Snapshots retained for undo; `0` disables undo; must be a non-negative safe integer |

## Methods

| Method | Returns | Behavior |
|---|---|---|
| `roll()` | `boolean` | Reroll every unlocked part to a different value where possible. `false` when everything is locked. Commits atomically — a bad RNG value cannot corrupt state. |
| `reroll(kind)` | `boolean` | Reroll one part. Throws on unknown kind; `false` when that part is locked. |
| `undo()` | `boolean` | Pop the last snapshot. Locks and vibe are unchanged. `false` when history is empty. |
| `setParts(changes)` | `void` | Explicitly set ids — allowed even if locked or outside the vibe. Throws `RangeError` on unknown ids (via `createCharacter`). Bear mouth-preservation applies. |
| `setLocked(kind, locked)` / `isLocked(kind)` | `void` / `boolean` | Per-part locks; unknown kinds throw. |
| `setName(name)` | `void` | Set a custom name; clear to use the automatic name for current parts. |
| `setVibe(vibe, reroll = true)` | `boolean` | Change vibe; by default rerolls unlocked parts (returns its result). Pass `false` to keep parts. |
| `getParts()` / `getLocks()` | copies | Current selection / locks (safe to mutate the result). |
| `getConfig()` | `FacerollConfig` | Plain `{ name, nameMode, vibe, parts, locks }` — save to `localStorage`, restore via the constructor. |
| `getCharacter()` | `Character` | Immutable snapshot for the other APIs. |
| `getAnimations()` / `getAnimation(state)` | animations | Direct access to the snapshot's animations. |
| `getStill(state)` | `string` | Static face. |
| `getFrameAt(state, elapsedMs)` | `string` | Frame text at a timestamp (via `frameAt`). |
| `export(format = "prompt")` | `string` | `"prompt"` → `toSystemPrompt`, `"markdown"` → `toMarkdown`, `"json"` → pretty `serialize`, `"node"` → `toNodeSource`. Unknown formats throw. |
| `historyLength` | `number` | Getter for the undo depth. |

## Notes

- A custom `rng` must return a finite number in `[0, 1)`; anything else throws `RangeError`.
- `commit` pushes the *previous* parts onto a bounded stack (drops the oldest past the limit). `undo` restores parts and their automatic name without changing locks, vibe, or a custom name.
- The bundled `examples/browser.html` wires all of this to a UI: state/vibe selectors, roll, undo, per-part reroll, locks, animated preview, export chooser, `localStorage` persistence, reduced-motion support.


## Personality in the playground

`editor.getCharacter().personality` exposes three immutable traits derived from
current parts. Rolls, presets, explicit edits, and undo recalculate them;
renaming and expression changes preserve them. `getConfig()` stores the parts
needed to restore traits, so existing saved configs need no migration.

The playground displays trait badges below the character name. Expand **About
these traits** for descriptions using the mouse or keyboard. Preset and thread
family previews show trait summaries, and family JSON includes each personality.
