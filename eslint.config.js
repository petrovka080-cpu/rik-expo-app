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
]);
