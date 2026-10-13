import { createElement, useEffect, useState } from "react";
import { observeReducedMotion, startFaceAnimation } from "./shared.js";

/**
 * A React face that follows the selected agent state.
 * Animation runs in an effect, so server rendering emits a stable still face.
 */
export function AgentFace({ character, state = "idle", paused = false, style, ...attributes }) {
  const animation = character.animations[state];
  if (!animation) throw new RangeError("Unknown face state: " + String(state));

  const [text, setText] = useState(animation.still);

  useEffect(() => {
    let stop = () => {};
    const unsubscribe = observeReducedMotion((reduced) => {
      stop();
      stop = startFaceAnimation(animation, setText, paused || reduced);
    });
    return () => {
      unsubscribe();
      stop();
    };
  }, [animation, paused]);

  return createElement(
    "span",
    {
      ...attributes,
      role: attributes.role ?? "img",
      "aria-label": attributes["aria-label"] ?? character.name + ": " + state,
      "aria-live": attributes["aria-live"] ?? "off",
      style: { display: "inline-block", whiteSpace: "pre", ...style },
    },
    text,
  );
}
