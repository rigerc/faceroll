/** Offline-friendly build using the `typescript` compiler, no bundler required. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
for (const config of ["tsconfig.build.esm.json", "tsconfig.build.cjs.json"]) {
  execFileSync(process.platform === "win32" ? "tsc.cmd" : "tsc", ["-p", config], { cwd: root, stdio: "inherit" });
}

// TypeScript keeps bare relative specifiers. Node ESM needs explicit `.js`.
for (const name of readdirSync(dist)) {
  if (!name.endsWith(".js") && !name.endsWith(".d.ts")) continue;
  const path = join(dist, name);
  let source = readFileSync(path, "utf8");
  source = source.replace(/(from\s+["'])(\.\/[\w-]+)(["'])/g, "$1$2.js$3");
  source = source.replace(/(import\s*\(["'])(\.\/[\w-]+)(["']\))/g, "$1$2.js$3");
  writeFileSync(path, source);
}
writeFileSync(join(dist, "cjs", "package.json"), '{"type":"commonjs"}\n');
// Ship a full CJS declaration tree so NodeNext consumers resolve each
// relative type dependency within the CommonJS package scope.
for (const name of readdirSync(dist)) {
  if (!name.endsWith(".d.ts")) continue;
  writeFileSync(join(dist, "cjs", name), readFileSync(join(dist, name)));
}
for (const entry of ["index", "terminal"]) {
  writeFileSync(join(dist, `${entry}.cjs`), `module.exports = require("./cjs/${entry}.js");\n`);
  // Declaration entrypoint for CommonJS type resolution.
  const dts = join(dist, `${entry}.d.ts`);
  if (existsSync(dts)) writeFileSync(join(dist, `${entry}.d.cts`), `export * from "./cjs/${entry}.js";\n`);
}
chmodSync(join(dist, "cli.js"), 0o755);
console.log("Built ESM, CommonJS and declarations with tsc.");
