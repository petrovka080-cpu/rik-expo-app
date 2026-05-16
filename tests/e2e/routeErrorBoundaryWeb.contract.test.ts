import fs from "node:fs";
import path from "node:path";

describe("S_SCALE_02 route error boundary web runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runRouteErrorBoundaryWeb.ts"),
    "utf8",
  );

  it("targets representative routes without adding a UI injection hook", () => {
    for (const screenId of [
      "buyer.main",
      "accountant.main",
      "warehouse.main",
      "director.dashboard",
      "foreman.main",
      "documents.route",
      "approval.inbox",
      "ai.assistant",
    ]) {
      expect(source).toContain(screenId);
    }

    expect(source).toContain("verifier_only_no_ui_hook");
    expect(source).not.toContain(".click(");
    expect(source).not.toContain(".fill(");
    expect(source).not.toContain("process.env.SUPABASE_SERVICE_ROLE");
  });

  it("records no-white-screen and safety signals", () => {
    expect(source).toContain("verifyRouteErrorBoundaryCoverage");
    expect(source).toContain("noWhiteScreenNormalBoot");
    expect(source).toContain("noRawStackVisible");
    expect(source).toContain("noSecretsPrinted");
    expect(source).toContain("noProviderCall");
    expect(source).toContain("noDbWrites");
    expect(source).toContain("S_SCALE_02_ROUTE_ERROR_BOUNDARY_COVERAGE_web.json");
  });
});
