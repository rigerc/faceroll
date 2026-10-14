import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: { entry: "src/index.ts", fileName: "index", formats: ["es"] },
    target: "node24",
    outDir: "dist",
    emptyOutDir: true,
    ssr: true,
  },
  ssr: {
    external: ["faceroll", "@modelcontextprotocol/server", "@modelcontextprotocol/server/stdio", "@modelcontextprotocol/node", "express", "effect"],
  },
});
