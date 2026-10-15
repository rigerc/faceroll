import { describe, expect, it } from "vitest";
import {
  BODIES, EYES, MOUTHS, PERSONALITY_TRAITS, createCharacter, createFaceroll,
  createPresetCharacter, deriveChildCharacters, deserialize, personalityForParts,
  rerollPart, rollCharacter, seededRng, serialize, toMarkdown, toNodeSource, toSystemPrompt,
} from "../src/index";

const parts = { body: "round", eyes: "dot", mouth: "w" } as const;

describe("automatic personalities", () => {
  it("assigns three distinct, immutable catalog traits to all supported faces", () => {
    const used = new Set<string>();
    const profiles = new Set<string>();
    for (const body of BODIES) for (const eyes of EYES) for (const mouth of MOUTHS) {
      const personality = personalityForParts({ body: body.id, eyes: eyes.id, mouth: mouth.id });
      expect(personality).toHaveLength(3);
      expect(new Set(personality.map(trait => trait.id)).size).toBe(3);
      expect(Object.isFrozen(personality)).toBe(true);
      for (const trait of personality) {
        expect(PERSONALITY_TRAITS).toContain(trait);
        expect(Object.isFrozen(trait)).toBe(true);
        used.add(trait.id);
      }
      profiles.add(personality.map(trait => trait.id).join("/"));
    }
    expect(Object.isFrozen(PERSONALITY_TRAITS)).toBe(true);
    expect(used.size).toBe(PERSONALITY_TRAITS.length);
    expect(profiles.size).toBe(216);
    expect(() => personalityForParts({ ...parts, eyes: "invalid" } as never)).toThrow(RangeError);
  });

  it("uses stable identities independent of names, seeds, expressions, or creation path", () => {
    const c = createCharacter(parts);
    // A public compatibility fixture: catalog or algorithm changes must preserve v1 identities.
    expect(c.personality.map(trait => trait.id)).toEqual(["resourceful", "steady", "candid"]);
    expect(createCharacter(parts, { name: "Pixel", seed: "other" }).personality).toEqual(c.personality);
    expect(createPresetCharacter("classic").personality).toEqual(c.personality);
    expect(rollCharacter({ seed: "locked", lock: parts }).personality).toEqual(c.personality);
    expect(Object.keys(c.animations)).toHaveLength(10);
    for (const child of deriveChildCharacters(c, { count: 10, seed: "family" })) {
      expect(child.personality).toEqual(personalityForParts(child.parts));
    }
  });

  it("does not consume random draws used to select the face", () => {
    let draws = 0;
    const rng = seededRng("unchanged");
    const c = rollCharacter({ rng: () => { draws++; return rng(); } });
    expect(draws).toBe(3);
    expect(c.parts).toEqual({ body: "owl", eyes: "cat", mouth: "three" });
    const next = rerollPart(c, "eyes", { seed: "next" });
    expect(next.personality).toEqual(personalityForParts(next.parts));
  });

  it("recreates traits on edits, presets, undo, and legacy storage restoration", () => {
    const editor = createFaceroll({ seed: "personality" });
    const initial = editor.getCharacter();
    editor.setName("Pixel");
    expect(editor.getCharacter().personality).toEqual(initial.personality);
    editor.roll();
    expect(editor.getCharacter().personality).toEqual(personalityForParts(editor.getParts()));
    editor.undo();
    expect(editor.getCharacter().personality).toEqual(initial.personality);
    editor.applyPreset("bunny");
    expect(editor.getCharacter().personality).toEqual(createPresetCharacter("bunny").personality);
    editor.setParts({ body: "bot" });
    expect(editor.getCharacter().personality).toEqual(personalityForParts(editor.getParts()));
    expect(createFaceroll(editor.getConfig()).getCharacter()).toEqual(editor.getCharacter());
    expect(deserialize({ name: "Legacy", parts }).personality).toEqual(initial.personality);
  });

  it("round-trips traits and includes descriptions in portable exports", () => {
    const c = createCharacter(parts);
    const snapshot = serialize(c);
    expect(snapshot.personality).toEqual(c.personality);
    expect(deserialize(JSON.parse(JSON.stringify(snapshot)))).toEqual(c);
    const { personality: _, ...legacy } = snapshot;
    expect(deserialize(legacy)).toEqual(c);
    for (const trait of c.personality) {
      for (const output of [toSystemPrompt(c), toMarkdown(c), toNodeSource(c)]) {
        expect(output).toContain(trait.label);
        expect(output).toContain(trait.description);
      }
    }
    expect(toSystemPrompt(c, { states: ["idle"] })).toContain("respecting the task and user instructions");
    expect(toSystemPrompt(c, { states: ["idle"] })).not.toContain("Working (");
  });
});
