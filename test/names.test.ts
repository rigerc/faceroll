import { describe, expect, it } from "vitest";
import {
  BODIES, EYES, MOUTHS, FACE_PRESETS, createCharacter, createFaceroll,
  createPresetCharacter, deserialize, nameForParts, rerollPart, rollCharacter,
  seededRng, serialize, toMarkdown, toNodeSource, toSystemPrompt,
} from "../src/index";

describe("automatic character names", () => {
  it("allocates 6480 distinct human names, including preferred bear mouths", () => {
    const names = new Set<string>();
    for (const body of BODIES) for (const eyes of EYES) for (const mouth of MOUTHS) {
      const name = nameForParts({ body: body.id, eyes: eyes.id, mouth: mouth.id });
      expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
      expect(names.has(name)).toBe(false);
      names.add(name);
    }
    expect(names.size).toBe(6480);
    // Protect existing allocations from accidental list edits or reordering.
    expect(nameForParts({ body: "round", eyes: "dot", mouth: "w" })).toBe("Milo Bennett");
    expect(nameForParts({ body: "bat", eyes: "cat", mouth: "scream" })).toBe("Maisie Stewart");
  });

  it("uses the same name for exact parts, presets, and seeded rolls", () => {
    for (const preset of FACE_PRESETS) {
      expect(createPresetCharacter(preset.id).name).toBe(nameForParts(preset.parts));
    }
    const a = rollCharacter({ seed: "pixel" });
    expect(rollCharacter({ seed: "pixel" })).toEqual(a);
    expect(createCharacter(a.parts).name).toBe(a.name);
    expect(rollCharacter({ seed: "different", lock: a.parts }).name).toBe(a.name);
    expect(a.nameMode).toBe("auto");
    const unseeded = rollCharacter();
    expect(rollCharacter({ seed: unseeded.seed as string })).toEqual(unseeded);
  });

  it("does not change the random draws or face parts when naming", () => {
    let draws = 0;
    const rng = seededRng("unchanged");
    const automatic = rollCharacter({ rng: () => { draws++; return rng(); } });
    expect(draws).toBe(3);
    const custom = rollCharacter({ rng: seededRng("unchanged"), name: "Pixel" });
    expect(automatic.parts).toEqual(custom.parts);
    expect(automatic.animations).toEqual(custom.animations);
    expect(automatic.seed).toBeUndefined();
  });

  it("follows part rerolls for automatic names and retains custom or legacy names", () => {
    const automatic = rollCharacter({ seed: "start" });
    const next = rerollPart(automatic, "eyes", { seed: "next" });
    expect(next.name).not.toBe(automatic.name);
    expect(next.name).toBe(nameForParts(next.parts));
    const custom = createCharacter(automatic.parts, { name: "  Pixel  " });
    expect(custom.name).toBe("Pixel");
    expect(custom.nameMode).toBe("custom");
    expect(rerollPart(custom, "eyes", { seed: "next" }).name).toBe("Pixel");
    const { nameMode: _, ...legacy } = custom;
    expect(rerollPart(legacy, "eyes", { seed: "next" }).name).toBe("Pixel");
    expect(createCharacter(automatic.parts, { name: "  " }).name).toBe(automatic.name);
  });

  it("round-trips naming mode through JSON and uses names in every export", () => {
    for (const name of [undefined, "Pixel"]) {
      const c = rollCharacter({ seed: "exports", ...(name !== undefined ? { name } : {}) });
      const restored = deserialize(JSON.parse(JSON.stringify(serialize(c))));
      expect(restored).toEqual(c);
      expect(rerollPart(restored, "mouth", { seed: "next" }).nameMode).toBe(c.nameMode);
      expect(toSystemPrompt(c)).toContain(`You are ${c.name}.`);
      expect(toMarkdown(c)).toContain(`### ${c.name}`);
      expect(toNodeSource(c)).toContain(`// Faceroll animations for ${c.name}`);
    }
    const parts = { body: "round", eyes: "dot", mouth: "w" } as const;
    expect(deserialize({ name: "Agent", parts }).nameMode).toBe("custom");
  });
});

describe("editor naming", () => {
  it("tracks edits, full rolls, presets and undo with automatic names", () => {
    const editor = createFaceroll({ seed: "names" });
    const initial = editor.getCharacter();
    editor.roll();
    expect(editor.getConfig().name).toBe(nameForParts(editor.getParts()));
    expect(editor.getConfig().name).not.toBe(initial.name);
    editor.undo();
    expect(editor.getCharacter()).toEqual(initial);
    editor.applyPreset("kitty");
    expect(editor.getCharacter().name).toBe(createPresetCharacter("kitty").name);
    editor.undo();
    expect(editor.getCharacter()).toEqual(initial);
    editor.setParts({ body: "bot" });
    expect(editor.getConfig().name).toBe(nameForParts(editor.getParts()));
    editor.reroll("mouth");
    expect(editor.getConfig().name).toBe(nameForParts(editor.getParts()));
    for (const kind of ["body", "eyes", "mouth"] as const) editor.setLocked(kind, true);
    const before = editor.getConfig();
    expect(editor.roll()).toBe(false);
    expect(editor.getConfig()).toEqual(before);
  });

  it("keeps custom names until cleared, including when they equal an automatic name", () => {
    const editor = createFaceroll({ seed: "custom" });
    const custom = editor.getConfig().name;
    editor.setName(custom);
    editor.roll();
    expect(editor.getConfig().name).toBe(custom);
    expect(editor.getConfig().nameMode).toBe("custom");
    editor.setName("   ");
    expect(editor.getConfig().name).toBe(nameForParts(editor.getParts()));
    expect(editor.getConfig().nameMode).toBe("auto");
    editor.setName("  Nova ");
    editor.applyPreset("bunny");
    editor.undo();
    expect(editor.getConfig().name).toBe("Nova");
  });

  it("restores naming mode from saved config and preserves legacy saved names", () => {
    const automatic = createFaceroll();
    const restored = createFaceroll(JSON.parse(JSON.stringify(automatic.getConfig())));
    restored.setParts({ body: "bear" });
    expect(restored.getConfig().name).toBe(nameForParts(restored.getParts()));
    const { nameMode: _, ...saved } = automatic.getConfig();
    const legacy = { ...saved, name: "Pixel" };
    const custom = createFaceroll(legacy);
    custom.setParts({ body: "bear" });
    expect(custom.getConfig().name).toBe("Pixel");
  });
});
