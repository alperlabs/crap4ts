import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "istanbul",
      // Emit the machine-readable report that crap4ts itself consumes.
      reporter: ["text", "json"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      // Thin IO adapters and the entry point are integration-tested, not
      // unit-covered; excluding them keeps the coverage signal about logic.
      exclude: ["src/main.ts", "src/coverage/processCommandExecutor.ts"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
