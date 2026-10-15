# API reference

Source of truth: `src/index.ts` re-exports everything below. All generated
data is deeply frozen (`Object.freeze` on characters, animations, frames).

## Characters (`src/character.ts`)

```ts
import { rollCharacter, createCharacter, rerollPart, listParts } from "faceroll";
```

| Function | Signature | Behavior |
|---|---|---|
| `rollCharacter` | `(options?: RollOptions) => Character` | Random roll. `seed` (string\|number) reproduces the character; omit for a random 6-char base-36 seed stored on the result. `rng` replaces the seed (then no `seed` is recorded). `vibe` filters the pools (`"any"` default). `lock` keeps named parts fixed. `name` defaults to the unique automatic name for the selected parts; a nonblank custom name overrides it. |
| `createCharacter` | `(parts: Parts, options?: CreateOptions) => Character` | Build from exact ids. Throws `RangeError` on unknown body/eyes/mouth. Bear bodies render the fixed `ᴥ` mouth but keep your `parts.mouth` preference, restored when the body changes. |
| `rerollPart` | `(character: Character, kind: PartKind, options?: RerollOptions) => Character` | New value for one part, never repeating the current one when the pool has an alternative. Returns a new `Character` (new random seed unless `seed`/`rng` given). |
| `listParts` | `() => { body: BodyId[]; eyes: EyesId[]; mouth: MouthId[] }` | Every valid id per kind. |

```ts
interface Character {
  readonly name: string;
  readonly personality: Personality; // readonly tuple of three traits
  readonly nameMode?: "auto" | "custom";
  readonly seed?: string;
  readonly parts: Readonly<Parts>;          // { body, eyes, mouth }
  readonly animations: Readonly<Record<StateName, Animation>>;
}
interface RollOptions {
  seed?: string | number; rng?: Rng; vibe?: Vibe;
  lock?: Partial<Parts>; name?: string; nameMode?: "auto" | "custom";
}
interface CreateOptions { name?: string; nameMode?: "auto" | "custom"; seed?: string; }
interface RerollOptions { seed?: string | number; rng?: Rng; vibe?: Vibe; }
```

## Personality (`src/personality.ts`)

```ts
import { PERSONALITY_TRAITS, personalityForParts } from "faceroll";
import type { Personality, PersonalityTrait, PersonalityTraitId } from "faceroll";

const traits = personalityForParts({ body: "round", eyes: "dot", mouth: "w" });
// Resourceful, Steady, Candid
```

Every generated character has `personality: readonly [PersonalityTrait,
PersonalityTrait, PersonalityTrait]`. Each trait has a stable `id`, a readable
`label`, and a short `description` for communication guidance.
`PERSONALITY_TRAITS` exposes the frozen catalog of 18 traits.

