import type { GlobalEstimateResult } from "./globalEstimateTypes";
import {
  buildProfessionalEstimateComplexityProfile,
  minimumRowsForEstimate,
  type ProfessionalEstimateComplexityProfile,
} from "./estimateBoqDepthPolicy";

export type EstimateBoqDepthValidation = {
  passed: boolean;
  minimumRows: number;
  actualRows: number;
  complexityProfile: ProfessionalEstimateComplexityProfile;
  meaningfulRows: number;
  duplicateSemanticSignatures: string[];
  genericRows: string[];
  artificialPaddingRows: string[];
  rowsWithoutQuantity: string[];
  rowsWithoutWbs: string[];
  rowsWithoutSourceLink: string[];
  rowsWithoutPriceEvidenceOrRfq: string[];
  rowsWithoutFormulaOrTrace: string[];
  professionalWbsRowsWithoutApplicability: string[];
  professionalWbsRowsWithoutSourceApplicability: string[];
  hasMaterials: boolean;
  hasLabor: boolean;
  hasEquipmentOrDeliveryOrWarning: boolean;
  hasAssumptions: boolean;
  hasCostFactors: boolean;
  hasClarifyingQuestions: boolean;
  hasSourceEvidence: boolean;
  hasTaxStatusOrWarning: boolean;
  blockers: string[];
};

type EstimateDepthRow = {
  sectionType: GlobalEstimateResult["sections"][number]["type"];
  row: GlobalEstimateResult["sections"][number]["rows"][number];
};

function compactList(items: string[]): string {
  return items.slice(0, 12).join("|");
}

function rowId(item: EstimateDepthRow): string {
  return item.row.code || item.row.rateKey || item.row.name || item.row.rowNumber;
}

