import { createPlayer } from "../dist/index.js";

/** Use the still frame unless animation is both requested and permitted. */
export function startFaceAnimation(animation, onText, stillOnly = false) {
  if (stillOnly) {
    onText(animation.still);
    return () => {};
  }

  const player = createPlayer((frame) => onText(frame.text));
  player.play(animation);
  return () => player.stop();
}

/** Subscribe to changes in the system reduced-motion preference. */
export function observeReducedMotion(onChange) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    onChange(false);
    return () => {};
  }

  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  onChange(query.matches);
  const listener = (event) => onChange(event.matches);
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }
  // Older Safari uses addListener/removeListener.
  if (typeof query.addListener === "function") {
    query.addListener(listener);
    return () => query.removeListener(listener);
  }
  return () => {};
}
