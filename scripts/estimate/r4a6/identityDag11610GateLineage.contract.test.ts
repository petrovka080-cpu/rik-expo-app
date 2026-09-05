import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("R4-A8 Identity/DAG evidence lineage", () => {
  const source = readFileSync(resolve("scripts/estimate/r4a6/auditR4A6IdentityDag11610.ts"), "utf8");

  it("binds the current tracked release, exact master, and A8 evidence root", () => {
    expect(source).toContain("r568-local-developer-canonical-release.json");
    expect(source).toContain("cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1");
    expect(source).toContain("r4-a8-developer-estimate-recovery-1/15_scale");
    expect(source).not.toContain('const RELEASE_ID = "3788cc88-701d-5cc9-9130-c61262cb9979"');
  });

  it("preserves the 11,610 identity and 10,322 selectable denominators", () => {
    expect(source).toContain("R4_A6_EXPECTED_IDENTITIES");
    expect(source).toContain("R4_A6_EXPECTED_VISIBLE_CANONICAL");
    expect(source).toContain("EXPECTED_RETAINED_NON_SEARCH_DEFINITIONS = 9");
  });
});
