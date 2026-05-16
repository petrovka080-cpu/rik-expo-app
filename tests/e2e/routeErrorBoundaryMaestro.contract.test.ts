import fs from "node:fs";
import path from "node:path";

describe("S_SCALE_02 route error boundary Maestro runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runRouteErrorBoundaryMaestro.ts"),
    "utf8",
  );

  it("keeps Android route targets explicit", () => {
    for (const screenId of [
      "buyer.main",
      "accountant.main",
      "warehouse.main",
      "director.dashboard",
      "foreman.main",
      "approval.inbox",
      "documents.route",
      "ai.assistant",
    ]) {
      expect(source).toContain(screenId);
    }

    expect(source).toContain('"maestro"');
    expect(source).toContain('"android"');
    expect(source).toContain("boundaryWrapperRecorded");
    expect(source).toContain("noBlankWhiteScreen");
  });

  it("uses existing Android runtime signoff without service-role or fake green paths", () => {
    expect(source).toContain("S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_matrix.json");
    expect(source).toContain("androidRuntimeSmoke");
    expect(source).toContain("fakeGreenClaimed: false");
    expect(source).toContain("noDbWrites: true");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(source).not.toContain("listUsers");
  });
});
