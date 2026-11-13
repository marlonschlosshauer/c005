import { realpathSync } from "node:fs";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Prototype worktrees may share the main checkout’s installed dependencies.
  server: { fs: { allow: [realpathSync("."), realpathSync("node_modules")] } },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
});
