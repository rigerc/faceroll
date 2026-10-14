import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = join(root, "playground-dist");
// Require a library build before replacing the previous playground output.
const libraryFiles = await readdir(join(root, "dist"));
await rm(output, { recursive: true, force: true });
await cp(join(root, "playground"), output, { recursive: true });
await mkdir(join(output, "lib"), { recursive: true });
// Also works with the multi-module TypeScript fallback build.
// Only the ESM browser graph is published: source maps and the CLI are dead weight on a static site.
const browserLibraryFiles = libraryFiles.filter(file => file.endsWith(".js") && file !== "cli.js");
for (const file of browserLibraryFiles) {
  await cp(join(root, "dist", file), join(output, "lib", file));
}
console.log(`Playground built in ${output}`);
