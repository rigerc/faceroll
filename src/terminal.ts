import type { Animation } from "./build";
import { createPlayer, type PlayerOptions } from "./player";

/** The small slice of a Node stream this module needs. */
export interface TerminalStream {
  write(chunk: string): unknown;
  isTTY?: boolean;
}

export interface TerminalOptions extends PlayerOptions {
  /** Defaults to `process.stdout`. */
  stream?: TerminalStream;
  /** Text printed before the face, for example `"pixel "`. */
  prefix?: string;
  /** Text printed after the face, for example `" thinking"`. */
  suffix?: string;
  /** Hide the cursor while animating. Default true. */
  hideCursor?: boolean;
}

export interface StopOptions {
  /** Erase the line instead of leaving the last frame. Default false. */
  clear?: boolean;
}

export interface TerminalPlayer {
  play(animation: Animation): void;
  stop(options?: StopOptions): void;
}

const CLEAR_LINE = "\r\x1b[K";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

/**
 * Animate faces on one terminal line. On a non-TTY stream (CI logs, pipes) it
 * prints the still face once per `play` call instead of redrawing.
 */
export function createTerminalPlayer(options: TerminalOptions = {}): TerminalPlayer {
  const stream: TerminalStream = options.stream ?? process.stdout;
  const prefix = options.prefix ?? "";
  const suffix = options.suffix ?? "";
  const hide = options.hideCursor ?? true;
  const isTTY = Boolean(stream.isTTY);
  let cursorHidden = false;

  const player = createPlayer(
    (frame) => {
      stream.write(CLEAR_LINE + prefix + frame.text + suffix);
    },
    {
      ...(options.setTimeout ? { setTimeout: options.setTimeout } : {}),
      ...(options.clearTimeout ? { clearTimeout: options.clearTimeout } : {}),
    },
  );

  return {
    play(animation) {
      if (!isTTY) {
        stream.write(prefix + animation.still + suffix + "\n");
        return;
      }
      if (hide && !cursorHidden) {
        stream.write(HIDE_CURSOR);
        cursorHidden = true;
      }
      player.play(animation);
    },
    stop(stopOptions = {}) {
      player.stop();
      if (!isTTY) return;
      if (stopOptions.clear) stream.write(CLEAR_LINE);
      else stream.write("\n");
      if (cursorHidden) {
        stream.write(SHOW_CURSOR);
        cursorHidden = false;
      }
    },
  };
}

/** Play one animation and get back a function that stops it. */
export function playInTerminal(animation: Animation, options: TerminalOptions = {}): (stop?: StopOptions) => void {
  const player = createTerminalPlayer(options);
  player.play(animation);
  return (stop) => player.stop(stop);
}
