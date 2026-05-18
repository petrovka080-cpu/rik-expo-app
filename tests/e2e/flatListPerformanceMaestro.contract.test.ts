import fs from "node:fs";
import path from "node:path";

describe("S_PERF_01 flat list performance Maestro runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runFlatListPerformanceMaestro.ts"),
    "utf8",
  );

  it("uses the exact enterprise targets and Android runtime signoff", () => {
    expect(source).toContain("runFlatListPerformanceMaestro");
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("verifyFlatListTuning");
    expect(source).toContain("ENTERPRISE_LIST_TARGETS");
    expect(source).toContain("androidRuntimeSmoke");
    expect(source).toContain("scrollDownUpProof");
    expect(source).toContain("androidScrollProofPass");
    expect(source).toContain("S_PERF_01_FLATLIST_ENTERPRISE_TUNING_emulator.json");
  });

  it("keeps the runner read-only and honest", () => {
    expect(source).toContain("noDbWrites: true");
    expect(source).toContain("noProviderCall: true");
    expect(source).toContain("hiddenTestIdShimsAdded: false");
    expect(source).toContain("fakeGreenClaimed: false");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(source).not.toContain("listUsers");
  });
});
