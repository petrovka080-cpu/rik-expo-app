import { expectPhase2DomainCoverageValid, expectPhase2FullManifestValid } from "./phase2TestHelpers";

describe("built-in AI 50000 Phase 2 full manifest coverage", () => {
  it("covers 25 macro-domains and 500 domains", () => {
    expectPhase2FullManifestValid();
    expectPhase2DomainCoverageValid();
  });
});
