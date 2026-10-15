import { buildAnimations, type Animation } from "./build";
import { BODIES, EYES, MOUTHS, PART_KINDS, getBody, getEyes, getMouth, partPool, type Parts, type PartKind } from "./parts";
import { pick, randomSeed, seededRng, type Rng } from "./rng";
import type { StateName } from "./states";
import { nameForParts, type NameMode } from "./names";
import { personalityForParts, type Personality } from "./personality";
import type { Vibe } from "./types";

/** A complete agent face: its parts and one animation per state. */
export interface Character {
  readonly name: string;
  /** Stable traits shared by every expression of this face. */
  readonly personality: Personality;
  /** Omitted on legacy snapshots, whose names are treated as custom. */
  readonly nameMode?: NameMode;
  /** The seed that produced this character, if it was rolled with one. */
  readonly seed?: string;
  readonly parts: Readonly<Parts>;
  readonly animations: Readonly<Record<StateName, Animation>>;
}

export interface CreateOptions {
  name?: string;
  nameMode?: NameMode;
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
  nameMode?: NameMode;
}

export interface RerollOptions {
  seed?: string | number;
  rng?: Rng;
  vibe?: Vibe;
}

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
  const customName = options.name?.trim();
  const nameMode = options.nameMode === "auto" || !customName ? "auto" : "custom";
  const character: Character = {
    name: nameMode === "auto" ? nameForParts(normalized) : customName as string,
    nameMode,
    personality: personalityForParts(normalized),
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
    ...(options.nameMode !== undefined ? { nameMode: options.nameMode } : {}),
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
    nameMode: character.nameMode ?? "custom",
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

