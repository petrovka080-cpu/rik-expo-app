import type { GlobalEstimateResult, SourceBackedEstimateRow } from "./globalEstimateTypes";

export type EstimateUnitSemanticValidation = {
  passed: boolean;
  allRowsLinearM: boolean;
  blockers: string[];
  warnings: string[];
  rowUnitMismatches: {
    code: string;
    expectedUnit: string;
    actualUnit: string | null;
  }[];
};

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

function allRows(result: GlobalEstimateResult): SourceBackedEstimateRow[] {
  return result.sections.flatMap((section) => section.rows);
}

function rowByCode(rows: SourceBackedEstimateRow[]): Map<string, SourceBackedEstimateRow> {
  return new Map(rows.map((row) => [row.code, row]));
}

export function validateEstimateUnitSemantics(result: GlobalEstimateResult): EstimateUnitSemanticValidation {
  const rows = allRows(result);
  const rowMap = rowByCode(rows);
  const allRowsLinearM = rows.length > 0 && rows.every((row) => row.unit === "linear_m");
  const blockers: string[] = [];
  const warnings: string[] = [];
  const rowUnitMismatches: EstimateUnitSemanticValidation["rowUnitMismatches"] = [];

  if (allRowsLinearM) blockers.push("UNIT_SEMANTIC_ALL_ROWS_LINEAR_M");

  if (result.work.workKey === "strip_foundation") {
    for (const [code, expectedUnit] of Object.entries(STRIP_FOUNDATION_EXPECTED_UNITS)) {
      const actualUnit = rowMap.get(code)?.unit ?? null;
      if (actualUnit !== expectedUnit) {
        rowUnitMismatches.push({ code, expectedUnit, actualUnit });
        blockers.push(`UNIT_SEMANTIC_MISMATCH:${code}:${actualUnit ?? "missing"}!=${expectedUnit}`);
      }
    }
  }

  if (result.work.category === "tile") {
    const codes = rows.map((row) => row.code).join("|").toLowerCase();
    if (!/tile/.test(codes)) blockers.push("UNIT_SEMANTIC_TILE_ROW_MISSING");
    if (!/adhesive/.test(codes)) blockers.push("UNIT_SEMANTIC_TILE_ADHESIVE_MISSING");
    if (!/grout/.test(codes)) blockers.push("UNIT_SEMANTIC_TILE_GROUT_MISSING");
    if (!/primer/.test(codes)) blockers.push("UNIT_SEMANTIC_TILE_PRIMER_MISSING");
  }

  return {
    passed: blockers.length === 0,
    allRowsLinearM,
    blockers: Array.from(new Set(blockers)),
    warnings,
    rowUnitMismatches,
  };
}
