import type { StateInfo } from "./types";

export const STATES = [
  { id: "idle",        label: "Idle",        kind: "state",   use: "nothing is running, or you are greeting the user", say: "Ready when you are" },
  { id: "working",     label: "Working",     kind: "state",   use: "you are running a task",                           say: "Reading 12 files" },
  { id: "waiting",     label: "Waiting",     kind: "state",   use: "you need the user's input or approval",            say: "Need your approval to go on" },
  { id: "questioning", label: "Questioning", kind: "state",   use: "you are asking a clarifying question",             say: "Which branch should I use?" },
  { id: "happy",       label: "Happy",       kind: "emotion", use: "a task succeeded",                                 say: "Done, all tests pass" },
  { id: "sad",         label: "Sad",         kind: "emotion", use: "you could not do what was asked",                  say: "I couldn't fix that" },
  { id: "surprised",   label: "Surprised",   kind: "emotion", use: "something unexpected came up",                     say: "That file is huge" },
  { id: "angry",       label: "Angry",       kind: "emotion", use: "you are blocked by an error",                      say: "Blocked by a failing check" },
  { id: "sleepy",      label: "Sleepy",      kind: "emotion", use: "a long time has passed with no activity",          say: "Still here if you need me" },
] as const satisfies readonly StateInfo[];

export type StateName = (typeof STATES)[number]["id"];

export const STATE_NAMES: readonly StateName[] = STATES.map((s) => s.id);

export function getState(name: string): StateInfo<StateName> {
  const found = STATES.find((s) => s.id === name);
  if (!found) throw new RangeError(`Unknown state "${name}". Use one of: ${STATE_NAMES.join(", ")}`);
  return found;
}
