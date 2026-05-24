import { fullCases, expectPhase2FullManifestValid } from "./phase2TestHelpers";

describe("built-in AI 50000 full manifest exact count", () => {
  it("contains exactly 50000 cases", () => {
    expect(fullCases).toHaveLength(50000);
    expectPhase2FullManifestValid();
  });
});
