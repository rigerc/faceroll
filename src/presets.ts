import { createCharacter, type Character, type CreateOptions } from "./character";
import type { Parts } from "./parts";
import type { VibeTag } from "./types";

/** A named starting face with all nine animated states. */
export interface FacePreset<I extends string = string> {
  readonly id: I;
  readonly label: string;
  readonly vibe: VibeTag;
  readonly parts: Readonly<Parts>;
}

const DEFINITIONS = [
  { id: "classic", label: "Classic", vibe: "cute", parts: { body: "round", eyes: "dot", mouth: "w" } },
  { id: "blush", label: "Shy blush", vibe: "cute", parts: { body: "double", eyes: "shy", mouth: "three" } },
  { id: "boba", label: "Boba", vibe: "cute", parts: { body: "cloud", eyes: "round", mouth: "cat" } },
  { id: "starlight", label: "Starlight", vibe: "cute", parts: { body: "spark", eyes: "star", mouth: "heart" } },
  { id: "petal", label: "Petal", vibe: "cute", parts: { body: "flower", eyes: "sparkle", mouth: "tiny" } },
  { id: "bunny", label: "Bunny", vibe: "cute", parts: { body: "bunny", eyes: "wink", mouth: "tongue" } },
  { id: "kitty", label: "Kitty", vibe: "cute", parts: { body: "cat", eyes: "cat", mouth: "cat" } },
  { id: "teddy", label: "Teddy", vibe: "cute", parts: { body: "bear", eyes: "dot", mouth: "bear" } },
  { id: "daydream", label: "Daydream", vibe: "cute", parts: { body: "cloud", eyes: "sleepy", mouth: "grin" } },
  { id: "dancer", label: "Dancer", vibe: "cute", parts: { body: "dancer", eyes: "dot", mouth: "grin" } },
  { id: "hacker", label: "Hacker", vibe: "cool", parts: { body: "bot", eyes: "pixel", mouth: "pixel" } },
  { id: "deadpan", label: "Deadpan", vibe: "cool", parts: { body: "robot", eyes: "box", mouth: "dead" } },
  { id: "champ", label: "Champion", vibe: "cool", parts: { body: "flex", eyes: "smug", mouth: "grin" } },
  { id: "knight", label: "Knight", vibe: "cool", parts: { body: "shield", eyes: "triangle", mouth: "scream" } },
  { id: "cyber", label: "Cyber", vibe: "cool", parts: { body: "square", eyes: "box", mouth: "pixel" } },
  { id: "noir", label: "Noir", vibe: "cool", parts: { body: "frame", eyes: "tiny", mouth: "plain" } },
  { id: "fighter", label: "Fighter", vibe: "cool", parts: { body: "arms", eyes: "smug", mouth: "smirk" } },
  { id: "prism", label: "Prism", vibe: "cool", parts: { body: "diamond", eyes: "star", mouth: "scream" } },
  { id: "visitor", label: "Visitor", vibe: "weird", parts: { body: "alien", eyes: "ring", mouth: "dead" } },
  { id: "haunt", label: "Haunt", vibe: "weird", parts: { body: "ghost", eyes: "cross", mouth: "dead" } },
  { id: "gremlin", label: "Gremlin", vibe: "weird", parts: { body: "tentacle", eyes: "teary", mouth: "fang" } },
  { id: "glitch", label: "Glitch", vibe: "weird", parts: { body: "angle", eyes: "cross", mouth: "pixel" } },
  { id: "oracle", label: "Oracle", vibe: "weird", parts: { body: "owl", eyes: "ring", mouth: "tongue" } },
  { id: "oddity", label: "Oddity", vibe: "weird", parts: { body: "curly", eyes: "sparkle", mouth: "oval" } },
] as const satisfies readonly FacePreset[];

export type PresetId = (typeof DEFINITIONS)[number]["id"];

export const FACE_PRESETS: readonly FacePreset<PresetId>[] = Object.freeze(
  DEFINITIONS.map((preset) => Object.freeze({ ...preset, parts: Object.freeze({ ...preset.parts }) })),
);

export function getFacePreset(id: string): FacePreset<PresetId> {
  const preset = FACE_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new RangeError(`Unknown face preset "${id}". Use one of: ${FACE_PRESETS.map((p) => p.id).join(", ")}`);
  return preset;
}

/** Build an immutable, animated character using a named preset. */
export function createPresetCharacter(id: string, options: CreateOptions = {}): Character {
  return createCharacter({ ...getFacePreset(id).parts }, options);
}
