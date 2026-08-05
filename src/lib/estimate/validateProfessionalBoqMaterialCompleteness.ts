import type { ProfessionalBoqRow } from "./estimateDraftRevisionContract";
import type { ProfessionalBoqLineItemQuality } from "./professionalBoqLineItemQualityContract";
import { buildProfessionalBoqGroupedMainViewModel } from "./professionalBoqSectionPolicy";
import {
  buildProfessionalBoqLineItemQualityFromDraftRow,
  isGenericProfessionalBoqLineItemName,
} from "./validateProfessionalBoqLineItemQuality";
import {
  buildProfessionalBoqMaterialSlotsFromPolicies,
  professionalBoqMaterialSlotPoliciesFor,
} from "./professionalBoqMaterialSlotRegistry";
import type {
  FamilyMaterialSlotPolicy,
  ProfessionalBoqMaterialCompletenessBlockingReason,
  ProfessionalBoqMaterialCompletenessValidation,
  ProfessionalBoqRowsArtifactSet,
} from "./professionalBoqMaterialCompletenessContract";
import { validateProfessionalBoqNoTruncation } from "./validateProfessionalBoqNoTruncation";
import type { ProfessionalWorkPassport, ProfessionalBoqRecipeRow } from "./workPassportContract";
import { attachProfessionalMaterialQuantityLines } from "./professionalMaterialQuantityCalculator";

const FAKE_FILLER_RE = /\b(?:fake|placeholder|todo|dummy|filler|заполнитель|заглушка строки|для количества)\b/i;
const MATERIAL_BUCKET_RE = /^(?:материал|материалы|прочие материалы|комплект материалов|дополнительные материалы)$/i;

function materialLikeRows(rows: readonly ProfessionalBoqRow[]): ProfessionalBoqRow[] {
  return rows.filter((row) =>
    row.rowType === "material" ||
    row.rowType === "equipment" ||
    row.rowType === "service" ||
    row.rowType === "transport"
  );
}

function duplicateNoiseCount(rows: readonly ProfessionalBoqRow[]): number {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = [row.rowType, row.titleRu.trim().toLocaleLowerCase("ru-RU"), row.unit].join("|");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count >= 6).reduce((sum, count) => sum + count, 0);
}

function pdfRowsCountFromBody(body: string | null | undefined, rows: readonly ProfessionalBoqRow[]): number | undefined {
  if (!body) return undefined;
  return rows.filter((row) => body.includes(row.rowId)).length;
}

function qualityRows(input: {
  rows: readonly ProfessionalBoqRow[];
  templateId: string;
  family: string;
}): ProfessionalBoqLineItemQuality[] {
  return input.rows.map((row) => buildProfessionalBoqLineItemQualityFromDraftRow({
    row,
    templateId: input.templateId,
    family: input.family,
  }));
}

function blockingReasons(input: {
  noTruncation: ReturnType<typeof validateProfessionalBoqNoTruncation>;
  missingRequiredSlotsCount: number;
  genericMaterialBucketCount: number;
  fakeFillerMaterialCount: number;
  materialQuantityWithoutFormulaCount: number;
  materialWithoutSourceCitationCount: number;
  duplicateNoiseRowsCount: number;
}): ProfessionalBoqMaterialCompletenessBlockingReason[] {
  return [
    input.noTruncation.backendRowCapDetected ? "backend_row_cap_45_detected" : null,
    input.noTruncation.snapshotTruncationDetected ? "snapshot_rows_less_than_calculator_rows" : null,
    input.noTruncation.detailDrawerTruncationDetected ? "detail_drawer_rows_less_than_snapshot_rows" : null,
    input.noTruncation.pdfTruncationDetected ? "pdf_rows_less_than_snapshot_rows" : null,
    input.noTruncation.buyerHandoffTruncationDetected ? "buyer_handoff_missing_procurement_rows" : null,
    input.missingRequiredSlotsCount > 0 ? "required_material_slot_missing" : null,
    input.genericMaterialBucketCount > 0 ? "generic_material_bucket_used" : null,
    input.fakeFillerMaterialCount > 0 ? "fake_filler_material_used" : null,
    input.materialQuantityWithoutFormulaCount > 0 ? "material_quantity_without_formula" : null,
    input.materialWithoutSourceCitationCount > 0 ? "material_without_source_citation" : null,
    input.duplicateNoiseRowsCount > 0 ? "duplicate_noise_rows_found" : null,
  ].filter(Boolean) as ProfessionalBoqMaterialCompletenessBlockingReason[];
}

