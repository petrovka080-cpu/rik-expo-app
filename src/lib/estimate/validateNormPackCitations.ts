import { isUnverifiedSourceUsedAsTrusted } from "./sourceQualityPolicy";
import { resolveEstimateSourceForNormSourceId } from "./sourceRegistry";
import type { ProfessionalBoqRecipeRow } from "./workPassportContract";
import { buildNormPackCitationsForRows } from "./normPackCitationContract";

export type NormPackCitationValidationSummary = {
  rows_audited: number;
  rows_with_source_citation_count: number;
  rows_without_norm_source_count: number;
  rows_without_source_citation_count: number;
  rows_without_formula_provenance_count: number;
  rows_without_quantity_trace_count: number;
  rows_with_price_count: number;
  price_rows_without_pricebook_source_count: number;
  unverified_sources_used_as_trusted_count: number;
  preliminary_rows_with_visible_disclosure_count: number;
  citation_contract_passed: boolean;
  blockers: string[];
};

function hasFormulaProvenance(row: ProfessionalBoqRecipeRow): boolean {
  return Boolean(row.formulaId.trim() && row.quantityFormula.trim());
}

function hasQuantityTrace(row: ProfessionalBoqRecipeRow): boolean {
  return /formula=|result=/i.test(row.calculationTraceTemplate) && row.calculationTraceTemplate.includes(row.normSourceId);
}

export function validateNormPackCitations(rows: readonly ProfessionalBoqRecipeRow[]): NormPackCitationValidationSummary {
  const citations = buildNormPackCitationsForRows(rows);
  let rowsWithoutNormSource = 0;
  let rowsWithoutSourceCitation = 0;
  let rowsWithoutFormulaProvenance = 0;
  let rowsWithoutQuantityTrace = 0;
  let rowsWithPrice = 0;
  let priceRowsWithoutPricebookSource = 0;
  let unverifiedSourcesUsedAsTrusted = 0;
  let preliminaryRowsWithVisibleDisclosure = 0;

  for (const [index, row] of rows.entries()) {
    const citation = citations[index];
    const resolution = resolveEstimateSourceForNormSourceId({
      normSourceId: row.normSourceId,
      normSourceTitle: row.normSourceTitle,
    });
    if (!row.normSourceId || !row.normId || !row.normVersion) rowsWithoutNormSource += 1;
    if (!citation.sourceCitation.trim() || resolution.matchedBy === "fallback") rowsWithoutSourceCitation += 1;
    if (!hasFormulaProvenance(row)) rowsWithoutFormulaProvenance += 1;
    if (!hasQuantityTrace(row)) rowsWithoutQuantityTrace += 1;
    if (row.priceStatus !== "PRICE_MISSING") {
      rowsWithPrice += 1;
      if (!citation.pricebookSourceId) priceRowsWithoutPricebookSource += 1;
    }
    if (isUnverifiedSourceUsedAsTrusted(resolution.record)) unverifiedSourcesUsedAsTrusted += 1;
    if (citation.preliminaryDisclosureRequired && /preliminary/i.test(citation.sourceCitation)) {
      preliminaryRowsWithVisibleDisclosure += 1;
    }
  }

  const blockers = [
    rows.length === 0 ? "rows_missing" : "",
    rowsWithoutNormSource > 0 ? `rows_without_norm_source:${rowsWithoutNormSource}` : "",
    rowsWithoutSourceCitation > 0 ? `rows_without_source_citation:${rowsWithoutSourceCitation}` : "",
    rowsWithoutFormulaProvenance > 0 ? `rows_without_formula_provenance:${rowsWithoutFormulaProvenance}` : "",
    rowsWithoutQuantityTrace > 0 ? `rows_without_quantity_trace:${rowsWithoutQuantityTrace}` : "",
    priceRowsWithoutPricebookSource > 0 ? `price_rows_without_pricebook_source:${priceRowsWithoutPricebookSource}` : "",
    unverifiedSourcesUsedAsTrusted > 0 ? `unverified_sources_used_as_trusted:${unverifiedSourcesUsedAsTrusted}` : "",
  ].filter(Boolean);

  return {
    rows_audited: rows.length,
    rows_with_source_citation_count: rows.length - rowsWithoutSourceCitation,
    rows_without_norm_source_count: rowsWithoutNormSource,
    rows_without_source_citation_count: rowsWithoutSourceCitation,
    rows_without_formula_provenance_count: rowsWithoutFormulaProvenance,
    rows_without_quantity_trace_count: rowsWithoutQuantityTrace,
    rows_with_price_count: rowsWithPrice,
    price_rows_without_pricebook_source_count: priceRowsWithoutPricebookSource,
    unverified_sources_used_as_trusted_count: unverifiedSourcesUsedAsTrusted,
    preliminary_rows_with_visible_disclosure_count: preliminaryRowsWithVisibleDisclosure,
    citation_contract_passed: blockers.length === 0,
    blockers,
  };
}
