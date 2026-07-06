import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "./buildProfessionalWorkPassport";
import { PROFESSIONAL_WORK_PASSPORT_TOTAL } from "./professionalWorkPassportRegistry";
import { buildNormPackCitationsForRows } from "./normPackCitationContract";
import { validateNormPackCitations } from "./validateNormPackCitations";
import type {
  WorkPassportSourceCitationValidation,
  WorkPassportSourceCoverageSummary,
} from "./workPassportCitationContract";

function addReason(reasons: string[], reason: string): void {
  if (reason && !reasons.includes(reason)) reasons.push(reason);
}

export function validateWorkPassportSources(): {
  summary: WorkPassportSourceCoverageSummary;
  validations: WorkPassportSourceCitationValidation[];
} {
  const validations: WorkPassportSourceCitationValidation[] = [];
  const allSourceRegistryIds = new Set<string>();
  let rowsAudited = 0;
  let sourceCitationsAttached = 0;
  let blockedTemplates = 0;
  let rowsWithoutNormSource = 0;
  let rowsWithoutSourceCitation = 0;
  let formulasWithoutProvenance = 0;
  let rowsWithoutQuantityTrace = 0;
  let rowsWithPrice = 0;
  let priceRowsWithoutPricebookSource = 0;
  let unverifiedSourcesUsedAsTrusted = 0;
  let preliminaryRowsWithVisibleDisclosure = 0;
  const blockingReasons: string[] = [];

  for (const [index, templateId] of listProfessionalWorkPassportTemplateIds().entries()) {
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) {
      blockedTemplates += 1;
      const reason = `${templateId}:passport_missing`;
      blockingReasons.push(reason);
      validations.push({
        template_id: templateId,
        row_count: 0,
        rows_with_source_citation_count: 0,
        rows_without_norm_source_count: 0,
        rows_without_source_citation_count: 0,
        rows_without_formula_provenance_count: 0,
        rows_without_quantity_trace_count: 0,
        rows_with_price_count: 0,
        price_rows_without_pricebook_source_count: 0,
        unverified_sources_used_as_trusted_count: 0,
        preliminary_rows_with_visible_disclosure_count: 0,
        source_registry_ids: [],
        blocking_reasons: ["passport_missing"],
      });
      continue;
    }

    const citations = buildNormPackCitationsForRows(passport.boqRecipe.allRows);
    const sourceRegistryIds = [...new Set(citations.map((citation) => citation.registrySourceId))].sort();
    sourceRegistryIds.forEach((sourceId) => allSourceRegistryIds.add(sourceId));
    const citationSummary = validateNormPackCitations(passport.boqRecipe.allRows);
    const validation: WorkPassportSourceCitationValidation = {
      template_id: passport.templateId,
      row_count: citationSummary.rows_audited,
      rows_with_source_citation_count: citationSummary.rows_with_source_citation_count,
      rows_without_norm_source_count: citationSummary.rows_without_norm_source_count,
      rows_without_source_citation_count: citationSummary.rows_without_source_citation_count,
      rows_without_formula_provenance_count: citationSummary.rows_without_formula_provenance_count,
      rows_without_quantity_trace_count: citationSummary.rows_without_quantity_trace_count,
      rows_with_price_count: citationSummary.rows_with_price_count,
      price_rows_without_pricebook_source_count: citationSummary.price_rows_without_pricebook_source_count,
      unverified_sources_used_as_trusted_count: citationSummary.unverified_sources_used_as_trusted_count,
      preliminary_rows_with_visible_disclosure_count: citationSummary.preliminary_rows_with_visible_disclosure_count,
      source_registry_ids: sourceRegistryIds,
      blocking_reasons: citationSummary.blockers,
    };
    validations.push(validation);
    rowsAudited += validation.row_count;
    sourceCitationsAttached += validation.rows_with_source_citation_count;
    rowsWithoutNormSource += validation.rows_without_norm_source_count;
    rowsWithoutSourceCitation += validation.rows_without_source_citation_count;
    formulasWithoutProvenance += validation.rows_without_formula_provenance_count;
    rowsWithoutQuantityTrace += validation.rows_without_quantity_trace_count;
    rowsWithPrice += validation.rows_with_price_count;
    priceRowsWithoutPricebookSource += validation.price_rows_without_pricebook_source_count;
    unverifiedSourcesUsedAsTrusted += validation.unverified_sources_used_as_trusted_count;
    preliminaryRowsWithVisibleDisclosure += validation.preliminary_rows_with_visible_disclosure_count;
    if (validation.blocking_reasons.length > 0) {
      blockedTemplates += 1;
      for (const reason of validation.blocking_reasons) addReason(blockingReasons, `${validation.template_id}:${reason}`);
    }
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  clearProfessionalWorkPassportBuildCaches();

  const allPassportsAudited = validations.length === PROFESSIONAL_WORK_PASSPORT_TOTAL;
  const summary: WorkPassportSourceCoverageSummary = {
    templates_audited: validations.length,
    rows_audited: rowsAudited,
    source_citations_attached_to_boq_rows_count: sourceCitationsAttached,
    blocked_templates_count: blockedTemplates,
    rows_without_norm_source_count: rowsWithoutNormSource,
    rows_without_source_citation_count: rowsWithoutSourceCitation,
    formulas_without_provenance_count: formulasWithoutProvenance,
    rows_without_quantity_trace_count: rowsWithoutQuantityTrace,
    rows_with_price_count: rowsWithPrice,
    price_rows_without_pricebook_source_count: priceRowsWithoutPricebookSource,
    unverified_sources_used_as_trusted_count: unverifiedSourcesUsedAsTrusted,
    preliminary_rows_with_visible_disclosure_count: preliminaryRowsWithVisibleDisclosure,
    source_registry_ids_used_count: allSourceRegistryIds.size,
    all_11610_work_passports_have_norm_source_citations: allPassportsAudited && blockedTemplates === 0,
    all_boq_rows_have_norm_source_citation: rowsAudited > 0 && rowsWithoutSourceCitation === 0,
    all_boq_rows_have_formula_provenance: rowsAudited > 0 && formulasWithoutProvenance === 0,
    all_boq_rows_have_quantity_trace: rowsAudited > 0 && rowsWithoutQuantityTrace === 0,
    all_price_rows_have_pricebook_source_or_missing_price_policy: priceRowsWithoutPricebookSource === 0,
    blocking_reasons: [
      ...blockingReasons,
      allPassportsAudited ? "" : `templates_audited_mismatch:${validations.length}:${PROFESSIONAL_WORK_PASSPORT_TOTAL}`,
    ].filter(Boolean),
  };
  return { summary, validations };
}
