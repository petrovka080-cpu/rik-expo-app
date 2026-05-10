import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");

const auditedRuntimeFiles = [
  {
    relativePath: "src/screens/director/DirectorDashboard.tsx",
    markerOwner: "reportDirectorTopTabsScrollFailure",
  },
  {
    relativePath: "src/lib/notify.native.ts",
    markerOwner: "recordSwallowedError",
  },
  {
    relativePath: "src/lib/notify.web.ts",
    markerOwner: "recordSwallowedError",
  },
  {
    relativePath: "src/components/map/MapRenderer.web.tsx",
    markerOwner: "recordSwallowedError",
  },
  {
    relativePath: "src/screens/buyer/hooks/useBuyerScreenUiState.ts",
    markerOwner: "reportBuyerTabsScrollToStartFailure",
  },
];

describe("audited runtime silent catches", () => {
  it.each(auditedRuntimeFiles)(
    "$relativePath does not keep empty catch blocks active",
    ({ relativePath, markerOwner }) => {
      const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

      expect(source).not.toMatch(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/);
      expect(source).toContain(markerOwner);
    },
  );
});
