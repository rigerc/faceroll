import { describe, expect, it } from "vitest";
import {
  BODIES,
  EYES,
  MOUTHS,
  STATES,
  STATE_NAMES,
  cellWidth,
  createCharacter,
  createFaceroll,
  createPlayer,
  deserialize,
  frameAt,
  frameIndexAt,
  listParts,
  partPool,
  rerollPart,
  rollCharacter,
  seededRng,
  serialize,
  toMarkdown,
  toNodeSource,
  toSystemPrompt,
  type Animation,
  type Frame,
} from "../src/index";
import { createTerminalPlayer } from "../src/terminal";

describe("rollCharacter", () => {
  it("is deterministic for a seed", () => {
    const a = rollCharacter({ seed: "pixel" });
    const b = rollCharacter({ seed: "pixel" });
    expect(a.parts).toEqual(b.parts);
    expect(a.animations.idle.still).toBe(b.animations.idle.still);
    expect(a.seed).toBe("pixel");
  });

  it("gives different characters for different seeds", () => {
    const stills = new Set(Array.from({ length: 40 }, (_, i) => rollCharacter({ seed: `s${i}` }).animations.idle.still));
    expect(stills.size).toBeGreaterThan(10);
  });

  it("generates a seed when none is given, and that seed reproduces the character", () => {
    const a = rollCharacter();
    expect(a.seed).toMatch(/^[0-9a-z]{6}$/);
    expect(rollCharacter({ seed: a.seed as string }).parts).toEqual(a.parts);
  });

  it("does not report a seed when you pass your own rng", () => {
    const c = rollCharacter({ rng: seededRng(1) });
    expect(c.seed).toBeUndefined();
  });

  it("keeps locked parts fixed", () => {
    for (let i = 0; i < 25; i++) {
      const c = rollCharacter({ seed: i, lock: { body: "wave", eyes: "ring" } });
      expect(c.parts.body).toBe("wave");
      expect(c.parts.eyes).toBe("ring");
    }
  });

  it("respects the vibe", () => {
    for (const vibe of ["cute", "cool", "weird"] as const) {
      for (let i = 0; i < 30; i++) {
        const c = rollCharacter({ seed: `${vibe}${i}`, vibe });
        expect(BODIES.find((b) => b.id === c.parts.body)?.vibes).toContain(vibe);
        expect(EYES.find((e) => e.id === c.parts.eyes)?.vibes).toContain(vibe);
        // a bear body forces its own mouth, so check the rolled mouth only for other bodies
        if (c.parts.body !== "bear") expect(MOUTHS.find((m) => m.id === c.parts.mouth)?.vibes).toContain(vibe);
      }
    }
  });

  it("has a non-empty pool for every part and vibe", () => {
    for (const kind of ["body", "eyes", "mouth"] as const) {
      for (const vibe of ["any", "cute", "cool", "weird"] as const) {
        expect(partPool(kind, vibe).length).toBeGreaterThan(0);
      }
    }
  });

  it("names the character", () => {
    expect(rollCharacter({ seed: 1, name: "  Pixel " }).name).toBe("Pixel");
    expect(rollCharacter({ seed: 1 }).name).toBe("Agent");
  });
});

