import type { BodyDef, EyeDef, MouthDef, Vibe, VibeTag } from "./types";

const MOUTH_DEFS = [
  { id: "w",     vibes: ["cute", "weird"],         calm: "ω", smile: "‿", big: "▽", open: "o", sad: "︿", flat: "_", unsure: "~", angry: "Д", sleep: "ω" },
  { id: "three", vibes: ["cute", "weird"],         calm: "3", smile: "ᴗ", big: "▽", open: "o", sad: "︿", flat: "_", unsure: "~", angry: "Д", sleep: "3" },
  { id: "bear",  vibes: ["cute"],                  calm: "ᴥ", smile: "ᴥ", big: "▽", open: "o", sad: "﹏", flat: "ᴥ", unsure: "~", angry: "ᴥ", sleep: "ᴥ" },
  { id: "plain", vibes: ["cool", "weird", "cute"], calm: "_", smile: "‿", big: "▽", open: "o", sad: "︿", flat: "_", unsure: "~", angry: "_", sleep: "_" },
  { id: "dead",  vibes: ["cool", "weird"],         calm: "‸", smile: "‿", big: "◡", open: "ロ", sad: "﹏", flat: "‸", unsure: "~", angry: "皿", sleep: "‸" },
] as const satisfies readonly MouthDef[];

export type MouthId = (typeof MOUTH_DEFS)[number]["id"];
export const MOUTHS: readonly MouthDef<MouthId>[] = MOUTH_DEFS;

const BODY_DEFS = [
  { id: "round", left: "(",  right: ")",  vibes: ["cute", "cool", "weird"] },
  { id: "bear",  left: "ʕ",  right: "ʔ",  vibes: ["cute"], mouth: "bear" },
  { id: "wave",  left: "ヽ(", right: ")ﾉ", vibes: ["cute"] },
  { id: "hug",   left: "⊂(", right: ")⊃", vibes: ["cute"] },
  { id: "cloud", left: "꒰",  right: "꒱",  vibes: ["cute"] },
  { id: "bot",   left: "[",  right: "]",  vibes: ["cool", "weird"] },
  { id: "shrug", left: "╭(", right: ")╮", vibes: ["cool"] },
  { id: "flex",  left: "ᕦ(", right: ")ᕤ", vibes: ["cool"] },
  { id: "angle", left: "<(", right: ")>", vibes: ["weird"] },
  { id: "curly", left: "{",  right: "}",  vibes: ["weird"] },
  { id: "owl",   left: "ʢ",  right: "ʡ",  vibes: ["weird"] },
] as const satisfies readonly BodyDef<string, MouthId>[];

export type BodyId = (typeof BODY_DEFS)[number]["id"];
export const BODIES: readonly BodyDef<BodyId, MouthId>[] = BODY_DEFS;

const EYE_DEFS = [
  { id: "dot",   vibes: ["cute", "cool"],  open: ["•", "•"], blink: ["-", "-"], happy: ["^", "^"], wide: ["⊙", "⊙"], sad: ["╥", "╥"], angry: ["ò", "ó"], sleep: ["˘", "˘"] },
  { id: "round", vibes: ["cute", "weird"], open: ["◕", "◕"], blink: ["-", "-"], happy: ["◠", "◠"], wide: ["◉", "◉"], sad: ["ಥ", "ಥ"], angry: ["ಠ", "ಠ"], sleep: ["ᴗ", "ᴗ"] },
  { id: "tiny",  vibes: ["cute", "cool"],  open: ["·", "·"], blink: ["-", "-"], happy: ["^", "^"], wide: ["°", "°"], sad: [";", ";"], angry: ["｀", "´"], sleep: ["-", "-"] },
  { id: "smug",  vibes: ["cool"],          open: ["¬", "¬"], blink: ["-", "-"], happy: ["≧", "≦"], wide: ["⊙", "⊙"], sad: ["´", "｀"], angry: ["≖", "≖"], sleep: ["-", "-"] },
  { id: "box",   vibes: ["cool", "weird"], open: ["■", "■"], blink: ["-", "-"], happy: ["^", "^"], wide: ["◉", "◉"], sad: ["T", "T"], angry: ["ò", "ó"], sleep: ["-", "-"] },
  { id: "ring",  vibes: ["weird"],         open: ["◔", "◔"], blink: ["-", "-"], happy: ["◠", "◠"], wide: ["◉", "◉"], sad: ["╥", "╥"], angry: ["҂", "҂"], sleep: ["ᴗ", "ᴗ"] },
] as const satisfies readonly EyeDef[];

export type EyesId = (typeof EYE_DEFS)[number]["id"];
export const EYES: readonly EyeDef<EyesId>[] = EYE_DEFS;

/** The three choices that make up a character. */
export interface Parts {
  body: BodyId;
  eyes: EyesId;
  mouth: MouthId;
}

export type PartKind = keyof Parts;
export const PART_KINDS = ["body", "eyes", "mouth"] as const satisfies readonly PartKind[];

type Table<K extends PartKind> = readonly { readonly id: Parts[K]; readonly vibes: readonly VibeTag[] }[];
const TABLES: { [K in PartKind]: Table<K> } = { body: BODIES, eyes: EYES, mouth: MOUTHS };

export function getBody(id: string): BodyDef<BodyId, MouthId> {
  const found = BODIES.find((b) => b.id === id);
  if (!found) throw new RangeError(`Unknown body "${id}". Use one of: ${BODIES.map((b) => b.id).join(", ")}`);
  return found;
}
export function getEyes(id: string): EyeDef<EyesId> {
  const found = EYES.find((e) => e.id === id);
  if (!found) throw new RangeError(`Unknown eyes "${id}". Use one of: ${EYES.map((e) => e.id).join(", ")}`);
  return found;
}
export function getMouth(id: string): MouthDef<MouthId> {
  const found = MOUTHS.find((m) => m.id === id);
  if (!found) throw new RangeError(`Unknown mouth "${id}". Use one of: ${MOUTHS.map((m) => m.id).join(", ")}`);
  return found;
}

/** Ids of the parts of one kind that fit a vibe. */
export function partPool<K extends PartKind>(kind: K, vibe: Vibe = "any"): Parts[K][] {
  const table: Table<K> = TABLES[kind];
  return table.filter((p) => vibe === "any" || p.vibes.includes(vibe)).map((p) => p.id);
}
