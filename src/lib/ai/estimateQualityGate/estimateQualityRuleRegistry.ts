import type {
  EstimateQualityRuleResult,
  EstimateQualitySnapshotContext,
} from "./estimateQualityTypes";
import { evaluateMaterialCompatibilityQuality } from "./materialCompatibilityQuality";
import { evaluatePdfRequestHistoryParityQuality } from "./pdfRequestHistoryParityQuality";
import { evaluatePriceIntegrityQuality } from "./priceIntegrityQuality";
import { evaluateProfessionalCompletenessQuality } from "./professionalCompletenessQuality";
import { evaluateQuantitySanityQuality } from "./quantitySanityQuality";
import { evaluateRegionalCurrencyQuality } from "./regionalCurrencyQuality";
import { evaluateRowDomainIsolationQuality } from "./rowDomainIsolationQuality";
import { evaluateSnapshotIntegrityQuality } from "./snapshotIntegrityQuality";
import { evaluateTemplateCompletenessQuality } from "./templateCompletenessQuality";
import { evaluateWorkResolutionQuality } from "./workResolutionQuality";

export type EstimateQualityRule = {
  name: string;
  run: (context: EstimateQualitySnapshotContext) => EstimateQualityRuleResult;
};

export const ESTIMATE_QUALITY_RULE_REGISTRY: readonly EstimateQualityRule[] = Object.freeze([
  { name: "work_resolution", run: evaluateWorkResolutionQuality },
  { name: "quantity_sanity", run: evaluateQuantitySanityQuality },
  { name: "template_completeness", run: evaluateTemplateCompletenessQuality },
  { name: "row_domain_isolation", run: evaluateRowDomainIsolationQuality },
  { name: "material_compatibility", run: evaluateMaterialCompatibilityQuality },
  { name: "price_integrity", run: evaluatePriceIntegrityQuality },
  { name: "regional_currency", run: evaluateRegionalCurrencyQuality },
  { name: "snapshot_integrity", run: evaluateSnapshotIntegrityQuality },
  { name: "professional_completeness", run: evaluateProfessionalCompletenessQuality },
  { name: "pdf_request_history_parity", run: evaluatePdfRequestHistoryParityQuality },
]);
