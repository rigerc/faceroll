import { getBody, getEyes, getMouth, type Parts } from "./parts";
import type { StateName } from "./states";
import type { EyeExpression, Frame, Look, MouthExpression } from "./types";
import { cellWidth } from "./width";

/** A named loop of frames plus a single still frame for static use. */
export interface Animation {
  readonly name: StateName;
  /** One representative face with no motion, for prompts and docs. */
  readonly still: string;
  readonly frames: readonly Frame[];
  /** Length of one full loop in milliseconds. */
  readonly duration: number;
  /** Widest frame in terminal columns (see `cellWidth`). */
  readonly width: number;
}

function animation(name: StateName, frames: Frame[], still: string): Animation {
  const duration = frames.reduce((sum, f) => sum + f.ms, 0);
  const width = Math.max(cellWidth(still), ...frames.map((f) => cellWidth(f.text)));
  // Freeze each frame as well as its container: readonly alone is compile-time only.
  const immutableFrames = Object.freeze(frames.map((frame) => Object.freeze({ ...frame })));
  return Object.freeze({ name, still, frames: immutableFrames, duration, width });
}

/**
 * Build all nine animations for one set of parts.
 *
 * Every frame is the same body, eyes and mouth in a different pose, so a
 * character stays recognizable as it changes state. Glances move the face
 * inside its body with a space, and tails like `...` or `?` are appended so
 * the body never moves.
 */
export function buildAnimations(parts: Parts): Record<StateName, Animation> {
  const body = getBody(parts.body);
  const eyes = getEyes(parts.eyes);
  const mouth = getMouth(body.mouth ?? parts.mouth);

  const face = (e: EyeExpression, m: MouthExpression, look: Look = "c", tail = ""): string => {
    const [l, r] = eyes[e];
    let core = l + mouth[m] + r;
    if (look === "l") core += " ";
    else if (look === "r") core = " " + core;
    return body.left + core + body.right + tail;
  };
  const f = (e: EyeExpression, m: MouthExpression, look: Look, tail: string, ms: number): Frame => ({
    text: face(e, m, look, tail),
    ms,
  });

  const dots = [".  ", ".. ", "...", " ..", "  .", "   "];
  const scan: Look[] = ["c", "l", "l", "c", "r", "r"];

  return {
    idle: animation(
      "idle",
      [
        f("open", "calm", "c", "", 2400),
        f("blink", "calm", "c", "", 110),
        f("open", "calm", "c", "", 1500),
        f("open", "calm", "l", "", 650),
        f("open", "calm", "r", "", 650),
        f("open", "calm", "c", "", 1300),
        f("blink", "calm", "c", "", 110),
        f("open", "calm", "c", "", 150),
        f("blink", "calm", "c", "", 110),
      ],
      face("open", "calm"),
    ),
    working: animation(
      "working",
      dots.map((d, i) => f("open", "flat", scan[i] ?? "c", " " + d, 150)),
      face("open", "flat", "c", " ..."),
    ),
    waiting: animation(
      "waiting",
      [
        f("open", "calm", "c", "", 700),
        f("open", "calm", "c", " .", 450),
        f("open", "calm", "c", " ..", 450),
        f("open", "calm", "c", " ...", 700),
        f("blink", "calm", "c", " ...", 110),
        f("open", "calm", "c", " ...", 500),
      ],
      face("open", "calm", "c", " ..."),
    ),
    questioning: animation(
      "questioning",
      [
        f("open", "unsure", "c", "", 500),
        f("open", "unsure", "l", " ?", 500),
        f("open", "unsure", "r", " ?", 500),
        f("open", "unsure", "c", " ??", 600),
        f("blink", "unsure", "c", " ?", 110),
        f("open", "unsure", "c", " ?", 500),
      ],
      face("open", "unsure", "c", " ?"),
    ),
    happy: animation(
      "happy",
      [
        f("happy", "big", "c", "", 350),
        f("happy", "big", "l", " ♪", 300),
        f("happy", "big", "c", "", 350),
        f("happy", "big", "r", " ♫", 300),
      ],
      face("happy", "big", "c", " ♪"),
    ),
    sad: animation(
      "sad",
      [
        f("sad", "sad", "c", "", 900),
        f("blink", "sad", "c", "", 140),
        f("sad", "sad", "c", "", 600),
        f("sad", "sad", "l", " …", 700),
        f("sad", "sad", "c", "", 700),
      ],
      face("sad", "sad"),
    ),
    surprised: animation(
      "surprised",
      [
        f("open", "calm", "c", "", 500),
        f("wide", "open", "l", "!", 110),
        f("wide", "open", "r", "!", 110),
        f("wide", "open", "l", "!!", 110),
        f("wide", "open", "r", "!!", 110),
        f("wide", "open", "c", "!!", 1100),
      ],
      face("wide", "open", "c", "!!"),
    ),
    angry: animation(
      "angry",
      [
        f("angry", "angry", "c", "", 500),
        f("angry", "angry", "l", "", 80),
        f("angry", "angry", "r", "", 80),
        f("angry", "angry", "l", "", 80),
        f("angry", "angry", "r", "", 80),
        f("angry", "angry", "c", " #", 500),
        f("angry", "angry", "c", " ##", 500),
      ],
      face("angry", "angry", "c", " #"),
    ),
    sleepy: animation(
      "sleepy",
      [
        f("sleep", "sleep", "c", "", 900),
        f("sleep", "sleep", "c", " z", 600),
        f("sleep", "sleep", "c", " zz", 600),
        f("sleep", "sleep", "c", " zzZ", 800),
      ],
      face("sleep", "sleep", "c", " zzZ"),
    ),
  };
}
