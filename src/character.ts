import { buildAnimations, type Animation } from "./build";
import { BODIES, EYES, MOUTHS, PART_KINDS, getBody, getEyes, getMouth, partPool, type Parts, type PartKind } from "./parts";
import { pick, randomSeed, seededRng, type Rng } from "./rng";
import type { StateName } from "./states";
import type { Vibe } from "./types";

/** A complete agent face: its parts and one animation per state. */
export interface Character {
  readonly name: string;
  /** The seed that produced this character, if it was rolled with one. */
  readonly seed?: string;
  readonly parts: Readonly<Parts>;
  readonly animations: Readonly<Record<StateName, Animation>>;
}

export interface CreateOptions {
  name?: string;
  seed?: string;
}

export interface RollOptions {
  /** Same seed and options always give the same character. Random if omitted. */
  seed?: string | number;
  /** Use your own random source instead of a seed. */
  rng?: Rng;
  vibe?: Vibe;
  /** Parts to keep fixed. Everything else is rolled. */
  lock?: Partial<Parts>;
  name?: string;
}

export interface RerollOptions {
  seed?: string | number;
  rng?: Rng;
  vibe?: Vibe;
}

const DEFAULT_NAME = "Agent";

/**
 * Build a character from exact parts. Throws `RangeError` on an unknown id.
 * A body with a required mouth (the bear) uses its mouth for rendering,
 * but the supplied mouth preference stays in `character.parts.mouth`.
 */
export function createCharacter(parts: Parts, options: CreateOptions = {}): Character {
  getBody(parts.body);
  getEyes(parts.eyes);
  getMouth(parts.mouth);
  // Store the preferred mouth even when the current body renders a fixed mouth.
  // Switching away from a bear restores the original selection.
  const normalized: Parts = { ...parts };
  const character: Character = {
    name: options.name?.trim() || DEFAULT_NAME,
    ...(options.seed !== undefined ? { seed: options.seed } : {}),
    parts: Object.freeze(normalized),
    animations: Object.freeze(buildAnimations(normalized)),
  };
  return Object.freeze(character);
}

/** Roll a random character. Locked parts stay fixed. */
export function rollCharacter(options: RollOptions = {}): Character {
  const vibe = options.vibe ?? "any";
  const lock = options.lock ?? {};
  const seed = options.rng ? undefined : String(options.seed ?? randomSeed());
  const rng = options.rng ?? seededRng(seed as string);

  const parts: Parts = {
    body: lock.body ?? pick(partPool("body", vibe), rng),
    eyes: lock.eyes ?? pick(partPool("eyes", vibe), rng),
    mouth: lock.mouth ?? pick(partPool("mouth", vibe), rng),
  };
  return createCharacter(parts, {
    ...(options.name !== undefined ? { name: options.name } : {}),
    ...(seed !== undefined ? { seed } : {}),
  });
}

/** Roll a new value for one part and keep the rest. Never repeats the current part when the vibe allows another. */
export function rerollPart(character: Character, kind: PartKind, options: RerollOptions = {}): Character {
  const vibe = options.vibe ?? "any";
  const seed = options.rng ? undefined : String(options.seed ?? randomSeed());
  const rng = options.rng ?? seededRng(seed as string);
  const pool = partPool(kind, vibe);
  const others = pool.filter((id) => id !== character.parts[kind]);
  const next = pick(others.length > 0 ? others : pool, rng);
  return createCharacter({ ...character.parts, [kind]: next } as Parts, {
    name: character.name,
    ...(seed !== undefined ? { seed } : {}),
  });
}

/** Every valid id for each part kind. */
export function listParts(): { [K in PartKind]: Parts[K][] } {
  return {
    body: BODIES.map((b) => b.id),
    eyes: EYES.map((e) => e.id),
    mouth: MOUTHS.map((m) => m.id),
  };
}

export { PART_KINDS };
