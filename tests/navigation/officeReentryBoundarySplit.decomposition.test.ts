import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("OFFICE_REENTRY_BOUNDARY_SPLIT decomposition audit", () => {
  it("adds the extracted office reentry boundary modules", () => {
    const requiredFiles = [
      "src/lib/navigation/officeReentryBreadcrumbs.contract.ts",
      "src/lib/navigation/officeReentryBreadcrumbBatcher.ts",
      "src/lib/navigation/officeReentryBreadcrumbs.persistence.ts",
      "src/lib/navigation/officeReentryBreadcrumbDiagnostics.ts",
      "src/lib/navigation/officeReentryRouteReturnReceipt.ts",
      "src/lib/navigation/officeReentryBreadcrumbMarkers.ts",
    ];

    for (const relativePath of requiredFiles) {
      expect(fs.existsSync(path.join(repoRoot, relativePath))).toBe(true);
    }
  });

  it("keeps `officeReentryBreadcrumbs.ts` as a stable public entrypoint only", () => {
    const source = readRepoFile("src/lib/navigation/officeReentryBreadcrumbs.ts");

    expect(source).toContain('from "./officeReentryBreadcrumbBatcher"');
    expect(source).toContain('from "./officeReentryBreadcrumbs.persistence"');
    expect(source).toContain('from "./officeReentryBreadcrumbDiagnostics"');
    expect(source).toContain('from "./officeReentryRouteReturnReceipt"');
    expect(source).toContain('from "./officeReentryBreadcrumbMarkers"');
    expect(source).not.toContain("AsyncStorage");
    expect(source).not.toContain("AppState");
    expect(source).not.toContain("recordPlatformObservability");
    expect(source).not.toContain("function recordOfficeReentryMarker");
  });
});
