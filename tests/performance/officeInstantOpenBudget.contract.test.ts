import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("office instant open budget contract", () => {
  it("keeps /office shell-first without a blocking loading screen", () => {
    const shell = read("src/screens/office/OfficeShellContent.tsx");
    const model = read("src/screens/office/office.layout.model.ts");
    const controller = read("src/screens/office/useOfficeHubScreenController.tsx");
    const roleAccess = read("src/screens/office/useOfficeHubRoleAccess.ts");
    const smoke = read("scripts/e2e/runOfficeInstantOpenSmoke.ts");

    expect(model).not.toContain('kind: "loading"');
    expect(shell).not.toContain('if (model.kind === "loading")');
    expect(shell).not.toContain("<ActivityIndicator");
    expect(model).toContain("isInitialLoading: params.loading");
    expect(model).toContain("params.loading ||");
    expect(shell).toContain("office-shell-background-loading");
    expect(controller).toContain("initialBootstrapSnapshot?.data ?? EMPTY_DATA");
    expect(roleAccess).toContain("isBootstrapShell");
    expect(roleAccess).toContain("OFFICE_BOOTSTRAP_ROLE");
    expect(roleAccess).toContain("includeDirectorOwnedDirections: isBootstrapShell || canManageCompany");
    expect(smoke).toContain("OFFICE_SHELL_BUDGET_MS = 500");
    expect(smoke).toContain("OFFICE_USABLE_BUDGET_MS = 1_000");
  });
});
