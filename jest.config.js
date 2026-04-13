module.exports = {
  preset: "jest-expo",
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
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/dist-export-*/", "/.expo/"],
};
