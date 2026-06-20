import { expectFileToContain } from "./releasePipelineContractUtils";

describe("live BOQ product gate promotion precondition", () => {
  it("blocks promotion until the current candidate live BOQ product gate is green", () => {
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "product-gates");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "live_boq.json");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "LIVE_BOQ_PRODUCT_GATE_NOT_GREEN");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "product_gates.json");
  });
});
