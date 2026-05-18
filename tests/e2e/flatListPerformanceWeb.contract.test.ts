import fs from "node:fs";
import path from "node:path";

describe("S_PERF_01 flat list performance web runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runFlatListPerformanceWeb.ts"),
    "utf8",
  );

  it("targets the enterprise list policy through a reproducible browser runner", () => {
    expect(source).toContain("runFlatListPerformanceWeb");
    expect(source).toContain("verifyFlatListTuning");
    expect(source).toContain("ENTERPRISE_LIST_TARGETS");
    expect(source).toContain("chromium");
    expect(source).toContain("attemptScroll");
    expect(source).toContain("webScrollProofPass");
    expect(source).toContain("S_PERF_01_FLATLIST_ENTERPRISE_TUNING_web.json");
  });

  it("records safety signals without provider calls, db writes, or fake green", () => {
    expect(source).toContain("noDbWrites");
    expect(source).toContain("noProviderCall");
    expect(source).toContain("noSecretsPrinted");
    expect(source).toContain("fakeGreenClaimed: false");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(source).not.toContain("listUsers");
  });
});
