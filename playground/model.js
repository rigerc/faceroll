import { createFaceroll, BODIES, EYES, MOUTHS } from "./lib/index.js";

export const STORAGE_KEY = "faceroll:playground:v1";
export const TABLES = { body: BODIES, eyes: EYES, mouth: MOUTHS };

/** Treat persisted browser data as input, rather than constructor options. */
export function restoreEditor(storage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!saved || typeof saved.name !== "string" || saved.name.length > 40 ||
        !["any", "cute", "cool", "weird"].includes(saved.vibe) ||
        !Object.keys(TABLES).every(kind => TABLES[kind].some(part => part.id === saved.parts?.[kind]) &&
          typeof saved.locks?.[kind] === "boolean")) throw new Error("Invalid saved character");
    return createFaceroll({ name: saved.name, vibe: saved.vibe, parts: saved.parts, locks: saved.locks });
  } catch { return createFaceroll({ name: "Pixel" }); }
}

/** UI history includes explicit part choices as well as rolls and presets. */
export function createHistory(editor) {
  const history = [];
  return {
    change(action) {
      const before = editor.getParts();
      action();
      if (JSON.stringify(before) !== JSON.stringify(editor.getParts())) {
        history.push(before);
        if (history.length > 30) history.shift();
      }
    },
    undo() { if (history.length) editor.setParts(history.pop()); },
    get length() { return history.length; },
  };
}

export function filterPresets(presets, vibe, query) {
  const term = query.trim().toLowerCase();
  return presets.filter(preset => (vibe === "any" || preset.vibe === vibe) &&
    `${preset.label} ${preset.id} ${preset.vibe}`.toLowerCase().includes(term));
}

export function exportFilename(name, format) {
  const stem = name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "character";
  return `${stem}.${{ prompt: "txt", json: "json", markdown: "md", node: "cjs" }[format]}`;
}
