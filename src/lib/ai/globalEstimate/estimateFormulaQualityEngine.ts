import type { GlobalEstimateResult, SourceBackedEstimateRow } from "./globalEstimateTypes";
import { validateEstimateBoqDepth, type EstimateBoqDepthValidation } from "./validateEstimateBoqDepth";

export type EstimateFormulaQualityTrace = {
  estimateId: string;
  workKey: string;
  category: string;
  rowCount: number;
  sectionTypes: string[];
  allRowsLinearM: boolean;
  depth: EstimateBoqDepthValidation;
  stripFoundation?: {
    dimensionsParsed: boolean;
    lengthM: number | null;
    widthM: number | null;
    heightM: number | null;
    formula: "length * width * height";
    expectedConcreteVolumeM3: number | null;
    actualConcreteVolumeM3: number | null;
    concreteRowUnit: string | null;
    concreteVolumeMatches: boolean;
    requiredRowsPresent: boolean;
    missingRequiredRows: string[];
    unitMismatches: {
      code: string;
      expectedUnit: string;
      actualUnit: string | null;
    }[];
  };
};

export type EstimateFormulaQualityValidation = {
  passed: boolean;
  blockers: string[];
  warnings: string[];
  trace: EstimateFormulaQualityTrace;
};

const STRIP_FOUNDATION_REQUIRED_ROWS = [
  "strip_foundation_sand_cushion",
  "strip_foundation_crushed_stone_base",
  "strip_foundation_geotextile",
  "strip_foundation_formwork_material",
  "strip_foundation_longitudinal_rebar",
  "strip_foundation_stirrups_rebar",
  "strip_foundation_binding_wire",
  "strip_foundation_rebar_spacers",
  "strip_foundation_concrete_m300",
  "strip_foundation_waterproofing_material",
  "strip_foundation_excavation",
  "strip_foundation_formwork_install",
  "strip_foundation_rebar_tying",
  "strip_foundation_concrete_pour",
  "strip_foundation_concrete_vibration",
  "strip_foundation_concrete_curing",
  "strip_foundation_waterproofing_install",
  "strip_foundation_backfill",
  "strip_foundation_concrete_delivery",
  "strip_foundation_concrete_pump",
] as const;

