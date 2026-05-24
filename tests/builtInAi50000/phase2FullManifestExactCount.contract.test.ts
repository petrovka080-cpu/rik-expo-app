import { fullCases, expectPhase2FullManifestValid } from "./phase2TestHelpers";

describe("built-in AI 50000 Phase 2 full manifest count", () => {
  it("contains exactly 50000 governed cases", () => {
    expect(fullCases).toHaveLength(50000);
    expectPhase2FullManifestValid();
  });
});
