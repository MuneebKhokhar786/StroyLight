import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Pure-function tests (state, timing) run fine under Node; component
    // tests opt into jsdom per-file via a `// @vitest-environment jsdom`
    // docblock, so the fast majority of the suite isn't paying for a DOM.
    environment: "node",
    passWithNoTests: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
