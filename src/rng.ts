/** A function that returns a number in [0, 1), like `Math.random`. */
export type Rng = () => number;

/** Turn any string or number into a 32-bit unsigned seed (FNV-1a for strings). */
export function hashSeed(seed: string | number): number {
  if (typeof seed === "number") return seed >>> 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small, fast, seedable generator (mulberry32). */
export function seededRng(seed: string | number): Rng {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): string {
  return Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, "0");
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new RangeError("Cannot pick from an empty list");
  return items[Math.floor(rng() * items.length)] as T;
}
