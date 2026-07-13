import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("office developer override UI boundary", () => {
  it("keeps developer full access available but out of normal Office UI", () => {
    const model = read("src/screens/office/office.layout.model.ts");
    const shell = read("src/screens/office/OfficeShellContent.tsx");
    const sections = read("src/screens/office/officeHub.sections.tsx");
    const devOverride = read("src/lib/developerOverride.ts");
    const policy = read("src/lib/officeRuntime/officeRuntimePolicy.ts");
    const authGuard = read("src/lib/auth/useAuthGuard.ts");
    const liveRunner = read("scripts/e2e/runOfficeMarketLiveWebE2E.ts");

    expect(devOverride).toContain("local_dev_full_access");
    expect(policy).toContain("OFFICE_DEVELOPER_FULL_ACCESS_MANIFEST");
    expect(policy).toContain('mode: "developer_control_full_access"');
    expect(authGuard).toContain("isLocalDeveloperFullAccessAllowed");
    expect(authGuard).toContain("shouldApplyLocalDeveloperFullAccess");
    expect(authGuard).toContain("localDeveloperFullAccessAllowed");
    expect(model).toContain("showDeveloperOverride: false");
    expect(shell).toContain("model.showDeveloperOverride");
    expect(sections).toContain("OfficeDeveloperOverrideSection");
    expect(sections).toContain('testID="developer-override-panel"');
    expect(liveRunner).toContain("developer_full_access_used_as_proof: false");
    expect(liveRunner).not.toContain("developer_full_access_used_as_proof: true");
  });
});
