import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("office developer override UI boundary", () => {
  it("shows the effective-role switch only for developer contexts without bypassing auth", () => {
    const model = read("src/screens/office/office.layout.model.ts");
    const shell = read("src/screens/office/OfficeShellContent.tsx");
    const sections = read("src/screens/office/officeHub.sections.tsx");
    const devOverride = read("src/lib/developerOverride.ts");
    const policy = read("src/lib/officeRuntime/officeRuntimePolicy.ts");
    const authGuard = read("src/lib/auth/useAuthGuard.ts");
    const authLifecycle = read("src/lib/auth/useAuthLifecycle.ts");
    const liveRunner = read("scripts/e2e/runOfficeMarketLiveWebE2E.ts");

    expect(devOverride).toContain("local_dev_full_access");
    expect(policy).toContain("OFFICE_DEVELOPER_FULL_ACCESS_MANIFEST");
    expect(policy).toContain('mode: "developer_control_full_access"');
    expect(devOverride).toContain('authorizationSource: "local_ui_only"');
    expect(devOverride).toContain("isServerAuthorizedPlatformDeveloper");
    expect(authGuard).not.toContain("isLocalDeveloperFullAccessAllowed");
    expect(authGuard).not.toContain("localDeveloperFullAccessAllowed");
    expect(authLifecycle).not.toContain("auth_local_developer_full_access");
    expect(model).toContain("isServerAuthorizedPlatformDeveloper");
    expect(model).toContain('authorizationSource === "local_ui_only"');
    expect(shell).toContain("model.showDeveloperOverride");
    expect(sections).toContain("OfficeDeveloperOverrideSection");
    expect(sections).toContain('testID="developer-override-panel"');
    expect(liveRunner).toContain("developer_full_access_used_as_proof: false");
    expect(liveRunner).not.toContain("developer_full_access_used_as_proof: true");
  });
});
