module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  collectCoverageFrom: [
    "<rootDir>/src/lib/offline/mutationQueue.ts",
    "<rootDir>/src/lib/offline/mutationWorker.ts",
    "<rootDir>/src/lib/offline/mutation.retryPolicy.ts",
    "<rootDir>/src/lib/offline/mutation.conflict.ts",
    "<rootDir>/src/screens/profile/profile.services.ts",
    "<rootDir>/src/screens/profile/hooks/useProfileDerivedState.ts",
    "<rootDir>/src/screens/profile/components/ProfilePrimitives.tsx",
  ],
  coverageDirectory: "<rootDir>/artifacts/wave8-coverage",
  coverageReporters: ["json-summary", "text-summary"],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 40,
      functions: 70,
      lines: 60,
    },
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/.expo/"],
};
