const fs = require("node:fs");
const path = require("node:path");
const BaseSequencer = require("@jest/test-sequencer").default;

function normalized(filePath) {
  return path.resolve(filePath).replace(/\\/g, "/");
}

class ManifestOrderTestSequencer extends BaseSequencer {
  sort(tests) {
    const manifestPath = process.env.JEST_ORDER_MANIFEST_PATH;
    if (!manifestPath) throw new Error("JEST_ORDER_MANIFEST_PATH_REQUIRED");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!Array.isArray(manifest) || manifest.some((item) => typeof item !== "string")) {
      throw new Error("JEST_ORDER_MANIFEST_INVALID");
    }
    const rank = new Map(manifest.map((item, index) => [normalized(item), index]));
    const observed = tests.map((test) => normalized(test.path));
    const missing = [...rank.keys()].filter((item) => !observed.includes(item));
    const unexpected = observed.filter((item) => !rank.has(item));
    if (missing.length || unexpected.length || new Set(manifest.map(normalized)).size !== manifest.length) {
      throw new Error(`JEST_ORDER_MANIFEST_MEMBERSHIP_MISMATCH:${JSON.stringify({ missing, unexpected })}`);
    }
    return [...tests].sort((left, right) => rank.get(normalized(left.path)) - rank.get(normalized(right.path)));
  }
}

module.exports = ManifestOrderTestSequencer;
