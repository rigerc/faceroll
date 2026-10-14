import { describe, expect, it } from "vitest";
import {
  childCapacity, createCharacter, deriveChildCharacter, deriveChildCharacters,
  deserialize, serialize, STATE_NAMES,
} from "../src/index";

const parent = createCharacter({ body: "round", eyes: "dot", mouth: "w" }, { name: "Project face" });

describe("parent / child character families", () => {
  it("keeps the parent unchanged and uses the same silhouette", () => {
    const before = serialize(parent);
    const children = deriveChildCharacters(parent, { count: 24, seed: "project-1" });
    expect(serialize(parent)).toEqual(before);
    expect(children).toHaveLength(24);
    expect(children.every((child) => child.parts.body === parent.parts.body)).toBe(true);
    expect(children.every((child) => child.animations.idle.still !== parent.animations.idle.still)).toBe(true);
    expect(new Set(children.map((child) => child.animations.idle.still)).size).toBe(24);
    expect(children.every((child) => child.nameMode === "auto")).toBe(true);
  });

  it("gives each stable index the same character regardless of batch size or restart", () => {
    const first = deriveChildCharacters(parent, { count: 8, seed: "project-1" });
    const longer = deriveChildCharacters(parent, { count: 16, seed: "project-1" });
    expect(longer.slice(0, 8).map((c) => c.parts)).toEqual(first.map((c) => c.parts));
    const restored = deserialize(serialize(parent));
    for (let i = 0; i < first.length; i++) {
      expect(deriveChildCharacter(restored, { index: i, seed: "project-1" }).parts).toEqual(first[i]?.parts);
    }
    expect(deriveChildCharacter(parent, { index: 0 }).parts)
      .toEqual(deriveChildCharacter(restored, { index: 0 }).parts);
  });

  it("prioritizes one-part changes before two-part changes", () => {
    const children = deriveChildCharacters(parent, { count: 29, seed: "nearby" });
    expect(children.every((c) => [c.parts.eyes !== parent.parts.eyes, c.parts.mouth !== parent.parts.mouth]
      .filter(Boolean).length === 1)).toBe(true);
    const thirtieth = deriveChildCharacter(parent, { index: 29, seed: "nearby" });
    expect(thirtieth.parts.eyes).not.toBe(parent.parts.eyes);
    expect(thirtieth.parts.mouth).not.toBe(parent.parts.mouth);
  });

  it("deduplicates rendered faces, including the fixed-mouth bear", () => {
    const bear = createCharacter({ body: "bear", eyes: "dot", mouth: "w" });
    expect(childCapacity(bear)).toBe(15);
    const children = deriveChildCharacters(bear, { count: 15, seed: "bear" });
    expect(new Set(children.map((c) => c.animations.idle.still)).size).toBe(15);
    expect(children.every((c) => c.parts.mouth === "w")).toBe(true);
    expect(() => deriveChildCharacters(bear, { count: 16 })).toThrow(/capacity \(15\)/);
    expect(childCapacity(parent)).toBe(239);
  });

  it("supports custom names and preserves all animated states", () => {
    const child = deriveChildCharacter(parent, { index: 2, seed: "a", name: "Thread Green" });
    expect(child.name).toBe("Thread Green");
    expect(child.nameMode).toBe("custom");
    expect(Object.isFrozen(child)).toBe(true);
    for (const state of STATE_NAMES) {
      expect(child.animations[state].frames.length).toBeGreaterThan(0);
      expect(child.animations[state].still.length).toBeGreaterThan(0);
    }
  });

  it("validates counts and indices instead of repeating a face", () => {
    for (const count of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => deriveChildCharacters(parent, { count })).toThrow(RangeError);
    }
    expect(deriveChildCharacters(parent, { count: 0 })).toEqual([]);
    for (const index of [-1, 1.5, NaN, Infinity, 239]) {
      expect(() => deriveChildCharacter(parent, { index })).toThrow(RangeError);
    }
    expect(() => deriveChildCharacters(parent, { count: 240 })).toThrow(/capacity \(239\)/);
  });
});
