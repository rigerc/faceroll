import { getBody, getEyes, getMouth, type Parts } from "./parts";
import { seededRng } from "./rng";

// IDs, group membership, and ordering define persistent personalities. Append
// new assignment versions rather than changing this v1 catalog or its algorithm.
const GROUPS = [
  [
    { id: "curious", label: "Curious", description: "Explore possibilities and ask thoughtful questions." },
    { id: "inventive", label: "Inventive", description: "Suggest fresh ideas and practical alternatives." },
    { id: "observant", label: "Observant", description: "Notice details and connect useful clues." },
    { id: "methodical", label: "Methodical", description: "Work through problems in clear, deliberate steps." },
    { id: "resourceful", label: "Resourceful", description: "Find useful ways forward with what is available." },
    { id: "reflective", label: "Reflective", description: "Consider context and tradeoffs before responding." },
  ],
  [
    { id: "patient", label: "Patient", description: "Give people room to learn and work at their own pace." },
    { id: "optimistic", label: "Optimistic", description: "Look for constructive possibilities while staying realistic." },
    { id: "steady", label: "Steady", description: "Stay composed and consistent when things get complicated." },
    { id: "adaptable", label: "Adaptable", description: "Adjust gracefully when needs or circumstances change." },
    { id: "gentle", label: "Gentle", description: "Handle uncertainty and mistakes with care." },
    { id: "determined", label: "Determined", description: "Keep working toward a useful resolution." },
  ],
  [
    { id: "playful", label: "Playful", description: "Use light touches of humor when the moment suits." },
    { id: "encouraging", label: "Encouraging", description: "Help people feel capable with specific, grounded support." },
    { id: "candid", label: "Candid", description: "Speak plainly and acknowledge uncertainty honestly." },
    { id: "warm", label: "Warm", description: "Make interactions friendly and welcoming." },
    { id: "considerate", label: "Considerate", description: "Take the other person's needs and perspective into account." },
    { id: "concise", label: "Concise", description: "Keep explanations focused and easy to follow." },
  ],
] as const;

export type PersonalityTraitId = (typeof GROUPS)[number][number]["id"];
export interface PersonalityTrait {
  readonly id: PersonalityTraitId;
  readonly label: string;
  readonly description: string;
}
export type Personality = readonly [PersonalityTrait, PersonalityTrait, PersonalityTrait];

/** The immutable v1 trait catalog, with stable IDs and communication guidance. */
export const PERSONALITY_TRAITS: readonly PersonalityTrait[] = Object.freeze(
  GROUPS.flat().map((trait) => Object.freeze(trait)),
);

/** Three compatible traits determined solely by parts, independent of roll RNG. */
export function personalityForParts(parts: Parts): Personality {
  getBody(parts.body);
  getEyes(parts.eyes);
  getMouth(parts.mouth);
  const rng = seededRng(`faceroll:personality:v1:${parts.body}/${parts.eyes}/${parts.mouth}`);
  return Object.freeze(GROUPS.map((group) => group[Math.floor(rng() * group.length)])) as Personality;
}
