/**
 * Reports gzip size for each built entrypoint and fails when growth over the
 * recorded baseline exceeds the budget. No dependencies: Node's zlib only.
 *
 *   node scripts/check-size.mjs            # compare against scripts/size-baseline.json
 *   node scripts/check-size.mjs --write    # record the current build as the new baseline
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const baselinePath = join(root, "scripts/size-baseline.json");
// The name pool is bundled into every entrypoint that reaches nameForParts().
const ENTRYPOINTS = ["dist/index.js", "dist/index.cjs", "dist/cli.js", "dist/terminal.js"];
const PREFERRED_BUDGET = 1024;
const HARD_BUDGET = 2048;

const missing = ENTRYPOINTS.filter(file => !existsSync(join(root, file)));
if (missing.length) {
  console.error(`Missing build output: ${missing.join(", ")}. Run npm run build first.`);
  process.exit(1);
}

const sizes = Object.fromEntries(ENTRYPOINTS.map(file => [
  file,
  gzipSync(readFileSync(join(root, file)), { level: 9 }).length,
]));

if (process.argv.includes("--write")) {
  writeFileSync(baselinePath, `${JSON.stringify(sizes, null, 2)}\n`);
  console.log(`Wrote baseline to ${baselinePath}`);
}

if (!existsSync(baselinePath)) {
  console.error("No baseline recorded. Run: node scripts/check-size.mjs --write");
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
let failed = false;
for (const file of ENTRYPOINTS) {
  const before = baseline[file];
  if (before === undefined) {
    console.log(`${file.padEnd(16)} ${String(sizes[file]).padStart(6)} gzip  (no baseline)`);
    continue;
  }
  const delta = sizes[file] - before;
  const verdict = delta <= PREFERRED_BUDGET ? "ok" : delta <= HARD_BUDGET ? "over preferred" : "OVER LIMIT";
  if (delta > HARD_BUDGET) failed = true;
  console.log(`${file.padEnd(16)} ${String(sizes[file]).padStart(6)} gzip  ${before} -> ${sizes[file]} (${delta >= 0 ? "+" : ""}${delta}) ${verdict}`);
}

if (failed) {
  console.error(`Gzip growth exceeds the ${HARD_BUDGET} byte budget.`);
  process.exit(1);
}