describe("createCharacter", () => {
  it("rejects unknown parts with a helpful message", () => {
    expect(() => createCharacter({ body: "nope" as never, eyes: "dot", mouth: "w" })).toThrow(/Unknown body "nope"/);
    expect(() => createCharacter({ body: "round", eyes: "nope" as never, mouth: "w" })).toThrow(/Unknown eyes/);
    expect(() => createCharacter({ body: "round", eyes: "dot", mouth: "nope" as never })).toThrow(/Unknown mouth/);
  });

  it("renders the bear mouth while preserving preferred mouth selection", () => {
    const c = createCharacter({ body: "bear", eyes: "dot", mouth: "w" });
    expect(c.parts.mouth).toBe("w");
    expect(c.animations.idle.still).toBe("ʕ•ᴥ•ʔ");
    expect(createCharacter({ ...c.parts, body: "round" }).animations.idle.still).toBe("(•ω•)");
  });

  it("builds the classic idle face", () => {
    const c = createCharacter({ body: "round", eyes: "round", mouth: "w" });
    expect(c.animations.idle.still).toBe("(◕ω◕)");
  });

  it("is frozen", () => {
    const c = rollCharacter({ seed: 3 });
    expect(Object.isFrozen(c)).toBe(true);
    expect(Object.isFrozen(c.animations.idle.frames)).toBe(true);
    expect(Object.isFrozen(c.animations.idle.frames[0])).toBe(true);
    expect(Object.isFrozen(c.animations.idle)).toBe(true);
    expect(Object.isFrozen(c.animations)).toBe(true);
  });
});

describe("rerollPart", () => {
  it("changes only the chosen part", () => {
    const base = createCharacter({ body: "round", eyes: "dot", mouth: "w" }, { name: "Pixel" });
    for (let i = 0; i < 20; i++) {
      const next = rerollPart(base, "eyes", { seed: i });
      expect(next.parts.body).toBe("round");
      expect(next.parts.mouth).toBe("w");
      expect(next.parts.eyes).not.toBe("dot");
      expect(next.name).toBe("Pixel");
    }
  });
});

