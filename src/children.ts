import { createCharacter, type Character } from "./character";
import { EYES, MOUTHS, type Parts } from "./parts";
import { seededRng } from "./rng";

/** An optional family seed changes the order of variations, not the parent. */
export interface ChildOptions {
  seed?: string | number;
}

export interface ChildCharacterOptions extends ChildOptions {
  /** Zero-based slot allocated to a thread. Store this slot for stable identity. */
  index: number;
  /** Optional custom name; by default the child receives its own automatic name. */
  name?: string;
}

export interface ChildCharactersOptions extends ChildOptions {
  /** Number of children, starting at slot zero. */
  count: number;
}

/**
 * Shuffle only within a similarity tier. A seed and parent always produce the
 * same ordering, independent of how many children have already been requested.
 */
function shuffle<T>(values: T[], seed: string): T[] {
  const rng = seededRng(seed);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j] as T, values[i] as T];
  }
  return values;
}

function childParts(parent: Character, seed: string | number | undefined): Parts[] {
  const parts = parent.parts;
  // Validate the input through the existing part definitions (including JS callers).
  const parentStill = createCharacter({ ...parts }).animations.idle.still;
  const oneChange: Parts[] = [];
  const twoChanges: Parts[] = [];

  for (const eyes of EYES) {
    if (eyes.id !== parts.eyes) oneChange.push({ ...parts, eyes: eyes.id });
  }
  for (const mouth of MOUTHS) {
    if (mouth.id !== parts.mouth) oneChange.push({ ...parts, mouth: mouth.id });
  }
  for (const eyes of EYES) {
    if (eyes.id === parts.eyes) continue;
    for (const mouth of MOUTHS) {
      if (mouth.id !== parts.mouth) twoChanges.push({ ...parts, eyes: eyes.id, mouth: mouth.id });
    }
  }

  // The family key depends on the visual parent's *selected* parts, not its
  // name, generated seed, or current emotion. Recreating the parent from saved
  // parts therefore recreates the children even after a process restart.
  const key = JSON.stringify([parts.body, parts.eyes, parts.mouth, seed ?? "default"]);
  shuffle(oneChange, `faceroll-child-v1:single:${key}`);
  shuffle(twoChanges, `faceroll-child-v1:double:${key}`);

  const seen = new Set([parentStill]);
  const result: Parts[] = [];
  for (const candidate of [...oneChange, ...twoChanges]) {
    // A bear body's displayed mouth is fixed, so different stored mouths can
    // render identically. Deduplicate by the actual idle face, not part IDs.
    const still = createCharacter(candidate).animations.idle.still;
    if (seen.has(still)) continue;
    seen.add(still);
    result.push(candidate);
  }
  return result;
}

/** Maximum visibly distinct children while keeping this parent's body. */
export function childCapacity(parent: Character): number {
  return childParts(parent, undefined).length;
}

/**
 * Derive a stable, recognizable thread face from its project parent.
 * A slot is deterministic and never depends on the number/order of threads.
 * Children inherit the body, but have their own eyes and/or mouth and all
 * nine normal animations. The parent is never mutated.
 */
export function deriveChildCharacter(parent: Character, options: ChildCharacterOptions): Character {
  if (!Number.isSafeInteger(options.index) || options.index < 0) {
    throw new RangeError("index must be a non-negative safe integer");
  }
  const candidates = childParts(parent, options.seed);
  const parts = candidates[options.index];
  if (!parts) throw new RangeError(`index exceeds child capacity (${candidates.length})`);
  return createCharacter(parts, options.name === undefined ? {} : { name: options.name });
}

/** Derive the first `count` stable thread faces (slots 0 through count - 1). */
export function deriveChildCharacters(parent: Character, options: ChildCharactersOptions): Character[] {
  if (!Number.isSafeInteger(options.count) || options.count < 0) {
    throw new RangeError("count must be a non-negative safe integer");
  }
  const candidates = childParts(parent, options.seed);
  if (options.count > candidates.length) {
    throw new RangeError(`count exceeds child capacity (${candidates.length})`);
  }
  return candidates.slice(0, options.count).map((parts) => createCharacter(parts));
}