const STRIP_FOUNDATION_EXPECTED_UNITS: Record<string, string> = {
  strip_foundation_sand_cushion: "m3",
  strip_foundation_crushed_stone_base: "m3",
  strip_foundation_geotextile: "sq_m",
  strip_foundation_formwork_material: "sq_m",
  strip_foundation_longitudinal_rebar: "kg",
  strip_foundation_stirrups_rebar: "kg",
  strip_foundation_binding_wire: "kg",
  strip_foundation_rebar_spacers: "pcs",
  strip_foundation_concrete_m300: "m3",
  strip_foundation_waterproofing_material: "sq_m",
  strip_foundation_excavation: "m3",
  strip_foundation_formwork_install: "sq_m",
  strip_foundation_rebar_tying: "kg",
  strip_foundation_concrete_pour: "m3",
  strip_foundation_concrete_vibration: "m3",
  strip_foundation_concrete_curing: "sq_m",
  strip_foundation_waterproofing_install: "sq_m",
  strip_foundation_backfill: "m3",
  strip_foundation_concrete_delivery: "m3",
  strip_foundation_concrete_pump: "set",
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function allRows(result: GlobalEstimateResult): SourceBackedEstimateRow[] {
  return result.sections.flatMap((section) => section.rows);
}

function rowByCode(rows: SourceBackedEstimateRow[]): Map<string, SourceBackedEstimateRow> {
  return new Map(rows.map((row) => [row.code, row]));
}

function buildStripFoundationTrace(result: GlobalEstimateResult, rows: SourceBackedEstimateRow[]) {
  const rowMap = rowByCode(rows);
  const dimensions = result.input.dimensions;
  const expectedConcreteVolumeM3 =
    dimensions?.length != null && dimensions.width != null && dimensions.height != null
      ? round2(dimensions.length * dimensions.width * dimensions.height)
      : null;
  const concrete = rowMap.get("strip_foundation_concrete_m300") ?? null;
  const missingRequiredRows = STRIP_FOUNDATION_REQUIRED_ROWS.filter((code) => !rowMap.has(code));
  const unitMismatches = Object.entries(STRIP_FOUNDATION_EXPECTED_UNITS)
    .map(([code, expectedUnit]) => {
      const actualUnit = rowMap.get(code)?.unit ?? null;
      return actualUnit === expectedUnit ? null : { code, expectedUnit, actualUnit };
    })
    .filter((item): item is { code: string; expectedUnit: string; actualUnit: string | null } => Boolean(item));

  return {
    dimensionsParsed: Boolean(dimensions?.length && dimensions.width && dimensions.height),
    lengthM: dimensions?.length ?? null,
    widthM: dimensions?.width ?? null,
    heightM: dimensions?.height ?? null,
    formula: "length * width * height" as const,
    expectedConcreteVolumeM3,
    actualConcreteVolumeM3: concrete?.quantity ?? null,
    concreteRowUnit: concrete?.unit ?? null,
    concreteVolumeMatches:
      expectedConcreteVolumeM3 != null &&
      concrete?.quantity != null &&
      Math.abs(concrete.quantity - expectedConcreteVolumeM3) < 0.01,
    requiredRowsPresent: missingRequiredRows.length === 0,
    missingRequiredRows,
    unitMismatches,
  };
}

export function buildEstimateFormulaQualityTrace(result: GlobalEstimateResult): EstimateFormulaQualityTrace {
  const rows = allRows(result);
  const trace: EstimateFormulaQualityTrace = {
    estimateId: result.estimateId,
    workKey: result.work.workKey,
    category: result.work.category,
    rowCount: rows.length,
    sectionTypes: result.sections.map((section) => section.type),
    allRowsLinearM: rows.length > 0 && rows.every((row) => row.unit === "linear_m"),
    depth: validateEstimateBoqDepth(result),
  };

  if (result.work.workKey === "strip_foundation") {
    trace.stripFoundation = buildStripFoundationTrace(result, rows);
  }

  return trace;
}

export function validateEstimateFormulaQuality(result: GlobalEstimateResult): EstimateFormulaQualityValidation {
  const trace = buildEstimateFormulaQualityTrace(result);
  const blockers = [...trace.depth.blockers];
  const warnings: string[] = [];
  const rows = allRows(result);

  if (trace.allRowsLinearM) blockers.push("FORMULA_QUALITY_ALL_ROWS_LINEAR_M");
  for (const row of rows) {
    if (!Number.isFinite(row.quantity) || row.quantity < 0) {
      blockers.push(`FORMULA_QUALITY_INVALID_QUANTITY:${row.code}`);
    }
    if (row.priceStatus === "priced" && row.sourceEvidence.length === 0) {
      blockers.push(`FORMULA_QUALITY_SOURCE_EVIDENCE_MISSING:${row.code}`);
    }
  }

  if (trace.stripFoundation) {
    const strip = trace.stripFoundation;
    if (!strip.dimensionsParsed) blockers.push("STRIP_FOUNDATION_DIMENSIONS_NOT_PARSED");
    if (strip.expectedConcreteVolumeM3 == null) blockers.push("STRIP_FOUNDATION_CONCRETE_FORMULA_MISSING");
    if (!strip.concreteVolumeMatches) blockers.push("STRIP_FOUNDATION_CONCRETE_VOLUME_MISMATCH");
    if (strip.concreteRowUnit !== "m3") blockers.push("STRIP_FOUNDATION_CONCRETE_UNIT_NOT_M3");
    if (!strip.requiredRowsPresent) blockers.push("STRIP_FOUNDATION_REQUIRED_ROWS_MISSING");
    for (const mismatch of strip.unitMismatches) {
      blockers.push(`STRIP_FOUNDATION_UNIT_MISMATCH:${mismatch.code}:${mismatch.actualUnit ?? "missing"}!=${mismatch.expectedUnit}`);
    }
    if (strip.expectedConcreteVolumeM3 != null && strip.expectedConcreteVolumeM3 > 20 && result.sections.every((section) => section.type !== "delivery")) {
      warnings.push("STRIP_FOUNDATION_LARGE_VOLUME_DELIVERY_SECTION_RECOMMENDED");
    }
  }

  return {
    passed: blockers.length === 0,
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
    trace,
  };
}

export function assertEstimateFormulaQuality(result: GlobalEstimateResult): void {
  const validation = validateEstimateFormulaQuality(result);
  if (!validation.passed) {
    throw new Error(`ESTIMATE_FORMULA_QUALITY_FAILED:${validation.blockers.join(",")}`);
  }
}