describe("animations", () => {
  const all = BODIES.flatMap((body) =>
    EYES.flatMap((eyes) => MOUTHS.map((mouth) => createCharacter({ body: body.id, eyes: eyes.id, mouth: mouth.id }))),
  );

  it("defines every state for every combination", () => {
    for (const c of all) {
      for (const name of STATE_NAMES) {
        const a = c.animations[name];
        expect(a.name).toBe(name);
        expect(a.frames.length).toBeGreaterThan(0);
        expect(a.still.length).toBeGreaterThan(0);
        for (const f of a.frames) {
          expect(f.text.length).toBeGreaterThan(0);
          expect(f.ms).toBeGreaterThan(0);
        }
        expect(a.duration).toBe(a.frames.reduce((s, f) => s + f.ms, 0));
      }
    }
  });

  it("keeps every frame compact", () => {
    let widest = 0;
    for (const c of all) for (const name of STATE_NAMES) widest = Math.max(widest, c.animations[name].width);
    expect(widest).toBeLessThanOrEqual(16);
  });

  it("never uses a frame that is only whitespace", () => {
    for (const c of all) for (const name of STATE_NAMES) for (const f of c.animations[name].frames) expect(f.text.trim()).not.toBe("");
  });

  it("keeps the body on both ends of every frame", () => {
    const c = createCharacter({ body: "wave", eyes: "dot", mouth: "w" });
    for (const name of STATE_NAMES) {
      for (const f of c.animations[name].frames) {
        expect(f.text.startsWith("ヽ(")).toBe(true);
        expect(/\)ﾉ[ .?!#♪♫…zZ]*$/.test(f.text)).toBe(true);
      }
    }
  });

  it("gives states their signature cues", () => {
    const c = createCharacter({ body: "round", eyes: "dot", mouth: "w" });
    expect(c.animations.working.still).toContain("...");
    expect(c.animations.waiting.still).toContain("...");
    expect(c.animations.questioning.still).toContain("?");
    expect(c.animations.sleepy.still).toContain("zzZ");
    expect(c.animations.surprised.still).toContain("!!");
    expect(c.animations.idle.frames.some((f) => f.text === "(-ω-)")).toBe(true); // blink
  });
});

describe("cellWidth", () => {
  it("counts narrow, wide and combining characters", () => {
    expect(cellWidth("abc")).toBe(3);
    expect(cellWidth("(◕ω◕)")).toBe(5);
    expect(cellWidth("ヽ(")).toBe(3);
    expect(cellWidth(")ﾉ")).toBe(2);
    expect(cellWidth("｀")).toBe(2);
    expect(cellWidth("e\u0301")).toBe(1);
    expect(cellWidth("")).toBe(0);
  });
});

describe("frameAt", () => {
  const anim: Animation = {
    name: "idle",
    still: "a",
    frames: [
      { text: "a", ms: 100 },
      { text: "b", ms: 50 },
      { text: "c", ms: 25 },
    ],
    duration: 175,
    width: 1,
  };
  it("picks the frame for a time and loops", () => {
    expect(frameAt(anim, 0).text).toBe("a");
    expect(frameAt(anim, 99).text).toBe("a");
    expect(frameAt(anim, 100).text).toBe("b");
    expect(frameAt(anim, 149).text).toBe("b");
    expect(frameAt(anim, 150).text).toBe("c");
    expect(frameAt(anim, 175).text).toBe("a");
    expect(frameIndexAt(anim, 175 * 10 + 120)).toBe(1);
    expect(frameIndexAt(anim, -10)).toBe(2);
  });
});

describe("createPlayer", () => {
  function fakeTimers() {
    let now = 0;
    let nextId = 1;
    const queue = new Map<number, { at: number; fn: () => void }>();
    return {
      setTimeout: (fn: () => void, ms: number) => {
        const id = nextId++;
        queue.set(id, { at: now + ms, fn });
        return id as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: (t: ReturnType<typeof setTimeout>) => {
        queue.delete(t as unknown as number);
      },
      advance(ms: number) {
        const end = now + ms;
        for (;;) {
          const due = [...queue.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
          if (!due) break;
          queue.delete(due[0]);
          now = due[1].at;
          due[1].fn();
        }
        now = end;
      },
      pending: () => queue.size,
    };
  }

  const anim = createCharacter({ body: "round", eyes: "dot", mouth: "w" }).animations.waiting;

  it("shows frame 0 immediately and then follows frame durations", () => {
    const timers = fakeTimers();
    const seen: string[] = [];
    const player = createPlayer((f: Frame) => seen.push(f.text), timers);
    player.play(anim);
    expect(seen).toEqual([anim.frames[0]!.text]);
    timers.advance(anim.frames[0]!.ms);
    expect(seen).toHaveLength(2);
    timers.advance(anim.duration * 2);
    expect(seen.length).toBeGreaterThan(anim.frames.length * 2);
    expect(seen[anim.frames.length]).toBe(anim.frames[0]!.text); // looped
  });

  it("stops cleanly and restarts when the animation changes", () => {
    const timers = fakeTimers();
    const seen: string[] = [];
    const player = createPlayer((f) => seen.push(f.text), timers);
    player.play(anim);
    expect(player.playing).toBe(true);
    player.stop();
    expect(player.playing).toBe(false);
    expect(timers.pending()).toBe(0);
    const count = seen.length;
    timers.advance(10_000);
    expect(seen.length).toBe(count);

    const idle = createCharacter({ body: "round", eyes: "dot", mouth: "w" }).animations.idle;
    player.play(anim);
    player.play(idle);
    expect(timers.pending()).toBe(1);
    expect(player.current).toBe(idle);
    expect(seen[seen.length - 1]).toBe(idle.frames[0]!.text);
  });
});

describe("createTerminalPlayer", () => {
  const anim = createCharacter({ body: "round", eyes: "dot", mouth: "w" }).animations.idle;

  it("prints one still line on a non-TTY stream", () => {
    const out: string[] = [];
    const p = createTerminalPlayer({ stream: { write: (s) => out.push(s), isTTY: false }, prefix: "> " });
    p.play(anim);
    p.stop();
    expect(out).toEqual(["> " + anim.still + "\n"]);
  });

  it("redraws one line on a TTY and restores the cursor", () => {
    const out: string[] = [];
    const timers = { setTimeout: () => 1 as unknown as ReturnType<typeof setTimeout>, clearTimeout: () => {} };
    const p = createTerminalPlayer({ stream: { write: (s) => out.push(s), isTTY: true }, ...timers });
    p.play(anim);
    expect(out[0]).toBe("\x1b[?25l");
    expect(out[1]).toBe("\r\x1b[K" + anim.frames[0]!.text);
    p.stop({ clear: true });
    expect(out.slice(-2)).toEqual(["\r\x1b[K", "\x1b[?25h"]);
  });
});

describe("exporters", () => {
  const c = createCharacter({ body: "bear", eyes: "dot", mouth: "bear" }, { name: "Pixel", seed: "abc" });

  it("writes a system prompt with every state", () => {
    const text = toSystemPrompt(c);
    expect(text).toContain("You are Pixel.");
    for (const s of STATES) expect(text).toContain(`- ${s.label} (${s.use}): ${c.animations[s.id].still}`);
    expect(text).toContain("Never put a face inside code");
  });

  it("can limit the prompt to some states", () => {
    const text = toSystemPrompt(c, { states: ["idle", "working"] });
    expect(text).toContain("- Idle");
    expect(text).toContain("- Working");
    expect(text).not.toContain("- Happy");
    expect(text).not.toContain("Emotions");
  });

  it("writes a markdown table", () => {
    const md = toMarkdown(c);
    expect(md.startsWith("### Pixel")).toBe(true);
    expect(md.split("\n").filter((l) => l.startsWith("| ")).length).toBe(STATES.length + 1);
  });

  it("round-trips through JSON", () => {
    const data = JSON.parse(JSON.stringify(serialize(c)));
    expect(data.animations.idle.frames[0]).toEqual([c.animations.idle.frames[0]!.text, c.animations.idle.frames[0]!.ms]);
    const back = deserialize(data);
    expect(back.parts).toEqual(c.parts);
    expect(back.name).toBe("Pixel");
    expect(back.seed).toBe("abc");
    expect(back.animations.sleepy.still).toBe(c.animations.sleepy.still);
  });
});

describe("listParts", () => {
  it("matches the tables", () => {
    const p = listParts();
    expect(p.body).toHaveLength(BODIES.length);
    expect(p.eyes).toHaveLength(EYES.length);
    expect(p.mouth).toHaveLength(MOUTHS.length);
  });
});


describe("stateful editor", () => {
  it("preserves selected mouths across bear body changes and JSON exports", () => {
    const editor = createFaceroll({ name: "Pixel", parts: { body: "bear", eyes: "dot", mouth: "w" } });
    expect(editor.getParts().mouth).toBe("w");
    expect(editor.getStill("idle")).toBe("ʕ•ᴥ•ʔ");
    expect(JSON.parse(editor.export("json")).parts.mouth).toBe("w");
    editor.setParts({ body: "round" });
    expect(editor.getStill("idle")).toBe("(•ω•)");
  });

  it("locks individual parts and skips locked categories when rolling", () => {
    const editor = createFaceroll({ seed: "lock", vibe: "cute" });
    editor.setLocked("body", true);
    editor.setLocked("mouth", true);
    const first = editor.getParts();
    expect(editor.reroll("body")).toBe(false);
    expect(editor.roll()).toBe(true);
    const second = editor.getParts();
    expect(second.body).toBe(first.body);
    expect(second.mouth).toBe(first.mouth);
    expect(second.eyes).not.toBe(first.eyes);
    expect(editor.historyLength).toBe(1);
    editor.setLocked("eyes", true);
    expect(editor.roll()).toBe(false);
    expect(editor.historyLength).toBe(1);
    expect(editor.undo()).toBe(true);
    expect(editor.getParts()).toEqual(first);
    expect(editor.undo()).toBe(false);
  });

  it("uses seeded repeatable sequences across rolls and rerolls", () => {
    const a = createFaceroll({ seed: "same", vibe: "weird" });
    const b = createFaceroll({ seed: "same", vibe: "weird" });
    for (let i = 0; i < 15; i++) {
      expect(a.roll()).toBe(true);
      expect(b.roll()).toBe(true);
      expect(a.getParts()).toEqual(b.getParts());
      expect(a.reroll("mouth")).toBe(true);
      expect(b.reroll("mouth")).toBe(true);
      expect(a.getParts()).toEqual(b.getParts());
    }
  });

  it("retains the last 30 successful snapshots by default", () => {
    const editor = createFaceroll({ seed: 123 });
    for (let i = 0; i < 35; i++) expect(editor.reroll("body")).toBe(true);
    expect(editor.historyLength).toBe(30);
    for (let i = 0; i < 30; i++) expect(editor.undo()).toBe(true);
    expect(editor.undo()).toBe(false);
  });

  it("supports custom history limits and no history", () => {
    const editor = createFaceroll({ seed: 4, historyLimit: 2 });
    editor.roll(); editor.roll(); editor.roll();
    expect(editor.historyLength).toBe(2);
    expect(editor.undo()).toBe(true);
    expect(editor.undo()).toBe(true);
    expect(editor.undo()).toBe(false);
    expect(() => createFaceroll({ historyLimit: -1 })).toThrow(RangeError);
    const noUndo = createFaceroll({ historyLimit: 0 });
    noUndo.roll();
    expect(noUndo.undo()).toBe(false);
  });

  it("cannot partially modify parts or history on invalid random values", () => {
    let count = 0;
    const editor = createFaceroll({ rng: () => ++count === 2 ? NaN : 0.5 });
    const old = editor.getConfig();
    expect(() => editor.roll()).toThrow(/rng must return/);
    expect(editor.getConfig()).toEqual(old);
    expect(editor.historyLength).toBe(0);
  });

  it("validates parts, vibe, and category input", () => {
    const editor = createFaceroll();
    expect(() => editor.setVibe("unreal" as never)).toThrow(RangeError);
    expect(() => editor.reroll("ear" as never)).toThrow(RangeError);
    expect(() => editor.setLocked("ear" as never, true)).toThrow(RangeError);
    expect(() => editor.setParts({ mouth: "invalid" as never })).toThrow(RangeError);
    expect(editor.getStill("idle")).toBe("(•ω•)");
  });

  it("exports prompt, markdown, JSON and standalone Node source", () => {
    const editor = createFaceroll({ name: "Pixel", seed: "example" });
    expect(editor.export("prompt")).toBe(toSystemPrompt(editor.getCharacter()));
    expect(editor.export("markdown")).toBe(toMarkdown(editor.getCharacter()));
    expect(editor.export("json")).toContain('"animations"');
    expect(editor.export("node")).toBe(toNodeSource(editor.getCharacter()));
    expect(() => editor.export("yaml" as never)).toThrow(RangeError);
    expect(editor.getFrameAt("idle", 0)).toBe(editor.getAnimation("idle").frames[0]?.text);
  });
});

describe("node source output", () => {
  it("generates executable self-contained JavaScript with the original frame tuples", async () => {
    const { runInNewContext } = await import("node:vm");
    const character = createCharacter({ body: "bear", eyes: "dot", mouth: "w" }, { name: "Pixel" });
    const src = toNodeSource(character);
    expect(src).toContain('"working"');
    const messages: string[] = [];
    let task: (() => void) | undefined;
    let canceled = false;
    const sandbox = {
      process: { stdout: { write: (text: string) => messages.push(text) } },
      setTimeout: (fn: () => void, ms: number) => { expect(ms).toBe(150); task = fn; return 1; },
      clearTimeout: () => { canceled = true; },
    };
    const stop = runInNewContext(src + '\nplay("working")', sandbox) as () => void;
    expect(messages[0]).toBe("\r\x1b[K" + character.animations.working.frames[0]?.text);
    task?.();
    expect(messages[1]).toBe("\r\x1b[K" + character.animations.working.frames[1]?.text);
    stop();
    expect(canceled).toBe(true);
    expect(messages[messages.length - 1]).toBe("\r\x1b[K");
  });
});