function normalizeSignatureValue(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/\s+/g, " ")
    .replace(/[.,;:()[\]{}"'`]+/g, "");
}

function semanticSignature(item: EstimateDepthRow): string {
  return [
    item.sectionType,
    normalizeSignatureValue(item.row.name),
    normalizeSignatureValue(item.row.unit),
  ].join("|");
}

function isGenericRow(item: EstimateDepthRow): boolean {
  const name = normalizeSignatureValue(item.row.name);
  const code = normalizeSignatureValue(item.row.code);
  const genericNames = new Set([
    "material",
    "materials",
    "labor",
    "work",
    "works",
    "installation",
    "mounting",
    "misc",
    "other",
    "additional materials",
    "additional works",
    "\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
    "\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
    "\u0440\u0430\u0431\u043e\u0442\u044b",
    "\u043c\u043e\u043d\u0442\u0430\u0436",
    "\u043f\u0440\u043e\u0447\u0435\u0435",
    "\u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
    "\u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
    "\u0441\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  ]);
  return genericNames.has(name) || /(?:^|_)generic(?:_|$)/.test(code);
}

function isArtificialPaddingRow(item: EstimateDepthRow): boolean {
  const name = normalizeSignatureValue(item.row.name);
  const code = normalizeSignatureValue(item.row.code);
  const rateKey = normalizeSignatureValue(item.row.rateKey ?? "");
  return /(?:^|_)(?:assurance|padding|filler|placeholder)(?:_|$)/.test(code) ||
    /(?:^|_)(?:assurance|padding|filler|placeholder)(?:_|$)/.test(rateKey) ||
    /\b(?:padding|filler|placeholder|assurance only)\b/.test(name);
}

function hasQuantity(item: EstimateDepthRow): boolean {
  return Number.isFinite(item.row.quantity) && item.row.quantity > 0 && item.row.unit.trim().length > 0;
}

function hasWbs(item: EstimateDepthRow): boolean {
  return item.sectionType !== "tax" && item.row.rowNumber.trim().length > 0;
}

function hasSourceLink(item: EstimateDepthRow): boolean {
  return Boolean(item.row.code || item.row.rateKey || item.row.sourceId || item.row.templateId || item.row.normId);
}

function hasPriceEvidenceOrRfq(item: EstimateDepthRow): boolean {
  if (item.row.priceStatus === "unavailable") return true;
  return item.row.sourceEvidence.length > 0;
}

function hasFormulaOrTrace(item: EstimateDepthRow): boolean {
  return Boolean(
    item.row.formulaId ||
      item.row.quantityFormula ||
      item.row.calculationTrace ||
      item.row.sourceParameters ||
      item.row.rateKey ||
      item.row.code,
  );
}

function isProfessionalWbsRow(item: EstimateDepthRow): boolean {
  return item.row.code.startsWith("professional_wbs_") || String(item.row.rateKey ?? "").startsWith("professional_wbs_");
}

function hasProfessionalApplicability(item: EstimateDepthRow): boolean {
  if (!isProfessionalWbsRow(item)) return true;
  return Boolean(
    item.row.applicabilityRule?.trim() &&
      item.row.applicabilityReason?.trim() &&
      item.row.scopeDriver?.trim() &&
      item.row.semanticSignature?.trim() &&
      item.row.quantityFormula?.trim() &&
      item.row.calculationTrace?.trim(),
  );
}

function hasProfessionalSourceApplicability(item: EstimateDepthRow): boolean {
  if (!isProfessionalWbsRow(item)) return true;
  const sourceParameters = item.row.sourceParameters ?? {};
  return Boolean(
    item.row.normSourceId?.trim() &&
      item.row.normSourceTitle?.trim() &&
      item.row.normVersion?.trim() &&
      item.row.normReviewStatus?.trim() &&
      String(sourceParameters.normSourceProvenance ?? "").trim() &&
      String(sourceParameters.sourceApplicabilityStatus ?? "").trim(),
  );
}

export function validateEstimateBoqDepth(result: GlobalEstimateResult): EstimateBoqDepthValidation {
  const rows: EstimateDepthRow[] = result.sections.flatMap((section) =>
    section.rows.map((row) => ({ sectionType: section.type, row })),
  );
  const complexityProfile = buildProfessionalEstimateComplexityProfile(result);
  const minimumRows = minimumRowsForEstimate(result);
  const signatureCounts = new Map<string, number>();
  for (const item of rows) {
    const signature = semanticSignature(item);
    signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
  }
  const duplicateSemanticSignatures = [...signatureCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([signature]) => signature);
  const duplicateSignatureSet = new Set(duplicateSemanticSignatures);
  const genericRows = rows.filter(isGenericRow).map(rowId);
  const artificialPaddingRows = rows.filter(isArtificialPaddingRow).map(rowId);
  const rowsWithoutQuantity = rows.filter((item) => !hasQuantity(item)).map(rowId);
  const rowsWithoutWbs = rows.filter((item) => !hasWbs(item)).map(rowId);
  const rowsWithoutSourceLink = rows.filter((item) => !hasSourceLink(item)).map(rowId);
  const rowsWithoutPriceEvidenceOrRfq = rows.filter((item) => !hasPriceEvidenceOrRfq(item)).map(rowId);
  const rowsWithoutFormulaOrTrace = rows.filter((item) => !hasFormulaOrTrace(item)).map(rowId);
  const professionalWbsRowsWithoutApplicability = rows.filter((item) => !hasProfessionalApplicability(item)).map(rowId);
  const professionalWbsRowsWithoutSourceApplicability = rows.filter((item) => !hasProfessionalSourceApplicability(item)).map(rowId);
  const meaningful = rows.filter((item) =>
    !isGenericRow(item) &&
    !isArtificialPaddingRow(item) &&
    !duplicateSignatureSet.has(semanticSignature(item)) &&
    hasQuantity(item) &&
    hasWbs(item) &&
    hasSourceLink(item) &&
    hasPriceEvidenceOrRfq(item) &&
    hasFormulaOrTrace(item) &&
    hasProfessionalApplicability(item) &&
    hasProfessionalSourceApplicability(item),
  );
  const actualRows = meaningful.length;
  const hasMaterials = meaningful.some((item) => item.sectionType === "materials");
  const hasLabor = meaningful.some((item) => item.sectionType === "labor");
  const hasEquipmentOrDeliveryOrWarning =
    meaningful.some((item) => item.sectionType === "equipment" || item.sectionType === "delivery") ||
    result.regionalRisks.length > 0 ||
    result.clarifyingQuestions.length > 0;
  const hasAssumptions = result.assumptions.length > 0;
  const hasCostFactors = result.costIncreaseFactors.length > 0;
  const hasClarifyingQuestions = result.clarifyingQuestions.length > 0;
  const hasSourceEvidence = rows.every(hasPriceEvidenceOrRfq);
  const hasTaxStatusOrWarning = Boolean(result.tax.taxType || result.tax.warning);
  const requireFullSectionEnvelope = complexityProfile.level !== "local_operation";

  const blockers: string[] = [];
  if (actualRows < minimumRows) blockers.push(`BOQ_MEANINGFUL_DEPTH_TOO_SHORT:${actualRows}<${minimumRows}`);
  if (genericRows.length > 0) blockers.push(`BOQ_GENERIC_ROWS_FOUND:${compactList(genericRows)}`);
  if (artificialPaddingRows.length > 0) blockers.push(`BOQ_ARTIFICIAL_PADDING_ROWS_FOUND:${compactList(artificialPaddingRows)}`);
  if (duplicateSemanticSignatures.length > 0) blockers.push(`BOQ_DUPLICATE_ROWS_FOUND:${compactList(duplicateSemanticSignatures)}`);
  if (rowsWithoutQuantity.length > 0) blockers.push(`BOQ_QUANTITY_MISSING:${compactList(rowsWithoutQuantity)}`);
  if (rowsWithoutWbs.length > 0) blockers.push(`BOQ_WBS_MISSING:${compactList(rowsWithoutWbs)}`);
  if (rowsWithoutSourceLink.length > 0) blockers.push(`BOQ_SOURCE_LINK_MISSING:${compactList(rowsWithoutSourceLink)}`);
  if (rowsWithoutPriceEvidenceOrRfq.length > 0) blockers.push(`BOQ_PRICE_EVIDENCE_OR_RFQ_MISSING:${compactList(rowsWithoutPriceEvidenceOrRfq)}`);
  if (rowsWithoutFormulaOrTrace.length > 0) blockers.push(`BOQ_FORMULA_OR_TRACE_MISSING:${compactList(rowsWithoutFormulaOrTrace)}`);
  if (professionalWbsRowsWithoutApplicability.length > 0) blockers.push(`BOQ_PROFESSIONAL_WBS_APPLICABILITY_MISSING:${compactList(professionalWbsRowsWithoutApplicability)}`);
  if (professionalWbsRowsWithoutSourceApplicability.length > 0) blockers.push(`BOQ_PROFESSIONAL_WBS_SOURCE_APPLICABILITY_MISSING:${compactList(professionalWbsRowsWithoutSourceApplicability)}`);
  if (requireFullSectionEnvelope && !hasMaterials) blockers.push("BOQ_MATERIALS_GROUP_MISSING");
  if (requireFullSectionEnvelope && !hasLabor) blockers.push("BOQ_LABOR_GROUP_MISSING");
  if (requireFullSectionEnvelope && !hasEquipmentOrDeliveryOrWarning) blockers.push("BOQ_EQUIPMENT_DELIVERY_OR_WARNING_MISSING");
  if (!hasAssumptions) blockers.push("BOQ_ASSUMPTIONS_MISSING");
  if (!hasCostFactors) blockers.push("BOQ_COST_FACTORS_MISSING");
  if (!hasClarifyingQuestions) blockers.push("BOQ_CLARIFYING_QUESTIONS_MISSING");
  if (!hasSourceEvidence) blockers.push("BOQ_SOURCE_EVIDENCE_MISSING");
  if (!hasTaxStatusOrWarning) blockers.push("BOQ_TAX_STATUS_OR_WARNING_MISSING");

  return {
    passed: blockers.length === 0,
    minimumRows,
    actualRows,
    complexityProfile,
    meaningfulRows: actualRows,
    duplicateSemanticSignatures,
    genericRows,
    artificialPaddingRows,
    rowsWithoutQuantity,
    rowsWithoutWbs,
    rowsWithoutSourceLink,
    rowsWithoutPriceEvidenceOrRfq,
    rowsWithoutFormulaOrTrace,
    professionalWbsRowsWithoutApplicability,
    professionalWbsRowsWithoutSourceApplicability,
    hasMaterials,
    hasLabor,
    hasEquipmentOrDeliveryOrWarning,
    hasAssumptions,
    hasCostFactors,
    hasClarifyingQuestions,
    hasSourceEvidence,
    hasTaxStatusOrWarning,
    blockers,
  };
}
