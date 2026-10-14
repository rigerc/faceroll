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
for (const file of libraryFiles.filter(file => file.endsWith(".js") || file.endsWith(".js.map"))) {
  await cp(join(root, "dist", file), join(output, "lib", file));
}
console.log(`Playground built in ${output}`);