export function validateProfessionalBoqMaterialCompleteness(input: {
  templateId: string;
  family: string;
  prompt: string;
  rows: readonly ProfessionalBoqRow[];
  snapshotRows?: readonly ProfessionalBoqRow[];
  detailDrawerRowsCount?: number;
  pdfBody?: string | null;
  pdfRowsCount?: number;
  buyerHandoffRowIds?: readonly string[];
  policies?: readonly FamilyMaterialSlotPolicy[];
  passport?: ProfessionalWorkPassport | null;
}): ProfessionalBoqMaterialCompletenessValidation {
  const policies = input.policies ?? professionalBoqMaterialSlotPoliciesFor({
    family: input.family,
    templateId: input.templateId,
    passport: input.passport,
  });
  const rows = input.rows;
  const snapshotRows = input.snapshotRows ?? rows;
  const rowsArtifactSet: ProfessionalBoqRowsArtifactSet = {
    calculatorRows: rows,
    snapshotRows,
    detailDrawerRowsCount: input.detailDrawerRowsCount,
    pdfBody: input.pdfBody,
    pdfRowsCount: input.pdfRowsCount ?? pdfRowsCountFromBody(input.pdfBody, snapshotRows),
    buyerHandoffRowIds: input.buyerHandoffRowIds,
  };
  const noTruncation = validateProfessionalBoqNoTruncation(rowsArtifactSet);
  const slotResult = buildProfessionalBoqMaterialSlotsFromPolicies({
    policies,
    rows,
    prompt: input.prompt,
  });
  const quality = qualityRows({ rows, templateId: input.templateId, family: input.family });
  const grouped = buildProfessionalBoqGroupedMainViewModel(quality);
  const materialRows = materialLikeRows(rows);
  const genericMaterialBucketCount = materialRows.filter((row) =>
    MATERIAL_BUCKET_RE.test(row.titleRu.trim()) || isGenericProfessionalBoqLineItemName(row.titleRu)
  ).length;
  const fakeFillerMaterialCount = materialRows.filter((row) => FAKE_FILLER_RE.test(row.titleRu)).length;
  const materialQuantityWithoutFormulaCount = materialRows.filter((row) =>
    !row.formulaId?.trim() || !row.quantityFormula?.trim() || !row.calculationTrace?.trim()
  ).length;
  const materialWithoutSourceCitationCount = materialRows.filter((row) =>
    !((row.normId?.trim() || row.sourceId?.trim()) && row.normSourceId?.trim() && row.normSourceTitle?.trim())
  ).length;
  const duplicateNoiseRowsCount = duplicateNoiseCount(rows);
  const reasons = blockingReasons({
    noTruncation,
    missingRequiredSlotsCount: slotResult.missingRequiredSlots.length,
    genericMaterialBucketCount,
    fakeFillerMaterialCount,
    materialQuantityWithoutFormulaCount,
    materialWithoutSourceCitationCount,
    duplicateNoiseRowsCount,
  });

  return {
    passed: reasons.length === 0,
    blockingReasons: reasons,
    completeness: {
      templateId: input.templateId,
      family: input.family,
      prompt: input.prompt,
      fullBoqRowsCount: rows.length,
      visibleMainRowsCount: grouped.visibleRowsCount,
      requiredMaterialSlots: slotResult.requiredSlots,
      missingRequiredSlots: slotResult.missingRequiredSlots,
      missingOptionalButExpectedSlots: slotResult.missingOptionalButExpectedSlots,
      fullSnapshotRowsCount: noTruncation.snapshotRowsCount,
      pdfRowsCount: noTruncation.pdfRowsCount,
      buyerHandoffRowsCount: noTruncation.buyerHandoffRowsCount,
      rowCapDetected: noTruncation.backendRowCapDetected,
      backendTruncationDetected: noTruncation.snapshotTruncationDetected,
      pdfTruncationDetected: noTruncation.pdfTruncationDetected,
      buyerTruncationDetected: noTruncation.buyerHandoffTruncationDetected,
    },
    genericMaterialBucketCount,
    fakeFillerMaterialCount,
    materialQuantityWithoutFormulaCount,
    materialWithoutSourceCitationCount,
    duplicateNoiseRowsCount,
    procurementRowsExpectedCount: noTruncation.expectedProcurementRowsCount,
    buyerHandoffMissingProcurementRowIds: noTruncation.buyerHandoffMissingProcurementRowIds,
  };
}

function rowType(row: ProfessionalBoqRecipeRow): ProfessionalBoqRow["rowType"] {
  return row.rowType === "labor" ? "labor" : row.rowType;
}

export function professionalBoqRowsFromPassport(passport: ProfessionalWorkPassport): ProfessionalBoqRow[] {
  const rows = passport.boqRecipe.allRows.map((row) => ({
    rowId: row.rowId,
    rowType: rowType(row),
    titleRu: row.titleRu,
    quantity: 1,
    unit: row.sourceUnit,
    unitLabel: row.sourceUnit,
    unitPrice: null,
    currency: "KGS",
    category: row.rowType,
    sourceId: row.normSourceId,
    sourceLabel: row.normSourceTitle,
    formulaId: row.formulaId,
    quantityFormula: row.quantityFormula,
    calculationTrace: row.calculationTraceTemplate,
    sourceParameters: null,
    templateId: passport.templateId,
    templateVersion: passport.templateKind,
    normId: row.normId,
    normFamilyId: row.normFamilyId,
    normSourceId: row.normSourceId,
    normSourceTitle: row.normSourceTitle,
    normVersion: row.normVersion,
    normReviewStatus: row.normReviewStatus,
    priceStatus: row.priceStatus,
    priceSource: "missing",
    priceSourceId: null,
    priceSourceLabel: "Источник цены не выбран",
    materialKey: row.buyerHandoffRole === "procurement_item" ? row.rowId : null,
    rateKey: row.rowId,
    includedInProcurement: row.includedInProcurement,
    materialQuantity: null,
  }));
  return attachProfessionalMaterialQuantityLines({
    rows,
    templateId: passport.templateId,
    family: passport.familyId,
  });
}

export function validateProfessionalBoqMaterialCompletenessForPassport(
  passport: ProfessionalWorkPassport,
  precomputedRows?: readonly ProfessionalBoqRow[],
): ProfessionalBoqMaterialCompletenessValidation {
  const rows = precomputedRows ?? professionalBoqRowsFromPassport(passport);
  const buyerHandoffRowIds = rows
    .filter((row) => row.includedInProcurement)
    .filter((row) => row.rowType !== "work" && row.rowType !== "labor")
    .map((row) => row.rowId);
  return validateProfessionalBoqMaterialCompleteness({
    templateId: passport.templateId,
    family: passport.familyId,
    prompt: passport.localizedNameRu,
    rows,
    snapshotRows: rows,
    detailDrawerRowsCount: rows.length,
    pdfRowsCount: rows.length,
    buyerHandoffRowIds,
    passport,
  });
}
