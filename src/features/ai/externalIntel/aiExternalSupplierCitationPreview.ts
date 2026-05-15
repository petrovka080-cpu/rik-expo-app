import { validateAiExternalCitations } from "./aiExternalCitationPolicy";
import {
  AI_EXTERNAL_SUPPLIER_CANDIDATE_CANARY_CONTRACT,
  previewAiExternalSupplierCandidatesCanary,
  type AiExternalSupplierCandidatePreviewRequest,
} from "./aiExternalSupplierCandidatePreview";
import type { ExternalSupplierCandidatesOutput } from "../procurement/procurementContextTypes";

export const AI_EXTERNAL_SUPPLIER_CITATION_PREVIEW_CONTRACT = Object.freeze({
  contractId: "ai_external_supplier_citation_preview_v1",
  internalFirstRequired: true,
  marketplaceCheckRequired: true,
  citationsRequired: true,
  externalLiveFetchDefault: false,
  external_live_fetch_default: false,
  previewOnly: true,
  supplierConfirmationAllowed: false,
  orderCreationAllowed: false,
  warehouseMutationAllowed: false,
  paymentCreationAllowed: false,
  rawHtmlReturned: false,
  mutationCount: 0,
  noFakeSuppliers: true,
} as const);

export type AiExternalSupplierCitationPreviewOutput = ExternalSupplierCandidatesOutput & {
  contractId: typeof AI_EXTERNAL_SUPPLIER_CITATION_PREVIEW_CONTRACT.contractId;
  citedPreview: true;
  citationsRequired: true;
  previewOnly: true;
  externalLiveFetchDefault: false;
  rawHtmlReturned: false;
  supplierConfirmationAllowed: false;
  orderCreationAllowed: false;
  warehouseMutationAllowed: false;
  paymentCreationAllowed: false;
  fakeSuppliersCreated: false;
  citationPolicyBlockers: readonly string[];
};

function decorate(
  output: ExternalSupplierCandidatesOutput,
  citationPolicyBlockers: readonly string[] = [],
): AiExternalSupplierCitationPreviewOutput {
  return {
    ...output,
    contractId: AI_EXTERNAL_SUPPLIER_CITATION_PREVIEW_CONTRACT.contractId,
    citedPreview: true,
    citationsRequired: true,
    previewOnly: true,
    externalLiveFetchDefault: false,
    rawHtmlReturned: false,
    supplierConfirmationAllowed: false,
    orderCreationAllowed: false,
    warehouseMutationAllowed: false,
    paymentCreationAllowed: false,
    mutationCount: 0,
    fakeSuppliersCreated: false,
    citationPolicyBlockers,
  };
}

export async function previewAiExternalSupplierCitationPreview(
  request: AiExternalSupplierCandidatePreviewRequest,
): Promise<AiExternalSupplierCitationPreviewOutput> {
  const output = await previewAiExternalSupplierCandidatesCanary(request);
  const citationPolicy = validateAiExternalCitations({
    results: [],
    citations: output.citations,
    rawHtmlReturned: false,
  });
  if (!citationPolicy.ok) {
    return decorate(
      {
        status: "blocked",
        internalFirstSummary: "External supplier preview was blocked because citation evidence was incomplete.",
        candidates: [],
        citations: [],
        recommendationBoundary:
          "External supplier preview is citations-only and cannot create suppliers, orders, warehouse movements, or payments.",
        requiresApprovalForAction: true,
        finalActionAllowed: false,
        mutationCount: 0,
      },
      citationPolicy.blockers,
    );
  }

  return decorate(output);
}

export const AI_EXTERNAL_SUPPLIER_CITATION_PREVIEW_CANARY_CONTRACT =
  AI_EXTERNAL_SUPPLIER_CANDIDATE_CANARY_CONTRACT;
