module.exports = {
  preset: "jest-expo",
  sandboxInjectedGlobals: ["Math"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  collectCoverageFrom: [
    "<rootDir>/src/**/*.{ts,tsx}",
    "!<rootDir>/src/lib/database.types.ts",
    "!<rootDir>/src/**/*.test.{ts,tsx}",
    "!<rootDir>/src/**/*.styles.{ts,tsx}",
    "!<rootDir>/src/**/*.types.{ts,tsx}",
    "!<rootDir>/src/dev/**",
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["json-summary", "text-summary", "lcov"],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 40,
      functions: 70,
      lines: 60,
    },
  },
  // Generated whole-app exports are runtime outputs, not Jest modules. Keep
  // historical captured JSON parents outside runtime/ importable by product tests.
  modulePathIgnorePatterns: ["<rootDir>/\\.release-runtime/r568/runtime/"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/dist-export-*/",
    "/.expo/",
    "/tests/e2e/.*\\.spec\\.ts$",
  ],
};
