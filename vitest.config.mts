import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  test: {
    fileParallelism: false,
    setupFiles: ["./vitest.setup.ts"],
    hookTimeout: 60000,
    testTimeout: 120000
  }
});
