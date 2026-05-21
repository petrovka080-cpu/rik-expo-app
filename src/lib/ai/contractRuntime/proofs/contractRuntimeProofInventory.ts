import { AI_INVARIANT_CATALOG } from "../aiInvariantCatalog";

export function buildAiContractRuntimeProofInventory() {
  return {
    layerRoot: "src/lib/ai/contractRuntime",
    scripts: [
      "scripts/ai/runAiEnterpriseContractRuntimeInvariantProof.ts",
      "scripts/e2e/runAiContractRuntimeInvariantWebProof.ts",
      "scripts/e2e/runAiContractRuntimeInvariantMaestroProof.ts",
    ],
    invariantCount: AI_INVARIANT_CATALOG.length,
    invariants: AI_INVARIANT_CATALOG.map((item) => item.invariantId),
    approvedLayer: true,
    mutatesBusinessData: false,
  };
}
