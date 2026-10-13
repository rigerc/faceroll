import { createCharacter, type Character } from "./character";
import { partPool, PART_KINDS, type PartKind, type Parts } from "./parts";
import { pick, seededRng, type Rng } from "./rng";
import { type StateName } from "./states";
import { frameAt } from "./player";
import { serialize, toMarkdown, toNodeSource, toSystemPrompt } from "./export";
import type { Vibe } from "./types";

export type PartLocks = Record<PartKind, boolean>;
export type ExportFormat = "prompt" | "markdown" | "json" | "node";

export interface FacerollOptions {
  name?: string;
  vibe?: Vibe;
  parts?: Partial<Parts>;
  locks?: Partial<PartLocks>;
  /** Stateful deterministic RNG: a seed produces a repeatable *sequence* of rolls. */
  seed?: string | number;
  /** Custom RNG replaces `seed` (takes precedence if both are set). */
  rng?: Rng;
  /** Compatibility alias from the earlier TypeScript editor; `rng` takes priority. */
  random?: Rng;
  /** Number of roll/reroll snapshots to retain. Default 30. */
  historyLimit?: number;
}

export interface FacerollConfig {
  name: string;
  vibe: Vibe;
  parts: Parts;
  locks: PartLocks;
}

const DEFAULT_PARTS: Parts = { body: "round", eyes: "dot", mouth: "w" };
const DEFAULT_LOCKS: PartLocks = { body: false, eyes: false, mouth: false };
const VIBES: readonly Vibe[] = ["any", "cute", "cool", "weird"];

function validKind(kind: PartKind): void {
  if (!PART_KINDS.includes(kind)) throw new RangeError(`Unknown part kind: ${String(kind)}`);
}

function validVibe(vibe: Vibe): void {
  if (!VIBES.includes(vibe)) throw new RangeError(`Unknown vibe: ${String(vibe)}`);
}

/**
 * Stateful editor layered over the library's immutable `Character` data model.
 * Supports independent locking, reproducible rolls and bounded undo history.
 * No DOM, storage, or timer dependencies.
 */
export class Faceroll {
  private name: string;
  private vibe: Vibe;
  private parts: Parts;
  private locks: PartLocks;
  private character: Character;
  private readonly rng: Rng;
  private readonly historyLimit: number;
  private readonly history: Parts[] = [];

  constructor(options: FacerollOptions = {}) {
    this.name = options.name ?? "Agent";
    this.vibe = options.vibe ?? "any";
    validVibe(this.vibe);
    this.parts = { ...DEFAULT_PARTS, ...options.parts };
    this.locks = { ...DEFAULT_LOCKS, ...options.locks };
    if (options.historyLimit !== undefined && (!Number.isSafeInteger(options.historyLimit) || options.historyLimit < 0)) {
      throw new RangeError("historyLimit must be a non-negative integer");
    }
    this.historyLimit = options.historyLimit ?? 30;
    this.rng = options.rng ?? options.random ?? (options.seed !== undefined ? seededRng(options.seed) : Math.random);
    this.character = createCharacter(this.parts, { name: this.name });
  }

  getConfig(): FacerollConfig {
    return { name: this.name, vibe: this.vibe, parts: { ...this.parts }, locks: { ...this.locks } };
  }

  /** Immutable snapshot suitable for existing `faceroll` APIs. */
  getCharacter(): Character { return this.character; }
  getParts(): Parts { return { ...this.parts }; }
  getLocks(): PartLocks { return { ...this.locks }; }
  get historyLength(): number { return this.history.length; }

  setName(name: string): void {
    this.name = name;
    this.refresh();
  }

  /** Set vibe, optionally rerolling all unlocked parts (default: reroll). */
  setVibe(vibe: Vibe, reroll = true): boolean {
    validVibe(vibe);
    this.vibe = vibe;
    return reroll ? this.roll() : false;
  }

  /** Roll each unlocked part to a different value where possible. */
  roll(): boolean {
    const free = PART_KINDS.filter((kind) => !this.locks[kind]);
    if (!free.length) return false;
    const next = { ...this.parts };
    // Construct a complete roll before committing: bad RNG values cannot corrupt state.
    for (const kind of free) this.pickNext(next, kind);
    this.commit(next);
    return true;
  }

  /** Reroll exactly one unlocked part; locked categories return false. */
  reroll(kind: PartKind): boolean {
    validKind(kind);
    if (this.locks[kind]) return false;
    const next = { ...this.parts };
    this.pickNext(next, kind);
    this.commit(next);
    return true;
  }

  /** Undo the last successful roll or reroll. Locks and vibe are unchanged. */
  undo(): boolean {
    const previous = this.history.pop();
    if (!previous) return false;
    this.parts = previous;
    this.refresh();
    return true;
  }

  /** Explicitly set selected parts, even if locked or outside the current vibe. */
  setParts(changes: Partial<Parts>): void {
    const next = { ...this.parts, ...changes };
    const candidate = createCharacter(next, { name: this.name });
    this.parts = next;
    this.character = candidate;
  }

  setLocked(kind: PartKind, locked: boolean): void {
    validKind(kind);
    this.locks[kind] = locked;
  }
  isLocked(kind: PartKind): boolean {
    validKind(kind);
    return this.locks[kind];
  }

  getAnimations(): Character["animations"] { return this.character.animations; }
  getAnimation(state: StateName): Character["animations"][StateName] { return this.character.animations[state]; }
  getStill(state: StateName): string { return this.getAnimation(state).still; }
  getFrameAt(state: StateName, elapsedMs: number): string {
    return frameAt(this.getAnimation(state), elapsedMs).text;
  }

  export(format: ExportFormat = "prompt"): string {
    switch (format) {
      case "prompt": return toSystemPrompt(this.character);
      case "markdown": return toMarkdown(this.character);
      case "json": return JSON.stringify(serialize(this.character), null, 2);
      case "node": return toNodeSource(this.character);
      default: throw new RangeError(`Unknown export format: ${String(format)}`);
    }
  }

  private pickNext<K extends PartKind>(next: Parts, kind: K): void {
    const pool = partPool(kind, this.vibe);
    const alternatives = pool.filter((id) => id !== next[kind]);
    const candidates = alternatives.length ? alternatives : pool;
    // Ensure both seeded and injected sources follow the documented [0,1) contract.
    const value = this.rng();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError("rng must return a finite number in [0, 1)");
    }
    next[kind] = pick(candidates, () => value);
  }

  private commit(next: Parts): void {
    const candidate = createCharacter(next, { name: this.name });
    if (this.historyLimit > 0) {
      this.history.push({ ...this.parts });
      if (this.history.length > this.historyLimit) this.history.shift();
    }
    this.parts = next;
    this.character = candidate;
  }

  private refresh(): void {
    this.character = createCharacter(this.parts, { name: this.name });
  }
}

/** Create a stateful editor for interactive character customization. */
export function createFaceroll(options: FacerollOptions = {}): Faceroll {
  return new Faceroll(options);
}
