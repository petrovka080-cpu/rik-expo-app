import type { ProcurementCopilotResolvedPlan } from "../procurementCopilot/procurementCopilotTypes";
import { evidenceRefIds, mergeEvidenceRefIds } from "./procurementEvidenceBuilder";
import { uniqueProcurementRefs } from "./procurementRedaction";

export type AiProcurementLiveChainEvidence = {
  internalEvidenceRefs: readonly string[];
  supplierEvidenceRefs: readonly string[];
  draftEvidenceRefs: readonly string[];
  approvalEvidenceRefs: readonly string[];
  allEvidenceRefs: readonly string[];
  evidenceRequired: true;
  allEvidenceRedacted: true;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
};

export const AI_PROCUREMENT_LIVE_CHAIN_EVIDENCE_CONTRACT = Object.freeze({
  contractId: "ai_procurement_live_chain_evidence_v1",
  evidenceRequired: true,
  allEvidenceRedacted: true,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  directDatabaseRowsExposed: false,
} as const);

export function buildAiProcurementLiveChainEvidence(
  resolved: ProcurementCopilotResolvedPlan,
): AiProcurementLiveChainEvidence {
  const internalEvidenceRefs = evidenceRefIds(resolved.procurementContext.internalEvidenceRefs);
  const supplierEvidenceRefs = uniqueProcurementRefs([
    ...resolved.plan.evidenceRefs,
    ...resolved.plan.supplierCards.flatMap((card) => card.evidenceRefs),
  ]);
  const draftEvidenceRefs = uniqueProcurementRefs([...resolved.draftPreview.evidenceRefs]);
  const approvalEvidenceRefs = uniqueProcurementRefs([
    ...resolved.submitForApprovalPreview.evidenceRefs,
  ]);

  return {
    internalEvidenceRefs,
    supplierEvidenceRefs,
    draftEvidenceRefs,
    approvalEvidenceRefs,
    allEvidenceRefs: mergeEvidenceRefIds(
      [...internalEvidenceRefs],
      [...supplierEvidenceRefs],
      [...draftEvidenceRefs],
      [...approvalEvidenceRefs],
    ),
    evidenceRequired: true,
    allEvidenceRedacted: true,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
  };
}
