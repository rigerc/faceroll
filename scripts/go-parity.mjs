// Cross-language parity harness: compare the Go CLI with the TypeScript CLI.
//
// Usage:
//   node scripts/go-parity.mjs            # builds the Go binary, then compares
//   node scripts/go-parity.mjs --no-build # use GO_BIN or go/faceroll
//
// Character data, seeds, names, presets, children and exporters must match
// byte-for-byte. The three intentional CLI fixes are asserted separately.
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const goDir = resolve(root, "go");
const tsCLI = resolve(root, "dist/cli.js");
const noBuild = process.argv.includes("--no-build");
const goBin = process.env.GO_BIN ?? join(mkdtempSync(join(tmpdir(), "faceroll-go-")), "faceroll");

if (!noBuild) {
  const build = spawnSync("go", ["build", "-o", goBin, "./cmd/faceroll"], { cwd: goDir, encoding: "utf8" });
  if (build.status !== 0) {
    process.stderr.write(build.stderr || build.stdout);
    process.exit(1);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 30_000 });
  if (result.error) throw result.error;
  return { code: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const ts = (args) => run(process.execPath, [tsCLI, ...args]);
const go = (args) => run(goBin, args);

let checks = 0;
const failures = [];

function fail(message) {
  failures.push(message);
}

function compare(args, { errorOnly = false } = {}) {
  checks++;
  const label = ["faceroll", ...args].join(" ");
  const a = ts(args);
  const b = go(args);
  if (a.code !== b.code) {
    fail(`${label}: exit ${a.code} (TS) vs ${b.code} (Go)`);
    return;
  }
  if (errorOnly) {
    const firstLine = (value) => value.split("\n")[0];
    if (firstLine(a.stderr) !== firstLine(b.stderr)) {
      fail(`${label}: stderr\n  TS: ${firstLine(a.stderr)}\n  Go: ${firstLine(b.stderr)}`);
    }
    return;
  }
  if (a.stdout !== b.stdout) fail(`${label}: stdout differs\n--- TS ---\n${a.stdout}\n--- Go ---\n${b.stdout}`);
  if (a.stderr !== b.stderr) fail(`${label}: stderr differs\n--- TS ---\n${a.stderr}\n--- Go ---\n${b.stderr}`);
}

const comparisons = [
  ["roll", "--seed", "pixel"],
  ["roll", "--seed", "pixel", "--format", "prompt"],
  ["roll", "--seed", "pixel", "--format", "markdown"],
  ["roll", "--seed", "pixel", "--format", "json"],
  ["roll", "--seed", "pixel", "--format", "node"],
  ["roll", "--seed", "ʕ•ᴥ•ʔ", "--format", "json"],
  ["roll", "--seed", "🎲", "--format", "text"],
  ["roll", "--vibe", "cute", "--seed", "7"],
  ["roll", "--name", "Pixel & Co", "--seed", "1"],
  ["roll", "--seed", "x", "--body", "bear", "--eyes", "dot", "--mouth", "w"],
  ["roll", "--preset", "kitty", "--format", "json"],
  ["roll", "--preset", "kitty", "--format", "prompt"],
  ["roll", "--preset", "kitty", "--format", "markdown"],
  ["roll", "--preset", "kitty", "--format", "node"],
  ["roll", "--preset", "kitty", "--seed", "family", "--format", "json"],
  ["roll", "--preset", "bunny", "--body", "round", "--format", "json"],
  ["children", "--preset", "kitty", "--seed", "family", "--count", "5"],
  ["children", "--preset", "kitty", "--seed", "family", "--index", "2", "--format", "json"],
  ["children", "--seed", "family", "--count", "3", "--format", "json"],
  ["children", "--seed", "family", "--count", "0"],
  ["states"],
  ["parts"],
  ["presets"],
  ["play", "idle", "--seed", "pixel", "--duration", "0"],
  ["play", "dead", "--seed", "pixel", "--duration", "0"],
];

for (const args of comparisons) compare(args);

const errorComparisons = [
  ["roll", "--vibe", "nope"],
  ["roll", "--body", "nope"],
  ["play", "nope"],
  ["children", "--preset", "kitty", "--count", "9999"],
  ["children", "--count", "2", "--index", "0"],
  ["nope"],
  ["roll", "--seed"],
  ["roll", "--format", "nope"],
];

for (const args of errorComparisons) compare(args, { errorOnly: true });

// Intentional deviations from the TypeScript CLI.
function expectGo(args, predicate, description) {
  checks++;
  const result = go(args);
  if (!predicate(result)) fail(`${description}\n${JSON.stringify(result, null, 2)}`);
}

expectGo(
  ["roll", "--preset", "kitty"],
  (result) => result.code === 0 && !result.stdout.includes("undefined") && !result.stdout.includes("seed "),
  "preset text output must not print an undefined seed",
);
expectGo(
  ["roll", "--nmae", "Pixel"],
  (result) => result.code === 2 && result.stderr.split("\n")[0] === "faceroll: unknown flag --nmae",
  "unknown flags must exit 2 with a clear message",
);
expectGo(
  ["play", "idle", "--duration", "1e3"],
  (result) => result.code === 2 && result.stderr.includes("--duration must be a non-negative integer"),
  "numeric flags must reject non-integer input",
);
expectGo(
  ["children", "--count", "2.5"],
  (result) => result.code === 2 && result.stderr.includes("--count must be a non-negative integer"),
  "count must reject non-integer input",
);

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s) out of ${checks} checks:\n`);
  for (const failure of failures) console.error(failure + "\n");
  process.exit(1);
}
console.log(`go parity: ${checks} checks passed`);
