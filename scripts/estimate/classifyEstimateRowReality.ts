import { isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

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
};

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
  const isFamilyDefault = isGeneratedFamilyDefaultSource(sourceId);
  const isGenerated = isFamilyDefault || sourceId.includes("generated");
  const isHistoricalPriceOnly =
    String(row.sourceParameters?.priceSourceType ?? "").includes("historical") ||
    String(row.priceStatus ?? "").includes("historical");
  const trace = String(row.calculationTrace ?? "");
  const title = rowTitle(row);
  const unit = String(row.unit ?? "").trim();
  const quantity = typeof row.quantity === "number" && Number.isFinite(row.quantity) ? row.quantity : null;
  const baseQuantity = row.sourceParameters?.baseQuantity;
  const quantityCopiedFromUserInput =
    quantity != null &&
    typeof baseQuantity === "number" &&
    Number.isFinite(baseQuantity) &&
    Math.abs(quantity - baseQuantity) < 0.0001;
  const hasFormulaTrace = Boolean(row.formulaId && trace.includes("formula=") && trace.includes("result="));
  const hasPriceSource = Boolean(row.priceTrace || (row.unitPrice != null && Number.isFinite(row.unitPrice)));
  const missingPriceState =
    row.unitPrice == null &&
    row.total == null &&
    (row.priceStatus === "PRICE_MISSING" || row.priceStatus === "missing" || row.priceStatus == null);
  const materialLike = sectionType(row) === "materials" || row.lineType === "material";
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
    suspiciousMaterialM2 ? "generic_material_m2_unit" : "",
    !hasPriceSource && !missingPriceState ? "price_without_ratebook_source" : "",
    isHistoricalPriceOnly ? "historical_price_only_not_ratebook" : "",
  ].filter(Boolean);

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
    missing_formula_trace_count: classifications.filter((row) => !row.has_formula_trace).length,
  };
}
