import type { Animation } from "./build";
import type { Frame } from "./types";

/** Index of the frame showing `elapsedMs` into a looping animation. */
export function frameIndexAt(animation: Animation, elapsedMs: number): number {
  const { frames, duration } = animation;
  if (frames.length === 0 || duration <= 0) return 0;
  let t = ((elapsedMs % duration) + duration) % duration;
  for (let i = 0; i < frames.length; i++) {
    const ms = (frames[i] as Frame).ms;
    if (t < ms) return i;
    t -= ms;
  }
  return frames.length - 1;
}

/** The frame showing `elapsedMs` into a looping animation. */
export function frameAt(animation: Animation, elapsedMs: number): Frame {
  return animation.frames[frameIndexAt(animation, elapsedMs)] as Frame;
}

type Timer = ReturnType<typeof setTimeout>;

export interface PlayerOptions {
  /** Swap in fake timers for tests. Defaults to the global ones. */
  setTimeout?: (fn: () => void, ms: number) => Timer;
  clearTimeout?: (timer: Timer) => void;
}

export interface Player {
  /** Start looping an animation. Switching animations restarts from frame 0. */
  play(animation: Animation): void;
  /** Stop on the current frame. */
  stop(): void;
  readonly playing: boolean;
  readonly current: Animation | undefined;
}

/**
 * A timer-driven player that works in browsers and Node.
 * `onFrame` runs once per frame, including the first one, right when `play` is called.
 */
export function createPlayer(
  onFrame: (frame: Frame, index: number, animation: Animation) => void,
  options: PlayerOptions = {},
): Player {
  const set = options.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
  const clear = options.clearTimeout ?? ((t) => clearTimeout(t));
  let timer: Timer | undefined;
  let current: Animation | undefined;
  let index = 0;

  const tick = (): void => {
    if (!current) return;
    const frame = current.frames[index] as Frame;
    onFrame(frame, index, current);
    index = (index + 1) % current.frames.length;
    timer = set(tick, frame.ms);
  };

  const stop = (): void => {
    if (timer !== undefined) clear(timer);
    timer = undefined;
    current = undefined;
  };

  return {
    play(animation) {
      if (timer !== undefined) clear(timer);
      timer = undefined;
      current = animation;
      index = 0;
      if (animation.frames.length > 0) tick();
    },
    stop,
    get playing() {
      return timer !== undefined;
    },
    get current() {
      return current;
    },
  };
}
