import fs from "node:fs";
import path from "node:path";

describe("S_SCALE_03 timer/realtime lifecycle Maestro runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runTimerRealtimeLifecycleMaestro.ts"),
    "utf8",
  );

  it("keeps Android lifecycle targets explicit", () => {
    for (const screenId of [
      "director.dashboard",
      "director.reports",
      "director.finance",
      "warehouse.main",
      "buyer.main",
      "ai.assistant",
    ]) {
      expect(source).toContain(screenId);
    }

    expect(source).toContain('"maestro"');
    expect(source).toContain('"android"');
    expect(source).toContain("lifecycleWrapperRecorded");
    expect(source).toContain("noBlankWhiteScreen");
  });

  it("uses installed Android signoff and does not claim fake green", () => {
    expect(source).toContain("S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_matrix.json");
    expect(source).toContain("androidRuntimeSmoke");
    expect(source).toContain("fakeGreenClaimed: false");
    expect(source).toContain("noDbWrites: true");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(source).not.toContain("listUsers");
  });
});
