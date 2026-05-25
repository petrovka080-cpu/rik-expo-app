import {
  buildConsumerRepairAiDraftFromGlobalEstimate,
  buildConsumerRepairCanonicalDraftPayload,
  compareConsumerRepairPayloadParity,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  validateConsumerRepairPayloadSourceGovernance,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import {
  calculateGlobalConstructionEstimateSync,
} from "../../src/lib/ai/globalEstimate/globalEstimateCalculator";
import type { RateSourceEvidence } from "../../src/lib/ai/globalEstimate/sourceGovernance";
import { bindEstimateRowsToCatalogItems } from "../../src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems";
import type { SourceBackedEstimateRow } from "../../src/lib/ai/globalEstimate/globalEstimateTypes";
import type { CatalogItemForEstimate } from "../../src/lib/catalog/catalogItemTypes";

export const FRESH_SOURCE: RateSourceEvidence = {
  sourceId: "catalog_items",
  sourceType: "catalog_item",
  label: "catalog_items",
  checkedAt: "2026-05-20T00:00:00.000Z",
  freshness: "fresh",
  confidence: "high",
};

export const STALE_HIGH_SOURCE: RateSourceEvidence = {
  sourceId: "catalog_items",
  sourceType: "catalog_item",
  label: "catalog_items",
  checkedAt: "2025-01-01T00:00:00.000Z",
  freshness: "stale",
  confidence: "high",
};

export const FOUNDATION_PROMPT = "smeta na lentochnyi fundament dlin 48 metrov shirina 0.4 m i vysota 1.7 m";

export function catalogCandidateFor(row: SourceBackedEstimateRow): CatalogItemForEstimate {
  return {
    catalogItemId: `source_governance_catalog_${row.rateKey || row.code}`,
    name: `${row.name} catalog item`,
    normalizedName: `${row.name} catalog item`.toLowerCase(),
    category: "material",
    materialKey: row.materialKey,
    rateKey: row.rateKey,
    unit: row.unit,
    unitLabel: row.displayQuantity.replace(String(row.quantity), "").trim() || row.unit,
    unitPrice: row.unitPrice,
    currency: row.currency,
    sourceId: "catalog_items",
    sourceLabel: "catalog_items",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "high",
    availabilityStatus: "unknown",
    stockStatus: "unknown",
  };
}

export async function buildGovernedPayloadSet() {
  const estimate = calculateGlobalConstructionEstimateSync({
    text: FOUNDATION_PROMPT,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
  const binding = await bindEstimateRowsToCatalogItems({
    estimate,
    searchProvider: async (_query, row) => [catalogCandidateFor(row)],
  });
  __resetConsumerRepairRequestStoreForTests();
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "source-governance-user",
    problemText: FOUNDATION_PROMPT,
    repairType: "foundation",
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraftFromGlobalEstimate(estimate, binding),
  });
  bundle = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id });

  const draftSave = buildConsumerRepairCanonicalDraftPayload(bundle, "draft_save");
  const pdfGeneration = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");
  const marketplaceSend = buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send");
  return {
    estimate,
    binding,
    bundle,
    payloads: { draftSave, pdfGeneration, marketplaceSend },
    parity: compareConsumerRepairPayloadParity({ draftSave, pdfGeneration, marketplaceSend }),
    governance: [draftSave, pdfGeneration, marketplaceSend].map(validateConsumerRepairPayloadSourceGovernance),
  };
}
