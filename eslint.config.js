const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/**", "coverage/**", ".expo/**"],
  },
  {
    // Governance: prefer logger.* over raw console.* in new code.
    // Only console.log / console.debug trigger warn; info/warn/error allowed
    // until more files migrate to the logger boundary.
    rules: {
      "no-console": ["warn", { allow: ["info", "warn", "error"] }],
      // Allow _-prefixed vars (standard TS convention for intentionally unused bindings)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Boundary owners: these modules OWN console output — always allowed.
    files: [
      "src/lib/logger.ts",
      "src/lib/logError.ts",
      "src/lib/observability/**",
    ],
    rules: {
      "no-console": "off",
    },
  },
  {
    // Test files: jest.requireActual() and inline require() are standard Jest patterns.
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "tests/**",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Platform-conditional require(): these files use require() for
    // platform-specific module loading (web vs native splits).
    files: [
      "src/components/map/MapRenderer.tsx",
      "src/dev/_debugStyleTrap.web.ts",
      "src/dev/_webStyleGuard.tsx",
      "src/ui/GlobalBusy.tsx",
      "src/lib/notify.ts",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
