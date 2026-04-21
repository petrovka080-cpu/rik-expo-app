import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("OFFICE_OWNER_SPLIT decomposition audit", () => {
  it("adds the extracted office owner-boundary modules", () => {
    const requiredFiles = [
      "src/screens/office/office.route.ts",
      "src/screens/office/office.reentry.ts",
      "src/screens/office/office.layout.model.ts",
      "src/screens/office/OfficeShellContent.tsx",
    ];

    for (const relativePath of requiredFiles) {
      expect(fs.existsSync(path.join(repoRoot, relativePath))).toBe(true);
    }
  });

  it("moves office route scope and child-route decisions into pure modules", () => {
    const officeIndexSource = readRepoFile("app/(tabs)/office/index.tsx");
    const officeLayoutSource = readRepoFile("app/(tabs)/office/_layout.tsx");

    expect(officeIndexSource).toContain("resolveOfficeRouteScopePlan");
    expect(officeIndexSource).not.toContain(
      "function getOfficeRouteScopeSkipReason",
    );
    expect(officeLayoutSource).toContain("resolveSafeOfficeChildRoute");
    expect(officeLayoutSource).not.toContain(
      "function resolveSafeOfficeChildRoute",
    );
  });

  it("keeps orchestration in OfficeHubScreen while moving shell UI into the presenter", () => {
    const officeHubSource = readRepoFile("src/screens/office/OfficeHubScreen.tsx");

    expect(officeHubSource).toContain("buildOfficeShellContentModel");
    expect(officeHubSource).toContain("resolveOfficeHubFocusRefreshPlan");
    expect(officeHubSource).toContain("<OfficeShellContent");
    expect(officeHubSource).not.toContain("RoleScreenLayout");
    expect(officeHubSource).not.toContain("showsVerticalScrollIndicator");
    expect(officeHubSource).not.toContain("OfficeCompanySummarySection");
  });
});
