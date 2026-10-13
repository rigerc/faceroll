import type { ComponentPropsWithoutRef, ReactElement } from "react";
import type { Character, StateName } from "faceroll";

export interface AgentFaceProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  character: Character;
  state?: StateName;
  /** Show the representative still frame instead of animating. */
  paused?: boolean;
}

/** Animated kaomoji with SSR-safe still rendering and reduced-motion support. */
export declare function AgentFace(props: AgentFaceProps): ReactElement;
