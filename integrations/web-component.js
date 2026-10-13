import { createPresetCharacter } from "../dist/index.js";
import { observeReducedMotion, startFaceAnimation } from "./shared.js";

export const DEFAULT_FACE_TAG = "faceroll-face";

/**
 * Register an opt-in native custom element. Calling this in SSR is safe.
 * Returns true only when it registers a new tag.
 */
export function defineFacerollElement(tagName = DEFAULT_FACE_TAG) {
  if (typeof HTMLElement === "undefined" || typeof customElements === "undefined") return false;
  if (customElements.get(tagName)) return false;

  class FacerollFaceElement extends HTMLElement {
    static get observedAttributes() {
      return ["preset", "name", "state", "paused"];
    }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = ":host{display:inline-block}span{display:inline-block;white-space:pre;font-family:monospace}";
      this._face = document.createElement("span");
      this._face.setAttribute("part", "face");
      this._face.setAttribute("role", "img");
      this._face.setAttribute("aria-live", "off");
      shadow.append(style, this._face);
      this._character = undefined;
      this._reduced = false;
      this._stop = () => {};
      this._unsubscribe = () => {};
    }

    get character() {
      return this._character;
    }

    set character(value) {
      this._character = value ?? undefined;
      this._render();
    }

    get state() {
      return this.getAttribute("state") ?? "idle";
    }

    set state(value) {
      this.setAttribute("state", value);
    }

    get paused() {
      return this.hasAttribute("paused");
    }

    set paused(value) {
      this.toggleAttribute("paused", Boolean(value));
    }

    connectedCallback() {
      this._unsubscribe = observeReducedMotion((reduced) => {
        this._reduced = reduced;
        this._render();
      });
    }

    disconnectedCallback() {
      this._unsubscribe();
      this._stop();
    }

    attributeChangedCallback() {
      this._render();
    }

    _render() {
      this._stop();
      const character = this._character ?? createPresetCharacter(
        this.getAttribute("preset") ?? "classic",
        { name: this.getAttribute("name") ?? "Agent" },
      );
      const state = this.state;
      const animation = character.animations[state];
      if (!animation) throw new RangeError("Unknown face state: " + String(state));

      this._face.setAttribute("aria-label", character.name + ": " + state);
      if (!this.isConnected) {
        this._face.textContent = animation.still;
        return;
      }
      this._stop = startFaceAnimation(
        animation,
        (text) => { this._face.textContent = text; },
        this.paused || this._reduced,
      );
    }
  }

  customElements.define(tagName, FacerollFaceElement);
  return true;
}
