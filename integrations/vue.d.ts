import type { DefineComponent } from "vue";
import type { Character, StateName } from "faceroll";

export interface AgentFaceProps {
  character: Character;
  state?: StateName;
  /** Show the representative still frame instead of animating. */
  paused?: boolean;
}

/** Vue 3 component with SSR-safe still rendering and reduced-motion support. */
export declare const AgentFace: DefineComponent<AgentFaceProps>;
