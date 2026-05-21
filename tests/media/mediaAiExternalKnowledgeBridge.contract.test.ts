import { bridgeMediaAnalysisToExternalKnowledge } from "../../src/lib/media";

test("external knowledge bridge marks construction guidance as non-project fact", () => {
  const bridge = bridgeMediaAnalysisToExternalKnowledge({ analysisKind: "construction_evidence" });
  expect(bridge.usedExternalKnowledge).toBe(true);
  expect(bridge.canBeProjectFact).toBe(false);
});