Assignment picks one trait each for approach, temperament, and communication
style. All three are distinct and compatible. The versioned v1 calculation uses
only the exact body/eyes/mouth IDs (including the bear's stored mouth preference),
never the name, seed, vibe, or current expression. It does not consume the face
roll's RNG. Different faces may share a profile; changing parts recalculates
traits but can produce the same profile. Catalog ordering and v1 assignment are
persistent identity rules.

Rolls, presets, rerolls, editor changes, undo, and derived children all use this
assignment. Children receive their own parts' traits rather than inheriting the
parent's. JSON includes the full trait objects; Markdown, system prompts, and
standalone Node.js exports include descriptions. Prompts use traits as
communication guidance while respecting the task and user instructions.
`deserialize` regenerates traits from parts, including legacy snapshots without
personality; supplied personality data does not override automatic assignment.
Custom traits and independent personality rerolls are not supported.

## Project/thread families (`src/children.ts`)

```ts
import { childCapacity, deriveChildCharacter, deriveChildCharacters } from "faceroll";

const parent = rollCharacter({ seed: "project-42" });
const children = deriveChildCharacters(parent, { count: 5, seed: "family-A" });
const sameThread = deriveChildCharacter(parent, { index: 2, seed: "family-A" });
```

- `deriveChildCharacter(parent, { index, seed?, name? }): Character` — one zero-based stable thread slot; optional custom name.
- `deriveChildCharacters(parent, { count, seed? }): Character[]` — distinct children in slot order.
- `childCapacity(parent): number` — capacity of the fixed parent body.

Child faces preserve the parent body and prioritize one-part differences in
eyes/mouth before changing both. Seed affects the deterministic sibling order;
omitting it is also deterministic. The parent is immutable and its saved parts
suffice to recreate the family (even if the parent name changes). Persist each
thread’s slot and the family seed in your application. Requests for negative,
non-integer or out-of-range slots/counts throw `RangeError`.

Uniqueness is defined by the rendered idle face, not just part IDs. Current
capacity: 15 bear children (bear mouths are visually fixed), 239 otherwise.
Child results have automatic names and full ten-state animations; they do not
set `Character.seed`, since they are derived rather than individually rolled.

## Parts (`src/parts.ts`)

```ts
import { BODIES, EYES, MOUTHS, PART_KINDS, partPool } from "faceroll";
```

- `BODIES: readonly BodyDef<BodyId, MouthId>[]` — 11 bodies. Each has `id`, `left`, `right`, `vibes`; `bear` additionally sets `mouth: "bear"`.
- `EYES: readonly EyeDef<EyesId>[]` — 6 eyes. Each maps the 7 `EyeExpression`s (`open`, `blink`, `happy`, `wide`, `sad`, `angry`, `sleep`) to a left/right glyph `Pair`.
- `MOUTHS: readonly MouthDef<MouthId>[]` — 5 mouths. Each maps the 9 `MouthExpression`s (`calm`, `smile`, `big`, `open`, `sad`, `flat`, `unsure`, `angry`, `sleep`) to one glyph.
- `PART_KINDS = ["body", "eyes", "mouth"]`.
- `partPool(kind, vibe = "any"): Parts[K][]` — ids of one kind filtered by vibe. See [parts catalog](parts.md).

## States (`src/states.ts`)

```ts
import { STATES, STATE_NAMES, getState } from "faceroll";
```

- `STATES` — 10 entries, each `{ id, label, kind, use, say }`. Kind is `"state"` (idle, working, waiting, questioning) or `"emotion"` (happy, sad, surprised, angry, sleepy, dead).
- `STATE_NAMES: readonly StateName[]`.
- `getState(name)` — returns the `StateInfo`, throws `RangeError` on unknown names. `StateName` is the union of the ten ids.

## Animations (`src/build.ts`)

```ts
import { buildAnimations } from "faceroll"; // usually via Character.animations
```

```ts
interface Animation {
  readonly name: StateName;
  readonly still: string;            // static face for prompts/docs/logs
  readonly frames: readonly Frame[]; // Frame = { text: string; ms: number }
  readonly duration: number;         // one loop in ms
  readonly width: number;            // widest frame in terminal columns
}
```

`buildAnimations(parts)` builds all ten animations for one part set. Bodies never move: glances shift the core with a space, tails (`...`, `?`, `!`, `♪`, `zzZ`) are appended. See [animations](animations.md) for the frame tables.

## Playback (`src/player.ts`)

```ts
import { createPlayer, frameAt, frameIndexAt } from "faceroll";
```

- `frameIndexAt(animation, elapsedMs)` — index of the frame showing at `elapsedMs` into the loop (negative values wrap).
- `frameAt(animation, elapsedMs)` — the `Frame` itself.
- `createPlayer(onFrame, options?: PlayerOptions): Player` — timer loop. `onFrame(frame, index, animation)` fires immediately with frame 0 on `play()`, then follows each frame's `ms`. `play(animation)` restarts from frame 0; `stop()` halts; `playing` / `current` are getters. Pass `setTimeout`/`clearTimeout` in options to inject fake timers.

## Terminal (`faceroll/terminal`, `src/terminal.ts`)

```ts
import { playInTerminal, createTerminalPlayer } from "faceroll/terminal";
```

- `createTerminalPlayer(options?: TerminalOptions): TerminalPlayer` — `{ play(animation), stop({ clear }?) }`. Options: `stream` (default `process.stdout`), `prefix`, `suffix`, `hideCursor` (default true), plus timer overrides. Redraws one line via `\r\x1b[K`; hides the cursor while running. On non-TTY streams, `play` prints the still once and `stop` is a no-op.
- `playInTerminal(animation, options?)` — one-shot helper returning a stop function.
- `TerminalStream` requires only `write(chunk)` and optional `isTTY`, so tests can pass a fake.

## Export (`src/export.ts`)

```ts
import { toSystemPrompt, toMarkdown, serialize, deserialize, toNodeSource } from "faceroll";
```

| Function | Output |
|---|---|
| `toSystemPrompt(character, { states }?)` | Prompt text: name, States/Emotions sections (`- Label (use): face`), one-face-per-message rule, never-in-code rule. |
| `toMarkdown(character)` | `### Name` + table of State \| Face \| Use when. |
| `serialize(character)` | Plain JSON-safe data: `{ name, nameMode?, seed?, parts, animations }`; frames as `[text, ms]` pairs. |
| `deserialize(data)` | Rebuilds via `createCharacter` (animations regenerated from parts; needs `name` + `parts`, optional `seed` and `nameMode`). |
| `toNodeSource(character)` | Standalone dependency-free Node source defining `play(state, stream?)` over the ten animations. |

## Utilities

- `hashSeed(seed: string | number): number` — FNV-1a for strings, `>>> 0` for numbers (`src/rng.ts`).
- `seededRng(seed): Rng` — mulberry32 generator.
- `cellWidth(text: string): number` — terminal columns; East Asian wide/fullwidth = 2, combining marks = 0, everything else = 1 (`src/width.ts`). Estimate only; fonts decide real width.
- Types from `./types`: `Vibe` (`"any" | "cute" | "cool" | "weird"`), `VibeTag`, `Look` (`"c" | "l" | "r"`), `Pair`, `EyeExpression`, `MouthExpression`, `BodyDef`, `EyeDef`, `MouthDef`, `Frame`, `StateInfo`.


## Automatic identity

`nameForParts(parts)` returns a stable, single-word first name drawn from a curated
pool of 324 names. It uses no randomness. Every one of the 6,480 supported part
configurations receives a name, and each name is used by exactly 20 configurations,
so different faces may share a name: identity comes from the parts, not the name.
Automatic names follow part rerolls; custom names remain fixed and may contain
spaces. `nameMode: "auto"` restores automatic naming even if a saved name is
supplied. A blank name also selects automatic naming. Legacy snapshots with a
nonblank name and no mode are treated as custom.
