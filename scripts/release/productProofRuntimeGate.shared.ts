import path from "node:path";

import type { ReleaseCandidate } from "./releaseCandidateState";
import { candidateRuntimeDir } from "./releasePipelineRuntime";

export const PRODUCT_PROOF_RUNTIME_GATE_GREEN_STATUS = "GREEN_PRODUCT_PROOF_RUNTIME_READY";
export const PRODUCT_PROOF_RUNTIME_GATE_BLOCKED_STATUS = "BLOCKED_PRODUCT_PROOF_RUNTIME_GATE";

export type ProductProofRuntimeGateName =
  | "ai-estimate-pdf-safe-integration-proof"
  | "request-ai-estimate-boq-catalog-proof"
  | "request-ai-estimate-professional-boq-formula-proof"
  | "built-in-ai-50000-phase1-governed-expansion-proof"
  | "built-in-ai-50000-phase2-all-shards-runtime-proof";

export type ProductProofRuntimeGateDefinition = {
  gateName: ProductProofRuntimeGateName;
  legacyRunner: string;
  legacyCommand: string;
  expectedStatus: string;
  trackedMatrixPath: string;
  trackedOutputs: string[];
};

export const PRODUCT_PROOF_RUNTIME_GATES: readonly ProductProofRuntimeGateDefinition[] = [
  {
    gateName: "ai-estimate-pdf-safe-integration-proof",
    legacyRunner: "scripts/e2e/runAiEstimatePdfSafeIntegrationProof.ts",
    legacyCommand: "npx tsx scripts/e2e/runAiEstimatePdfSafeIntegrationProof.ts",
    expectedStatus: "GREEN_AI_ESTIMATE_PDF_SAFE_INTEGRATION_READY",
    trackedMatrixPath: "artifacts/S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_matrix.json",
    trackedOutputs: [
      "artifacts/S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_ai_pdf_text_extract.json",
      "artifacts/S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_ai_pdf_view_models.json",
      "artifacts/pdf/ai-estimate-pdf-safe-integration/asphalt_paving_1000sqm.pdf",
      "artifacts/pdf/ai-estimate-pdf-safe-integration/brick_masonry_74sqm.pdf",
      "artifacts/pdf/ai-estimate-pdf-safe-integration/carpet_laying_100sqm.pdf",
      "artifacts/pdf/ai-estimate-pdf-safe-integration/ceramic_tile_floor_laying_174sqm.pdf",
      "artifacts/pdf/ai-estimate-pdf-safe-integration/drywall_wall_cladding_352sqm.pdf",
    ],
  },
  {
    gateName: "request-ai-estimate-boq-catalog-proof",
    legacyRunner: "scripts/e2e/runRequestAiEstimateBoqCatalogProof.ts",
    legacyCommand: "npx tsx scripts/e2e/runRequestAiEstimateBoqCatalogProof.ts",
    expectedStatus: "GREEN_REQUEST_AI_ESTIMATE_BOQ_CATALOG_READY",
    trackedMatrixPath: "artifacts/S_REQUEST_AI_ESTIMATE_BOQ_CATALOG_matrix.json",
    trackedOutputs: ["artifacts/S_REQUEST_AI_ESTIMATE_BOQ_CATALOG_pdf_payloads.json"],
  },
  {
    gateName: "request-ai-estimate-professional-boq-formula-proof",
    legacyRunner: "scripts/e2e/runRequestAiEstimateProfessionalBoqFormulaProof.ts",
    legacyCommand: "npx tsx scripts/e2e/runRequestAiEstimateProfessionalBoqFormulaProof.ts",
    expectedStatus: "GREEN_REQUEST_AI_ESTIMATE_PROFESSIONAL_BOQ_FORMULA_READY",
    trackedMatrixPath: "artifacts/S_REQUEST_AI_ESTIMATE_BOQ_FORMULA_matrix.json",
    trackedOutputs: ["artifacts/S_REQUEST_AI_ESTIMATE_BOQ_FORMULA_localization_validation.json"],
  },
  {
    gateName: "built-in-ai-50000-phase1-governed-expansion-proof",
    legacyRunner: "scripts/e2e/runBuiltInAi50000Phase1ShardMerge.ts",
    legacyCommand: "npx tsx scripts/e2e/runBuiltInAi50000Phase1ShardMerge.ts --totalShards=5 --require-live-artifacts",
    expectedStatus: "GREEN_BUILT_IN_AI_50000_PHASE1_GOVERNED_EXPANSION_READY",
    trackedMatrixPath: "artifacts/S_BUILT_IN_AI_50000_PHASE1_matrix.json",
    trackedOutputs: ["artifacts/pdf/built-in-ai-50000-phase1/brick_masonry_74sqm_ai_estimate.pdf"],
  },
  {
    gateName: "built-in-ai-50000-phase2-all-shards-runtime-proof",
    legacyRunner: "scripts/e2e/runBuiltInAi50000Phase2ShardMerge.ts",
    legacyCommand: "npx tsx scripts/e2e/runBuiltInAi50000Phase2ShardMerge.ts --totalShards=50 --require-live-artifacts",
    expectedStatus: "GREEN_BUILT_IN_AI_50000_PHASE2_ALL_SHARDS_RUNTIME_READY",
    trackedMatrixPath: "artifacts/S_BUILT_IN_AI_50000_PHASE2_matrix.json",
    trackedOutputs: ["artifacts/pdf/built-in-ai-50000-phase2/brick_masonry_74sqm_ai_estimate.pdf"],
  },
];

export function getProductProofRuntimeGate(gateName: string): ProductProofRuntimeGateDefinition {
  const gate = PRODUCT_PROOF_RUNTIME_GATES.find((item) => item.gateName === gateName);
  if (!gate) {
    throw new Error(`UNKNOWN_PRODUCT_PROOF_RUNTIME_GATE:${gateName}`);
  }
  return gate;
}

export function productProofRuntimeGateDir(
  candidate: Pick<ReleaseCandidate, "candidateHash">,
  gateName: ProductProofRuntimeGateName,
): string {
  return path.join(candidateRuntimeDir(candidate), "product-gates", gateName);
}

export function productProofRuntimeReportPath(
  candidate: Pick<ReleaseCandidate, "candidateHash">,
  gateName: ProductProofRuntimeGateName,
): string {
  return path.join(productProofRuntimeGateDir(candidate, gateName), "report.json");
}
