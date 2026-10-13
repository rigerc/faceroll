import type { BodyDef, EyeDef, MouthDef, Vibe, VibeTag } from "./types";

const MOUTH_DEFS = [
  { id: "w",     vibes: ["cute", "weird"],         calm: "ω", smile: "‿", big: "▽", open: "o", sad: "︿", flat: "_", unsure: "~", angry: "Д", sleep: "ω" },
  { id: "three", vibes: ["cute", "weird"],         calm: "3", smile: "ᴗ", big: "▽", open: "o", sad: "︿", flat: "_", unsure: "~", angry: "Д", sleep: "3" },
  { id: "bear",  vibes: ["cute"],                  calm: "ᴥ", smile: "ᴥ", big: "▽", open: "o", sad: "﹏", flat: "ᴥ", unsure: "~", angry: "ᴥ", sleep: "ᴥ" },
  { id: "plain", vibes: ["cool", "weird", "cute"], calm: "_", smile: "‿", big: "▽", open: "o", sad: "︿", flat: "_", unsure: "~", angry: "_", sleep: "_" },
  { id: "dead",  vibes: ["cool", "weird"],         calm: "‸", smile: "‿", big: "◡", open: "ロ", sad: "﹏", flat: "‸", unsure: "~", angry: "皿", sleep: "‸" },
  { id: "smirk", vibes: ["cool", "weird"], calm: "⌣", smile: "⌣", big: "▽", open: "◡", sad: "︿", flat: "—", unsure: "~", angry: "皿", sleep: "⌣" },
  { id: "grin", vibes: ["cute", "cool"], calm: "‿", smile: "‿", big: "◡", open: "O", sad: "︵", flat: "ー", unsure: "﹏", angry: "皿", sleep: "ᴗ" },
  { id: "tiny", vibes: ["cute", "cool"], calm: "·", smile: "ᴗ", big: "▽", open: "o", sad: "︿", flat: "·", unsure: "~", angry: "︿", sleep: "·" },
  { id: "cat", vibes: ["cute"], calm: "ᆺ", smile: "ᆺ", big: "▽", open: "o", sad: "﹏", flat: "ᆺ", unsure: "﹏", angry: "Д", sleep: "ᆺ" },
  { id: "fang", vibes: ["cute", "weird"], calm: "⩊", smile: "⩊", big: "▽", open: "口", sad: "﹏", flat: "⩊", unsure: "~", angry: "Д", sleep: "⩊" },
  { id: "pixel", vibes: ["cool", "weird"], calm: "▪", smile: "▿", big: "▼", open: "□", sad: "︵", flat: "▬", unsure: "?", angry: "▣", sleep: "▪" },
  { id: "oval", vibes: ["cute", "cool"], calm: "ᴖ", smile: "ᴗ", big: "◡", open: "○", sad: "ᗣ", flat: "_", unsure: "~", angry: "Д", sleep: "ᴖ" },
  { id: "tongue", vibes: ["cute", "weird"], calm: "ڡ", smile: "ᴗ", big: "▽", open: "ڡ", sad: "︿", flat: "_", unsure: "﹏", angry: "Д", sleep: "ω" },
  { id: "heart", vibes: ["cute", "weird"], calm: "♡", smile: "♥", big: "♡", open: "o", sad: "︵", flat: "_", unsure: "~", angry: "Д", sleep: "♡" },
  { id: "scream", vibes: ["weird", "cool"], calm: "□", smile: "▽", big: "□", open: "□", sad: "︵", flat: "▬", unsure: "﹏", angry: "皿", sleep: "□" },
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
  { id: "square", left: "【", right: "】", vibes: ["cool", "weird"] },
  { id: "double", left: "（", right: "）", vibes: ["cute", "weird"] },
  { id: "flower", left: "✿(", right: ")✿", vibes: ["cute"] },
  { id: "spark", left: "✧(", right: ")✧", vibes: ["cute", "weird"] },
  { id: "cat", left: "ฅ(", right: ")ฅ", vibes: ["cute"] },
  { id: "bunny", left: "૮(", right: ")ა", vibes: ["cute"] },
  { id: "ghost", left: "༼", right: "༽", vibes: ["weird"] },
  { id: "tentacle", left: "ლ(", right: ")ლ", vibes: ["weird"] },
  { id: "robot", left: "⟦", right: "⟧", vibes: ["cool"] },
  { id: "shield", left: "⟨", right: "⟩", vibes: ["cool", "weird"] },
  { id: "arms", left: "ᕙ(", right: ")ᕗ", vibes: ["cool"] },
  { id: "dancer", left: "ヾ(", right: ")ﾉ", vibes: ["cute"] },
  { id: "alien", left: "⟬", right: "⟭", vibes: ["weird"] },
  { id: "diamond", left: "◇(", right: ")◇", vibes: ["cool", "weird"] },
  { id: "frame", left: "〖", right: "〗", vibes: ["cool"] },
  { id: "bat", left: "ʚ(", right: ")ɞ", vibes: ["cute", "weird"] },
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
  { id: "sparkle", vibes: ["cute", "weird"], open: ["✧", "✧"], blink: ["˘", "˘"], happy: ["✦", "✦"], wide: ["✪", "✪"], sad: ["ಥ", "ಥ"], angry: ["ಠ", "ಠ"], sleep: ["˘", "˘"] },
  { id: "star", vibes: ["cute", "cool"], open: ["★", "★"], blink: ["-", "-"], happy: ["☆", "☆"], wide: ["✪", "✪"], sad: ["T", "T"], angry: ["✖", "✖"], sleep: ["˘", "˘"] },
  { id: "wink", vibes: ["cute", "cool"], open: ["•", "◡"], blink: ["-", "-"], happy: ["^", "◡"], wide: ["⊙", "◉"], sad: ["T", "T"], angry: ["¬", "¬"], sleep: ["˘", "˘"] },
  { id: "sleepy", vibes: ["cute"], open: ["ᴗ", "ᴗ"], blink: ["-", "-"], happy: ["◡", "◡"], wide: ["◕", "◕"], sad: ["︶", "︶"], angry: ["￢", "￢"], sleep: ["˘", "˘"] },
  { id: "pixel", vibes: ["cool", "weird"], open: [":", ":"], blink: ["-", "-"], happy: ["^", "^"], wide: ["0", "0"], sad: ["T", "T"], angry: ["X", "X"], sleep: ["_", "_"] },
  { id: "cross", vibes: ["weird", "cool"], open: ["x", "x"], blink: ["-", "-"], happy: ["+", "+"], wide: ["X", "X"], sad: [";", ";"], angry: ["×", "×"], sleep: ["x", "x"] },
  { id: "teary", vibes: ["cute", "weird"], open: ["ಥ", "ಥ"], blink: ["-", "-"], happy: ["◠", "◠"], wide: ["◉", "◉"], sad: ["╥", "╥"], angry: ["ಠ", "ಠ"], sleep: ["˘", "˘"] },
  { id: "triangle", vibes: ["cool", "weird"], open: ["▲", "▲"], blink: ["-", "-"], happy: ["△", "△"], wide: ["◆", "◆"], sad: ["T", "T"], angry: ["▼", "▼"], sleep: ["˘", "˘"] },
  { id: "shy", vibes: ["cute"], open: ["⁄", "⁄"], blink: ["-", "-"], happy: ["˃", "˂"], wide: ["°", "°"], sad: [";", ";"], angry: ["｀", "´"], sleep: ["˘", "˘"] },
  { id: "cat", vibes: ["cute", "weird"], open: ["≖", "≖"], blink: ["-", "-"], happy: ["≧", "≦"], wide: ["◉", "◉"], sad: ["ಥ", "ಥ"], angry: ["ಠ", "ಠ"], sleep: ["˘", "˘"] },
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
