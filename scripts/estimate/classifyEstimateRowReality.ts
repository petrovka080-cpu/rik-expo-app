import {
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";
import { isAdmittedProfessionalNormSource } from "../../src/lib/estimate/professionalNormSourceAdmission";

export type EstimateRealityRowInput = {
  rowCode?: string | null;
  rowId?: string | null;
  titleRu?: string | null;
  name?: string | null;
  section?: string | null;
  sectionType?: string | null;
  lineType?: string | null;
  unit?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  total?: number | null;
  priceStatus?: string | null;
  priceTrace?: unknown;
  calculationTrace?: string | null;
  quantityFormula?: string | null;
  formulaId?: string | null;
  normId?: string | null;
  normSourceId?: string | null;
  normSourceTitle?: string | null;
  normVersion?: string | null;
  sourceParameters?: Record<string, unknown> | null;
  includedInProcurement?: boolean | null;
};

export type EstimateQuantityDimension =
  | "area"
  | "volume"
  | "length"
  | "mass"
  | "count"
  | "time"
  | "other"
  | "unknown";

export type EstimateRowRealityClassification = {
  row_id: string;
  section_type: string;
  title: string;
  unit: string;
  quantity: number | null;
  norm_source_id: string;
  claims_professional_source_prefix: boolean;
  is_source_backed: boolean;
  is_generated: boolean;
  is_family_default: boolean;
  is_historical_price_only: boolean;
  source_status:
    | "READY_SOURCE_BACKED"
    | "GENERIC_FAMILY_DEFAULT"
    | "INVALID_FAKE_SOURCE"
    | "UNKNOWN_SOURCE";
  has_norm_id: boolean;
  has_norm_version: boolean;
  has_formula_trace: boolean;
  has_price_source: boolean;
  missing_price_state: boolean;
  suspicious_material_m2: boolean;
  quantity_copied_from_user_input: boolean;
  blind_copy_without_formula_trace: boolean;
  identity_formula_without_verified_coefficient: boolean;
  unit_dimension_mismatch: boolean;
  formula_mechanically_compilable: boolean;
  formula_runtime_valid: boolean;
  formula_semantic_unverified: boolean;
  norm_source_unregistered: boolean;
  norm_source_verified: boolean;
  required_parameters_valid: boolean;
  procurement_applicable: boolean;
  price_covered: boolean;
  professional_ready: boolean;
  base_unit: string;
  base_dimension: EstimateQuantityDimension;
  row_dimension: EstimateQuantityDimension;
  blocking_reasons: string[];
};

function rowId(row: EstimateRealityRowInput): string {
  return String(row.rowCode ?? row.rowId ?? "").trim() || "unknown_row";
}

function rowTitle(row: EstimateRealityRowInput): string {
  return String(row.titleRu ?? row.name ?? "").trim();
}

function sectionType(row: EstimateRealityRowInput): string {
  return String(row.section ?? row.sectionType ?? "").trim();
}

const UNIT_DIMENSION_BY_KEY: Readonly<Record<string, EstimateQuantityDimension>> = Object.freeze({
  m2: "area",
  "m²": "area",
  sqm: "area",
  sq_m: "area",
  square_m: "area",
  square_meter: "area",
  m3: "volume",
  "m³": "volume",
  cbm: "volume",
  cubic_m: "volume",
  cubic_meter: "volume",
  m: "length",
  lm: "length",
  linear_m: "length",
  meter: "length",
  metre: "length",
  kg: "mass",
  kilogram: "mass",
  t: "mass",
  ton: "mass",
  tonne: "mass",
  piece: "count",
  pieces: "count",
  pcs: "count",
  pc: "count",
  set: "count",
  sets: "count",
  trip: "count",
  trips: "count",
  point: "count",
  points: "count",
  h: "time",
  hr: "time",
  hour: "time",
  hours: "time",
  man_hour: "time",
  machine_hour: "time",
});

function unitDimension(unitValue: unknown): EstimateQuantityDimension {
  const rawUnit = String(unitValue ?? "");
  const direct = UNIT_DIMENSION_BY_KEY[rawUnit];
  if (direct) return direct;
  const unit = rawUnit.trim().toLowerCase().replace(/\s+/g, "_");
  if (!unit) return "unknown";
  return UNIT_DIMENSION_BY_KEY[unit] ?? "other";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function traceResult(trace: string): number | null {
  const marker = "result=";
  const markerIndex = trace.lastIndexOf(marker);
  if (markerIndex < 0) return null;
  const separatorIndex = trace.lastIndexOf(";", markerIndex);
  if (markerIndex > 0) {
    const prefix = trace.slice(separatorIndex + 1, markerIndex);
    if (separatorIndex < 0 || prefix.trim() !== "") return null;
  }
  const valueStart = markerIndex + marker.length;
  let valueEnd = valueStart;
  while (valueEnd < trace.length) {
    const code = trace.charCodeAt(valueEnd);
    if (code === 59 || code === 32 || code === 9 || code === 10 || code === 13) break;
    valueEnd += 1;
  }
  const value = trace.slice(valueStart, valueEnd);
  if (!/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value)) return null;
  return finiteNumber(Number(value));
}

function requiredParametersValid(sourceParameters: Record<string, unknown> | null | undefined): boolean {
  const requirements = sourceParameters?.normParameterRequirements;
  if (!Array.isArray(requirements)) return false;
  const context = sourceParameters?.formulaContext;
  if (!context || typeof context !== "object" || Array.isArray(context)) return false;
  const values = context as Record<string, unknown>;
  for (const requirement of requirements) {
    if (!requirement || typeof requirement !== "object" || Array.isArray(requirement)) return false;
    const record = requirement as Record<string, unknown>;
    if (record.required !== true) continue;
    const key = String(record.key ?? "").trim();
    if (!key || values[key] === undefined || values[key] === null) return false;
  }
  return true;
}

export function isGeneratedFamilyDefaultSource(sourceId: string | null | undefined): boolean {
  const value = String(sourceId ?? "").trim();
  if (!value) return false;
  if (isProfessionalNormPackSourceId(value)) return false;
  return (
    value.includes("generated_family_default") ||
    value.includes("family_default") ||
    value.startsWith("src_norm_") ||
    value.startsWith("src_generated_")
  );
}

type EstimateRealitySummaryAccumulator = {
  rowCount: number;
  professionalSourcePrefixClaimCount: number;
  sourceBackedCount: number;
  genericFamilyDefaultCount: number;
  invalidFakeSourceCount: number;
  suspiciousMaterialM2Count: number;
  blindQuantityCopyCount: number;
  blindCopyWithoutFormulaTraceCount: number;
  identityFormulaWithoutVerifiedCoefficientCount: number;
  unitDimensionMismatchCount: number;
  formulaMechanicallyCompilableCount: number;
  formulaRuntimeValidCount: number;
  formulaSemanticUnverifiedCount: number;
  normSourceUnregisteredCount: number;
  normSourceVerifiedCount: number;
  requiredParametersValidCount: number;
  procurementApplicableCount: number;
  priceCoveredCount: number;
  professionalReadyCount: number;
  missingFormulaTraceCount: number;
};

function classifyEstimateRowRealityInternal(
  row: EstimateRealityRowInput,
  summary?: EstimateRealitySummaryAccumulator,
): EstimateRowRealityClassification | null {
  const sourceId = String(row.normSourceId ?? row.sourceParameters?.normSourceId ?? "").trim();
  const claimsProfessionalSourcePrefix = isProfessionalNormPackSourceId(sourceId);
  const normSourceVerified = isAdmittedProfessionalNormSource({
    normSourceId: sourceId,
    normId: row.normId,
    normVersion: row.normVersion,
    sourceParameters: row.sourceParameters,
  });
  const isSourceBacked = normSourceVerified;
  const normSourceUnregistered = !normSourceVerified;
  const isFamilyDefault = !claimsProfessionalSourcePrefix && Boolean(sourceId) && (
    sourceId.includes("generated_family_default") ||
    sourceId.includes("family_default") ||
    sourceId.startsWith("src_norm_") ||
    sourceId.startsWith("src_generated_")
  );
  const isGenerated = isFamilyDefault || sourceId.includes("generated");
  const isHistoricalPriceOnly =
    String(row.sourceParameters?.priceSourceType ?? "").includes("historical") ||
    String(row.priceStatus ?? "").includes("historical");
  const trace = String(row.calculationTrace ?? "");
  const title = rowTitle(row);
  const rowSectionType = sectionType(row);
  const unit = String(row.unit ?? "").trim();
  const quantity = typeof row.quantity === "number" && Number.isFinite(row.quantity) ? row.quantity : null;
  const baseQuantity = finiteNumber(row.sourceParameters?.baseQuantity);
  const baseUnit = String(row.sourceParameters?.baseUnit ?? "").trim();
  const baseDimension = unitDimension(baseUnit);
  const rowDimension = unitDimension(unit);
  const formula = String(row.quantityFormula ?? "").trim();
  const mechanicallyCompilable = Boolean(row.formulaId && formula);
  const hasFormulaTrace = Boolean(
    mechanicallyCompilable &&
    trace.includes(`formula=${formula}`) &&
    trace.includes("result="),
  );
  const tracedResult = traceResult(trace);
  const formulaRuntimeValid = Boolean(
    hasFormulaTrace &&
    quantity != null &&
    tracedResult != null &&
    Math.abs(quantity - tracedResult) < 0.0001,
  );
  const sameAsBase =
    quantity != null &&
    baseQuantity != null &&
    Math.abs(quantity - baseQuantity) < 0.0001;
  const formulaContext = row.sourceParameters?.formulaContext;
  const formulaContextRecord =
    formulaContext && typeof formulaContext === "object" && !Array.isArray(formulaContext)
      ? formulaContext as Record<string, unknown>
      : {};
  const normFactor = finiteNumber(formulaContextRecord.normFactor);
  const unitConversionFactor = finiteNumber(formulaContextRecord.unitConversionFactor);
  const identityCoefficient =
    sameAsBase &&
    (normFactor == null || Math.abs(normFactor - 1) < 0.0001) &&
    (unitConversionFactor == null || Math.abs(unitConversionFactor - 1) < 0.0001);
  const blindCopyWithoutFormulaTrace = !hasFormulaTrace && sameAsBase;
  const identityFormulaWithoutVerifiedCoefficient =
    hasFormulaTrace && identityCoefficient && !normSourceVerified;
  const dimensionsKnown = baseDimension !== "unknown" && rowDimension !== "unknown";
  const dimensionsDiffer = dimensionsKnown && baseDimension !== rowDimension;
  const dimensionConversionProven = Boolean(
    normSourceVerified &&
    String(row.sourceParameters?.normBaseUnit ?? "").trim() === baseUnit &&
    String(row.sourceParameters?.normUnit ?? "").trim() === unit,
  );
  const unitDimensionMismatch =
    dimensionsDiffer && (!dimensionConversionProven || identityFormulaWithoutVerifiedCoefficient);
  const parametersValid = requiredParametersValid(row.sourceParameters);
  const formulaSemanticUnverified =
    !formulaRuntimeValid ||
    !parametersValid ||
    normSourceUnregistered ||
    identityFormulaWithoutVerifiedCoefficient ||
    unitDimensionMismatch;
  const quantityCopiedFromUserInput = blindCopyWithoutFormulaTrace;
  const hasPriceSource = Boolean(row.priceTrace || (row.unitPrice != null && Number.isFinite(row.unitPrice)));
  const missingPriceState =
    row.unitPrice == null &&
    row.total == null &&
    (row.priceStatus === "PRICE_MISSING" || row.priceStatus === "missing" || row.priceStatus == null);
  const materialLike = rowSectionType === "materials" || row.lineType === "material";
  const procurementApplicable = row.includedInProcurement === true || materialLike;
  const priceCovered = procurementApplicable && hasPriceSource && !missingPriceState && !isHistoricalPriceOnly;
  const suspiciousMaterialM2 = materialLike && unit === "m2" && !isSourceBacked;
  const sourceStatus = isSourceBacked
    ? "READY_SOURCE_BACKED"
    : isFamilyDefault
      ? "GENERIC_FAMILY_DEFAULT"
      : sourceId
        ? "INVALID_FAKE_SOURCE"
        : "UNKNOWN_SOURCE";
  const professionalReady =
    mechanicallyCompilable &&
    formulaRuntimeValid &&
    parametersValid &&
    !unitDimensionMismatch &&
    normSourceVerified &&
    !identityFormulaWithoutVerifiedCoefficient &&
    (!procurementApplicable || priceCovered) &&
    Boolean(row.normId && row.normVersion);
  if (summary) {
    summary.rowCount += 1;
    if (claimsProfessionalSourcePrefix) summary.professionalSourcePrefixClaimCount += 1;
    if (isSourceBacked) summary.sourceBackedCount += 1;
    if (isFamilyDefault) summary.genericFamilyDefaultCount += 1;
    if (sourceStatus === "INVALID_FAKE_SOURCE") summary.invalidFakeSourceCount += 1;
    if (suspiciousMaterialM2) summary.suspiciousMaterialM2Count += 1;
    if (quantityCopiedFromUserInput) summary.blindQuantityCopyCount += 1;
    if (blindCopyWithoutFormulaTrace) summary.blindCopyWithoutFormulaTraceCount += 1;
    if (identityFormulaWithoutVerifiedCoefficient) summary.identityFormulaWithoutVerifiedCoefficientCount += 1;
    if (unitDimensionMismatch) summary.unitDimensionMismatchCount += 1;
    if (mechanicallyCompilable) summary.formulaMechanicallyCompilableCount += 1;
    if (formulaRuntimeValid) summary.formulaRuntimeValidCount += 1;
    if (formulaSemanticUnverified) summary.formulaSemanticUnverifiedCount += 1;
    if (normSourceUnregistered) summary.normSourceUnregisteredCount += 1;
    if (normSourceVerified) summary.normSourceVerifiedCount += 1;
    if (parametersValid) summary.requiredParametersValidCount += 1;
    if (procurementApplicable) summary.procurementApplicableCount += 1;
    if (priceCovered) summary.priceCoveredCount += 1;
    if (professionalReady) summary.professionalReadyCount += 1;
    if (!hasFormulaTrace) summary.missingFormulaTraceCount += 1;
    return null;
  }
  const blockingReasons: string[] = [];
  if (!isSourceBacked) blockingReasons.push("row_not_source_backed_professional_norm");
  if (claimsProfessionalSourcePrefix && normSourceUnregistered) blockingReasons.push("unregistered_professional_source_claim");
  if (isFamilyDefault) blockingReasons.push("generated_family_default_not_professional");
  if (!row.normId) blockingReasons.push("norm_id_missing");
  if (!row.normVersion) blockingReasons.push("norm_version_missing");
  if (!hasFormulaTrace) blockingReasons.push("formula_trace_missing");
  if (!mechanicallyCompilable) blockingReasons.push("formula_not_mechanically_compilable");
  if (!formulaRuntimeValid) blockingReasons.push("formula_runtime_invalid");
  if (!parametersValid) blockingReasons.push("required_formula_parameters_unverified");
  if (normSourceUnregistered) blockingReasons.push("norm_source_unregistered");
  if (identityFormulaWithoutVerifiedCoefficient) blockingReasons.push("identity_formula_without_verified_coefficient");
  if (unitDimensionMismatch) blockingReasons.push("unit_dimension_mismatch");
  if (formulaSemanticUnverified) blockingReasons.push("formula_semantic_unverified");
  if (suspiciousMaterialM2) blockingReasons.push("generic_material_m2_unit");
  if (!hasPriceSource && !missingPriceState) blockingReasons.push("price_without_ratebook_source");
  if (isHistoricalPriceOnly) blockingReasons.push("historical_price_only_not_ratebook");
  if (procurementApplicable && !priceCovered) blockingReasons.push("procurement_price_not_covered");
  return {
    row_id: rowId(row),
    section_type: rowSectionType,
    title,
    unit,
    quantity,
    norm_source_id: sourceId,
    claims_professional_source_prefix: claimsProfessionalSourcePrefix,
    is_source_backed: isSourceBacked,
    is_generated: isGenerated,
    is_family_default: isFamilyDefault,
    is_historical_price_only: isHistoricalPriceOnly,
    source_status: sourceStatus,
    has_norm_id: Boolean(row.normId),
    has_norm_version: Boolean(row.normVersion),
    has_formula_trace: hasFormulaTrace,
    has_price_source: hasPriceSource,
    missing_price_state: missingPriceState,
    suspicious_material_m2: suspiciousMaterialM2,
    quantity_copied_from_user_input: quantityCopiedFromUserInput,
    blind_copy_without_formula_trace: blindCopyWithoutFormulaTrace,
    identity_formula_without_verified_coefficient: identityFormulaWithoutVerifiedCoefficient,
    unit_dimension_mismatch: unitDimensionMismatch,
    formula_mechanically_compilable: mechanicallyCompilable,
    formula_runtime_valid: formulaRuntimeValid,
    formula_semantic_unverified: formulaSemanticUnverified,
    norm_source_unregistered: normSourceUnregistered,
    norm_source_verified: normSourceVerified,
    required_parameters_valid: parametersValid,
    procurement_applicable: procurementApplicable,
    price_covered: priceCovered,
    professional_ready: professionalReady,
    base_unit: baseUnit,
    base_dimension: baseDimension,
    row_dimension: rowDimension,
    blocking_reasons: blockingReasons,
  };
}

export function classifyEstimateRowReality(row: EstimateRealityRowInput): EstimateRowRealityClassification {
  return classifyEstimateRowRealityInternal(row)!;
}

export function classifyEstimateRowsReality(rows: readonly EstimateRealityRowInput[]) {
  const classifications: EstimateRowRealityClassification[] = [];
  let professionalSourcePrefixClaimCount = 0;
  let sourceBackedCount = 0;
  let genericFamilyDefaultCount = 0;
  let invalidFakeSourceCount = 0;
  let suspiciousMaterialM2Count = 0;
  let blindQuantityCopyCount = 0;
  let blindCopyWithoutFormulaTraceCount = 0;
  let identityFormulaWithoutVerifiedCoefficientCount = 0;
  let unitDimensionMismatchCount = 0;
  let formulaMechanicallyCompilableCount = 0;
  let formulaRuntimeValidCount = 0;
  let formulaSemanticUnverifiedCount = 0;
  let normSourceUnregisteredCount = 0;
  let normSourceVerifiedCount = 0;
  let requiredParametersValidCount = 0;
  let procurementApplicableCount = 0;
  let priceCoveredCount = 0;
  let professionalReadyCount = 0;
  let missingFormulaTraceCount = 0;
  for (const row of rows) {
    const classification = classifyEstimateRowReality(row);
    classifications.push(classification);
    if (classification.claims_professional_source_prefix) professionalSourcePrefixClaimCount += 1;
    if (classification.is_source_backed) sourceBackedCount += 1;
    if (classification.is_family_default) genericFamilyDefaultCount += 1;
    if (classification.source_status === "INVALID_FAKE_SOURCE") invalidFakeSourceCount += 1;
    if (classification.suspicious_material_m2) suspiciousMaterialM2Count += 1;
    if (classification.quantity_copied_from_user_input) blindQuantityCopyCount += 1;
    if (classification.blind_copy_without_formula_trace) blindCopyWithoutFormulaTraceCount += 1;
    if (classification.identity_formula_without_verified_coefficient) identityFormulaWithoutVerifiedCoefficientCount += 1;
    if (classification.unit_dimension_mismatch) unitDimensionMismatchCount += 1;
    if (classification.formula_mechanically_compilable) formulaMechanicallyCompilableCount += 1;
    if (classification.formula_runtime_valid) formulaRuntimeValidCount += 1;
    if (classification.formula_semantic_unverified) formulaSemanticUnverifiedCount += 1;
    if (classification.norm_source_unregistered) normSourceUnregisteredCount += 1;
    if (classification.norm_source_verified) normSourceVerifiedCount += 1;
    if (classification.required_parameters_valid) requiredParametersValidCount += 1;
    if (classification.procurement_applicable) procurementApplicableCount += 1;
    if (classification.price_covered) priceCoveredCount += 1;
    if (classification.professional_ready) professionalReadyCount += 1;
    if (!classification.has_formula_trace) missingFormulaTraceCount += 1;
  }
  return {
    classifications,
    row_count: classifications.length,
    professional_source_prefix_claim_count: professionalSourcePrefixClaimCount,
    source_backed_count: sourceBackedCount,
    generic_family_default_count: genericFamilyDefaultCount,
    invalid_fake_source_count: invalidFakeSourceCount,
    suspicious_material_m2_count: suspiciousMaterialM2Count,
    blind_quantity_copy_count: blindQuantityCopyCount,
    blind_copy_without_formula_trace: blindCopyWithoutFormulaTraceCount,
    identity_formula_without_verified_coefficient: identityFormulaWithoutVerifiedCoefficientCount,
    unit_dimension_mismatch: unitDimensionMismatchCount,
    formula_mechanically_compilable: formulaMechanicallyCompilableCount,
    formula_runtime_valid: formulaRuntimeValidCount,
    formula_semantic_unverified: formulaSemanticUnverifiedCount,
    norm_source_unregistered: normSourceUnregisteredCount,
    norm_source_verified: normSourceVerifiedCount,
    required_parameters_valid: requiredParametersValidCount,
    procurement_applicable: procurementApplicableCount,
    price_covered: priceCoveredCount,
    professional_ready: professionalReadyCount,
    missing_formula_trace_count: missingFormulaTraceCount,
  };
}

export function summarizeEstimateRowsReality(
  rows: readonly EstimateRealityRowInput[],
): ReturnType<typeof classifyEstimateRowsReality> {
  const summary: EstimateRealitySummaryAccumulator = {
    rowCount: 0,
    professionalSourcePrefixClaimCount: 0,
    sourceBackedCount: 0,
    genericFamilyDefaultCount: 0,
    invalidFakeSourceCount: 0,
    suspiciousMaterialM2Count: 0,
    blindQuantityCopyCount: 0,
    blindCopyWithoutFormulaTraceCount: 0,
    identityFormulaWithoutVerifiedCoefficientCount: 0,
    unitDimensionMismatchCount: 0,
    formulaMechanicallyCompilableCount: 0,
    formulaRuntimeValidCount: 0,
    formulaSemanticUnverifiedCount: 0,
    normSourceUnregisteredCount: 0,
    normSourceVerifiedCount: 0,
    requiredParametersValidCount: 0,
    procurementApplicableCount: 0,
    priceCoveredCount: 0,
    professionalReadyCount: 0,
    missingFormulaTraceCount: 0,
  };
  for (const row of rows) classifyEstimateRowRealityInternal(row, summary);
  return {
    classifications: [],
    row_count: summary.rowCount,
    professional_source_prefix_claim_count: summary.professionalSourcePrefixClaimCount,
    source_backed_count: summary.sourceBackedCount,
    generic_family_default_count: summary.genericFamilyDefaultCount,
    invalid_fake_source_count: summary.invalidFakeSourceCount,
    suspicious_material_m2_count: summary.suspiciousMaterialM2Count,
    blind_quantity_copy_count: summary.blindQuantityCopyCount,
    blind_copy_without_formula_trace: summary.blindCopyWithoutFormulaTraceCount,
    identity_formula_without_verified_coefficient: summary.identityFormulaWithoutVerifiedCoefficientCount,
    unit_dimension_mismatch: summary.unitDimensionMismatchCount,
    formula_mechanically_compilable: summary.formulaMechanicallyCompilableCount,
    formula_runtime_valid: summary.formulaRuntimeValidCount,
    formula_semantic_unverified: summary.formulaSemanticUnverifiedCount,
    norm_source_unregistered: summary.normSourceUnregisteredCount,
    norm_source_verified: summary.normSourceVerifiedCount,
    required_parameters_valid: summary.requiredParametersValidCount,
    procurement_applicable: summary.procurementApplicableCount,
    price_covered: summary.priceCoveredCount,
    professional_ready: summary.professionalReadyCount,
    missing_formula_trace_count: summary.missingFormulaTraceCount,
  };
}
