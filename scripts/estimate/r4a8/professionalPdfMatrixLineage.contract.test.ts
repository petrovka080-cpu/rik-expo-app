import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("R4-A8 physical professional PDF matrix lineage", () => {
  const source = readFileSync(resolve("scripts/e2e/runR4A6ProfessionalPdfMatrix.ts"), "utf8");

  it("binds the exact A8 master and evidence root", () => {
    expect(source).toContain("MASTER_TZ_R5_6_8_RC09_R4_A8_DEVELOPER_ACCESS_ESTIMATE_RECOVERY_CANONICAL_MONOLITH_RU.md");
    expect(source).toContain("cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1");
    expect(source).toContain("r4-a8-developer-estimate-recovery-1/16_web_android");
  });

  it("preserves the full physical 1/45/100/500/1001 matrix and honesty checks", () => {
    expect(source).toContain("const MATRIX = [1, 45, 100, 500, 1001] as const");
    expect(source).toContain("allRowsInOrder");
    expect(source).toContain("nullPriceHonest");
    expect(source).toContain("boundedCoordinatorMemory");
    expect(source).toContain("GLOBAL_STATUS=RED_NOT_PRODUCTION_READY");
  });
});
