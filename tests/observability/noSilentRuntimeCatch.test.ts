import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");

const auditedRuntimeFiles = [
  "src/screens/director/DirectorDashboard.tsx",
  "src/lib/notify.native.ts",
  "src/lib/notify.web.ts",
  "src/components/map/MapRenderer.web.tsx",
  "app/(tabs)/buyer.tsx",
];

describe("audited runtime silent catches", () => {
  it.each(auditedRuntimeFiles)("%s does not keep empty catch blocks active", (relativePath) => {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

    expect(source).not.toMatch(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/);
    expect(source).toContain("recordSwallowedError");
  });
});
