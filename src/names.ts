import type { Parts } from "./parts";

/** Whether a character follows its parts' name or keeps a user-supplied name. */
export type NameMode = "auto" | "custom";

// These lists and their ordering define persistent identities. Do not reorder,
// rename or remove entries. New parts need a new allocation outside this block.
const BODY_IDS = [
  "round", "bear", "wave", "hug", "cloud", "bot", "shrug", "flex", "angle",
  "curly", "owl", "square", "double", "flower", "spark", "cat", "bunny",
  "ghost", "tentacle", "robot", "shield", "arms", "dancer", "alien", "diamond",
  "frame", "bat",
] as const;
const EYE_IDS = [
  "dot", "round", "tiny", "smug", "box", "ring", "sparkle", "star", "wink",
  "sleepy", "pixel", "cross", "teary", "triangle", "shy", "cat",
] as const;
const MOUTH_IDS = [
  "w", "three", "bear", "plain", "dead", "smirk", "grin", "tiny", "cat",
  "fang", "pixel", "oval", "tongue", "heart", "scream",
] as const;

const FIRST_NAMES = [
  "Milo", "Lucy", "Theo", "Daisy", "Finn", "Lily", "Leo", "Ella", "Ollie",
  "Ruby", "Noah", "Sophie", "Oscar", "Rosie", "Teddy", "Alice", "Archie",
  "Molly", "Charlie", "Clara", "Jamie", "Ivy", "Felix", "Nora", "Ben",
  "Maisie", "Henry", "Poppy", "Jude", "Emma", "Louie", "Evie", "Max",
  "Grace", "Sam", "Hazel", "Toby", "Chloe", "Eli", "Mia", "Hugo",
  "Ada", "Luca", "Millie", "Jack", "Flora", "Liam", "Willa", "Arlo",
  "Isla", "Jasper", "Mabel", "Alex", "Olive", "Robin", "Elsie", "Tom",
  "Annie", "Rowan", "Bella", "George", "Edie", "Miles", "Cora", "Alfie",
  "Freya", "Oliver", "June", "Elliot", "Violet", "Rory", "Stella", "Emil",
  "Lottie", "Louis", "Iris", "Sebastian", "Eliza", "Arthur", "Matilda", "Owen",
] as const;
const LAST_NAMES = [
  "Bennett", "Ellis", "Brooks", "Morgan", "Taylor", "Parker", "Reed", "Hayes",
  "Bell", "Hart", "Lane", "Miller", "Cooper", "Bailey", "Foster", "Gray",
  "Green", "Hill", "Ward", "Wood", "Clark", "Brown", "Smith", "Jones",
  "Wilson", "Davis", "Evans", "Thomas", "White", "Walker", "Hall", "Young",
  "Allen", "Wright", "Scott", "King", "Baker", "Adams", "Nelson", "Carter",
  "Mitchell", "Roberts", "Turner", "Phillips", "Campbell", "Lewis", "Harris", "Moore",
  "Martin", "Lee", "Grant", "Blake", "Rose", "Fox", "Wells", "Stone",
  "Price", "Cole", "West", "Dean", "Shaw", "Ford", "Hunt", "Palmer",
  "Mason", "Porter", "Harper", "Fisher", "Spencer", "Russell", "Graham", "Walsh",
  "Reid", "Murphy", "Kelly", "Quinn", "Sullivan", "Collins", "Stewart", "Watson",
] as const;

/** A distinct, stable human name for each supported body/eyes/mouth combination. */
export function nameForParts(parts: Parts): string {
  const body = BODY_IDS.indexOf(parts.body);
  const eyes = EYE_IDS.indexOf(parts.eyes);
  const mouth = MOUTH_IDS.indexOf(parts.mouth);
  if (body < 0 || eyes < 0 || mouth < 0) throw new RangeError("Parts have no allocated character name");
  const index = (body * EYE_IDS.length + eyes) * MOUTH_IDS.length + mouth;
  // A permutation spreads both first names and surnames across nearby faces.
  // 137 is coprime to 6480, so this cannot produce collisions.
  const slot = (index * 137) % 6480;
  return `${FIRST_NAMES[slot % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(slot / FIRST_NAMES.length)]}`;
}
