import { readFileSync } from "fs";
import { join } from "path";

describe("OfficeHubScreen decomposition A", () => {
  const rootSource = readFileSync(
    join(process.cwd(), "src", "screens", "office", "OfficeHubScreen.tsx"),
    "utf8",
  );
  const controllerSource = readFileSync(
    join(process.cwd(), "src", "screens", "office", "useOfficeHubScreenController.tsx"),
    "utf8",
  );
  const developerOverrideSource = readFileSync(
    join(process.cwd(), "src", "screens", "office", "useOfficeDeveloperOverrideActions.ts"),
    "utf8",
  );

  const countLines = (source: string) => source.replace(/\r?\n$/, "").split(/\r?\n/).length;
  const countHookCalls = (source: string) =>
    (source.match(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g) || []).length;

  it("keeps OfficeHubScreen as a tiny composition shell", () => {
    expect(countLines(rootSource)).toBeLessThanOrEqual(40);
    expect(countHookCalls(rootSource)).toBeLessThanOrEqual(1);
    expect(rootSource).toContain("useOfficeHubScreenController");
    expect(rootSource).toContain("<OfficeShellContent");
    expect(rootSource).not.toContain("loadOfficeAccessScreenData");
    expect(rootSource).not.toContain("useFocusEffect");
    expect(rootSource).not.toContain("router.push");
  });

  it("moves loading, lifecycle, action, and shell view-model ownership into the controller", () => {
    expect(controllerSource).toContain("loadOfficeAccessScreenData");
    expect(controllerSource).toContain("useFocusEffect");
    expect(controllerSource).toContain("resolveOfficeHubFocusRefreshPlan");
    expect(controllerSource).toContain("buildOfficeShellContentModel");
    expect(controllerSource).toContain("useOfficeDeveloperOverrideActions");
    expect(controllerSource).toContain("handleOpenOfficeCard");
    expect(countHookCalls(controllerSource)).toBeLessThanOrEqual(25);
  });

  it("keeps developer override state and actions behind a typed hook boundary", () => {
    expect(developerOverrideSource).toContain("export function useOfficeDeveloperOverrideActions");
    expect(developerOverrideSource).toContain("DEVELOPER_OVERRIDE_ROLES.filter");
    expect(developerOverrideSource).toContain("await setDeveloperEffectiveRole(role)");
    expect(developerOverrideSource).toContain('reason: "developer_override_role_selected"');
    expect(developerOverrideSource).toContain("await clearDeveloperEffectiveRole()");
    expect(developerOverrideSource).toContain('reason: "developer_override_cleared"');
    expect(controllerSource).not.toContain("setDeveloperEffectiveRole");
    expect(controllerSource).not.toContain("clearDeveloperEffectiveRole");
  });

  it("does not add direct provider calls to the root or controller", () => {
    expect(rootSource).not.toMatch(/supabase|fetch\s*\(|rateLimit|cache/i);
    expect(controllerSource).not.toMatch(/supabase|fetch\s*\(|rateLimit/i);
    expect(developerOverrideSource).not.toMatch(/supabase|fetch\s*\(|rateLimit|cache/i);
  });
});
