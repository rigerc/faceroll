import type { Character, StateName } from "faceroll";

export interface FacerollFaceElement extends HTMLElement {
  /** A supplied character overrides the preset attribute; clear to use a preset. */
  character: Character | undefined;
  state: StateName;
  paused: boolean;
}

export declare const DEFAULT_FACE_TAG: "faceroll-face";

/** Registers the custom element once; returns false on the server or if already registered. */
export declare function defineFacerollElement(tagName?: string): boolean;

declare global {
  interface HTMLElementTagNameMap {
    "faceroll-face": FacerollFaceElement;
  }
}
