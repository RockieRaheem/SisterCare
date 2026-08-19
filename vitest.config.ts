import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    // Keep CI memory predictable; unconstrained worker fan-out previously
    // made the coverage job time out despite every test passing in isolation.
    maxWorkers: 2,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/types/**",
        "src/lib/i18n/translations/**",
      ],
      thresholds: {
        statements: 13,
        branches: 13,
        functions: 11,
        lines: 14,
      },
    },
  },
});
