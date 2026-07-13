import { formatEstimateSourceBadge, formatEstimateSourceCitation } from "./sourceCitationFormatter";
import { resolveEstimateSourceForNormSourceId } from "./sourceRegistry";
import { estimateSourceRequiresDisclosure, isTrustedEstimateSource } from "./sourceQualityPolicy";
import type { ProfessionalBoqRecipeRow } from "./workPassportContract";

export type NormPackCitation = {
  rowId: string;
  rowType: string;
  normId: string;
  normSourceId: string;
  normSourceTitle: string;
  registrySourceId: string;
  sourceCitation: string;
  sourceBadge: string;
  sourceQuality: string;
  sourceVerificationStatus: string;
  trustedForProductionNorms: boolean;
  preliminaryDisclosureRequired: boolean;
  formulaProvenance: string;
  quantityTrace: string;
  pricebookSourceId: string | null;
};

export function buildNormPackCitationForRow(row: ProfessionalBoqRecipeRow): NormPackCitation {
  const resolution = resolveEstimateSourceForNormSourceId({
    normSourceId: row.normSourceId,
    normSourceTitle: row.normSourceTitle,
  });
  return {
    rowId: row.rowId,
    rowType: row.rowType,
    normId: row.normId,
    normSourceId: row.normSourceId,
    normSourceTitle: row.normSourceTitle,
    registrySourceId: resolution.registrySourceId,
    sourceCitation: formatEstimateSourceCitation(resolution),
    sourceBadge: formatEstimateSourceBadge(resolution),
    sourceQuality: resolution.record.source_quality,
    sourceVerificationStatus: resolution.record.verification_status,
    trustedForProductionNorms: isTrustedEstimateSource(resolution.record),
    preliminaryDisclosureRequired: estimateSourceRequiresDisclosure(resolution.record),
    formulaProvenance: `${row.formulaId}; ${row.quantityFormula}`,
    quantityTrace: row.calculationTraceTemplate,
    pricebookSourceId: row.priceStatus === "PRICE_MISSING" ? "missing_price_policy_quantity_only_2026_07" : null,
  };
}

export function buildNormPackCitationsForRows(rows: readonly ProfessionalBoqRecipeRow[]): NormPackCitation[] {
  return rows.map(buildNormPackCitationForRow);
}
