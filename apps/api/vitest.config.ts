import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
    setupFiles: ["./src/test/setup.ts"],
    fileParallelism: false,
    env: {
      MODERATOR_API_KEY: "test-moderator-key",
      CORS_ORIGINS: "http://localhost:5173"
    }
  }
});
