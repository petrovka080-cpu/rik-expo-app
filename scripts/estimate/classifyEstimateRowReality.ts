import {
  isProfessionalNormPackSourceId,
  isRegisteredProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";

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

function unitDimension(unitValue: unknown): EstimateQuantityDimension {
  const unit = String(unitValue ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!unit) return "unknown";
  if (["m2", "m²", "sqm", "sq_m", "square_m", "square_meter"].includes(unit)) return "area";
  if (["m3", "m³", "cbm", "cubic_m", "cubic_meter"].includes(unit)) return "volume";
  if (["m", "lm", "linear_m", "meter", "metre"].includes(unit)) return "length";
  if (["kg", "kilogram", "t", "ton", "tonne"].includes(unit)) return "mass";
  if (["piece", "pieces", "pcs", "pc", "set", "sets", "trip", "trips", "point", "points"].includes(unit)) return "count";
  if (["h", "hr", "hour", "hours", "man_hour", "machine_hour"].includes(unit)) return "time";
  return "other";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function traceResult(trace: string): number | null {
  const matches = [
    ...trace.matchAll(/(?:^|;\s*)result=(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?=\s|;|$)/gi),
  ];
  const finalResult = matches[matches.length - 1]?.[1];
  return finalResult == null ? null : finiteNumber(Number(finalResult));
}

function requiredParametersValid(sourceParameters: Record<string, unknown> | null | undefined): boolean {
  const requirements = sourceParameters?.normParameterRequirements;
  if (!Array.isArray(requirements)) return false;
  const context = sourceParameters?.formulaContext;
  if (!context || typeof context !== "object" || Array.isArray(context)) return false;
  const values = context as Record<string, unknown>;
  return requirements.every((requirement) => {
    if (!requirement || typeof requirement !== "object" || Array.isArray(requirement)) return false;
    const record = requirement as Record<string, unknown>;
    if (record.required !== true) return true;
    const key = String(record.key ?? "").trim();
    return Boolean(key) && values[key] !== undefined && values[key] !== null;
  });
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

export function classifyEstimateRowReality(row: EstimateRealityRowInput): EstimateRowRealityClassification {
  const sourceId = String(row.normSourceId ?? row.sourceParameters?.normSourceId ?? "").trim();
  const isSourceBacked = isProfessionalNormPackSourceId(sourceId);
  const normSourceVerified = isRegisteredProfessionalNormPackSourceId(sourceId);
  const normSourceUnregistered = !normSourceVerified;
  const isFamilyDefault = isGeneratedFamilyDefaultSource(sourceId);
  const isGenerated = isFamilyDefault || sourceId.includes("generated");
  const isHistoricalPriceOnly =
    String(row.sourceParameters?.priceSourceType ?? "").includes("historical") ||
    String(row.priceStatus ?? "").includes("historical");
  const trace = String(row.calculationTrace ?? "");
  const title = rowTitle(row);
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
  const materialLike = sectionType(row) === "materials" || row.lineType === "material";
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
  const blockingReasons = [
    !isSourceBacked ? "row_not_source_backed_professional_norm" : "",
    isFamilyDefault ? "generated_family_default_not_professional" : "",
    !row.normId ? "norm_id_missing" : "",
    !row.normVersion ? "norm_version_missing" : "",
    !hasFormulaTrace ? "formula_trace_missing" : "",
    !mechanicallyCompilable ? "formula_not_mechanically_compilable" : "",
    !formulaRuntimeValid ? "formula_runtime_invalid" : "",
    !parametersValid ? "required_formula_parameters_unverified" : "",
    normSourceUnregistered ? "norm_source_unregistered" : "",
    identityFormulaWithoutVerifiedCoefficient ? "identity_formula_without_verified_coefficient" : "",
    unitDimensionMismatch ? "unit_dimension_mismatch" : "",
    formulaSemanticUnverified ? "formula_semantic_unverified" : "",
    suspiciousMaterialM2 ? "generic_material_m2_unit" : "",
    !hasPriceSource && !missingPriceState ? "price_without_ratebook_source" : "",
    isHistoricalPriceOnly ? "historical_price_only_not_ratebook" : "",
    procurementApplicable && !priceCovered ? "procurement_price_not_covered" : "",
  ].filter(Boolean);
  const professionalReady =
    mechanicallyCompilable &&
    formulaRuntimeValid &&
    parametersValid &&
    !unitDimensionMismatch &&
    normSourceVerified &&
    !identityFormulaWithoutVerifiedCoefficient &&
    (!procurementApplicable || priceCovered) &&
    Boolean(row.normId && row.normVersion);

  return {
    row_id: rowId(row),
    section_type: sectionType(row),
    title,
    unit,
    quantity,
    norm_source_id: sourceId,
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

export function classifyEstimateRowsReality(rows: readonly EstimateRealityRowInput[]) {
  const classifications = rows.map(classifyEstimateRowReality);
  return {
    classifications,
    row_count: classifications.length,
    source_backed_count: classifications.filter((row) => row.is_source_backed).length,
    generic_family_default_count: classifications.filter((row) => row.is_family_default).length,
    invalid_fake_source_count: classifications.filter((row) => row.source_status === "INVALID_FAKE_SOURCE").length,
    suspicious_material_m2_count: classifications.filter((row) => row.suspicious_material_m2).length,
    blind_quantity_copy_count: classifications.filter((row) => row.quantity_copied_from_user_input).length,
    blind_copy_without_formula_trace: classifications.filter((row) => row.blind_copy_without_formula_trace).length,
    identity_formula_without_verified_coefficient: classifications.filter(
      (row) => row.identity_formula_without_verified_coefficient,
    ).length,
    unit_dimension_mismatch: classifications.filter((row) => row.unit_dimension_mismatch).length,
    formula_mechanically_compilable: classifications.filter((row) => row.formula_mechanically_compilable).length,
    formula_runtime_valid: classifications.filter((row) => row.formula_runtime_valid).length,
    formula_semantic_unverified: classifications.filter((row) => row.formula_semantic_unverified).length,
    norm_source_unregistered: classifications.filter((row) => row.norm_source_unregistered).length,
    norm_source_verified: classifications.filter((row) => row.norm_source_verified).length,
    required_parameters_valid: classifications.filter((row) => row.required_parameters_valid).length,
    procurement_applicable: classifications.filter((row) => row.procurement_applicable).length,
    price_covered: classifications.filter((row) => row.price_covered).length,
    professional_ready: classifications.filter((row) => row.professional_ready).length,
    missing_formula_trace_count: classifications.filter((row) => !row.has_formula_trace).length,
  };
}
