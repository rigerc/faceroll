/** A look that tags which vibes a part belongs to. */
export type VibeTag = "cute" | "cool" | "weird";

/** Restricts which parts a roll can pick. `"any"` allows every part. */
export type Vibe = "any" | VibeTag;

/** Which way the face glances. `c` is centered. */
export type Look = "c" | "l" | "r";

/** A left and right glyph, for example `["•", "•"]`. */
export type Pair = readonly [left: string, right: string];

export type EyeExpression = "open" | "blink" | "happy" | "wide" | "sad" | "angry" | "sleep";

export type MouthExpression =
  | "calm"
  | "smile"
  | "big"
  | "open"
  | "sad"
  | "flat"
  | "unsure"
  | "angry"
  | "sleep";

export interface BodyDef<I extends string = string, M extends string = string> {
  readonly id: I;
  /** Drawn before the eyes, for example `ʕ` or `ヽ(`. */
  readonly left: string;
  /** Drawn after the eyes, for example `ʔ` or `)ﾉ`. */
  readonly right: string;
  readonly vibes: readonly VibeTag[];
  /** When set, this body always uses that mouth (a bear needs its `ᴥ`). */
  readonly mouth?: M;
}

export interface EyeDef<I extends string = string> extends Record<EyeExpression, Pair> {
  readonly id: I;
  readonly vibes: readonly VibeTag[];
}

export interface MouthDef<I extends string = string> extends Record<MouthExpression, string> {
  readonly id: I;
  readonly vibes: readonly VibeTag[];
}

/** One step of an animation: show `text` for `ms` milliseconds. */
export interface Frame {
  readonly text: string;
  readonly ms: number;
}

export interface StateInfo<I extends string = string> {
  readonly id: I;
  readonly label: string;
  readonly kind: "state" | "emotion";
  /** When an agent should show this face. Used in generated prompts. */
  readonly use: string;
  /** A sample message, handy for previews. */
  readonly say: string;
}
