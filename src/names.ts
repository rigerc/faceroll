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

// 324 short, friendly first names. The first 81 entries are the original pool
// and keep their order so existing automatic names stay stable for those slots.
// Names may repeat across faces: identity comes from the parts, not the name.
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
  "Winnie", "Petal", "Peaches", "Dottie", "Nellie", "Nell", "Bessie", "Birdie",
  "Bibi", "Cici", "Coco", "Dot", "Fifi", "Gigi", "Lulu", "Lumi", "Mimi",
  "Nana", "Nella", "Pippa", "Pippi", "Riri", "Tilly", "Yumi", "Dodo", "Sunny",
  "Kiki", "Nala", "Suki", "Nova", "Kai", "Juno", "Kaya", "Kiro", "Rex", "Zion",
  "Onyx", "Echo", "Nyx", "Rune", "Vega", "Zephyr", "Jett", "Pax", "Rio",
  "Vero", "Wren", "Zora", "Zuri", "Nori", "Cyra", "Dax", "Koa", "Lune",
  "Orin", "Quin", "Zeno", "Jace", "Cato", "Celia", "Eden", "Eleanor", "Vera",
  "Vita", "Vito", "Wanda", "Wendy", "Yolanda", "Silas", "Simon", "Tessa", "Victor",
  "Vivian", "Walter", "Zoe", "Amara", "Amira", "Aiko", "Anya", "Bodhi", "Dani",
  "Emeka", "Elif", "Enzo", "Ines", "Ivo", "Kenji", "Leila", "Malik", "Mateo",
  "Nadia", "Nia", "Omar", "Priya", "Rafael", "Ravi", "Rosa", "Sanjay", "Sasha",
  "Selim", "Tarek", "Uma", "Yuki", "Zain", "Aarav", "Aditya", "Bjorn", "Camilo",
  "Fatima", "Hana", "Hiro", "Ingrid", "Jonas", "Kwame", "Lucia", "Mei", "Odette",
  "Paloma", "Rania", "Sven", "Talia", "Valeria", "Yusuf", "Aisha", "Bilal", "Chidi",
  "Dalia", "Eitan", "Farah", "Gita", "Hassan", "Imani", "Jamal", "Kofi", "Lina",
  "Milan", "Nabil", "Ola", "Pavel", "Remy", "Casey", "Skyler", "Sage", "Quinn",
  "Dakota", "Peyton", "Emery", "Finley", "Harper", "Kendall", "Logan", "Marley", "Noel",
  "Riley", "Sawyer", "Tatum", "Winter", "Ash", "Blue", "Bryn", "Cedar", "Frankie",
  "Gray", "Indigo", "Jules", "Linden", "Lennox", "Lark", "Micah", "Monroe", "Oak",
  "Rain", "River", "Shannon", "Shawn", "Sky", "Stevie", "Storm", "Eve", "Ila",
  "Pia", "Ria", "Wyn", "Zia", "Ari", "Bea", "Cleo", "Ena", "Gia",
  "Luz", "Sana", "Tia", "Aya", "Aria", "Blossom", "Brook", "Clover", "Dawn",
  "Fern", "Gale", "Grove", "Heath", "Isle", "Lake", "Leaf", "Luna", "Maple",
  "Marine", "Meadow", "Mist", "Reef", "Shell", "Snow", "Sol", "Spring", "Star",
  "Sun", "Surf", "Thistle", "Vale", "Wave", "Amber", "Bree", "Cass", "Dara",
  "Demi", "Elsa", "Faye", "Holly", "Indie", "Jade", "Joy", "Mango", "Peri",
  "Piper", "Romy", "Sable", "Tansy", "Willow", "Yara", "Lola", "Nina", "Tova",
] as const;

/**
 * A stable, single-word first name for each supported body/eyes/mouth combination.
 * The same parts always produce the same name; different faces may share one.
 */
export function nameForParts(parts: Parts): string {
  const body = BODY_IDS.indexOf(parts.body);
  const eyes = EYE_IDS.indexOf(parts.eyes);
  const mouth = MOUTH_IDS.indexOf(parts.mouth);
  if (body < 0 || eyes < 0 || mouth < 0) throw new RangeError("Parts have no allocated character name");
  const index = (body * EYE_IDS.length + eyes) * MOUTH_IDS.length + mouth;
  // A permutation spreads names across nearby faces. 137 is coprime to 6480, so
  // every slot is visited once and each of the 324 names is used exactly 20 times.
  const slot = (index * 137) % 6480;
  return FIRST_NAMES[slot % FIRST_NAMES.length] as string;
}
