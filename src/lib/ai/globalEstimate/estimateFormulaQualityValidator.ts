import type { GlobalEstimateResult, SourceBackedEstimateRow } from "./globalEstimateTypes";
import { validateEstimateFormulaQuality, type EstimateFormulaQualityValidation } from "./estimateFormulaQualityEngine";
import { validateEstimateUnitSemantics, type EstimateUnitSemanticValidation } from "./estimateUnitSemanticValidator";

export type ProfessionalFormulaQualityValidation = EstimateFormulaQualityValidation & {
  unitSemantics: EstimateUnitSemanticValidation;
  categoryFormulaChecks: {
    passed: boolean;
    blockers: string[];
  };
};

function allRows(result: GlobalEstimateResult): SourceBackedEstimateRow[] {
  return result.sections.flatMap((section) => section.rows);
}

function hasCode(rows: SourceBackedEstimateRow[], pattern: RegExp): boolean {
  return rows.some((row) => pattern.test(row.code));
}

function rowQuantity(rows: SourceBackedEstimateRow[], pattern: RegExp): number | null {
  return rows.find((row) => pattern.test(row.code))?.quantity ?? null;
}

function categoryFormulaBlockers(result: GlobalEstimateResult): string[] {
  const rows = allRows(result);
  const blockers: string[] = [];

  if (result.work.workKey === "strip_foundation") {
    const dimensions = result.input.dimensions;
    const expectedConcrete = dimensions?.concreteVolumeM3 ?? null;
    const concrete = rows.find((row) => row.code === "strip_foundation_concrete_m300");
    const formwork = rows.find((row) => row.code === "strip_foundation_formwork_material");
    const waterproofing = rows.find((row) => row.code === "strip_foundation_waterproofing_material");
    if (expectedConcrete !== 32.64 && dimensions?.length === 48 && dimensions.width === 0.4 && dimensions.height === 1.7) {
      blockers.push("FORMULA_STRIP_FOUNDATION_CONCRETE_48X04X17_NOT_32_64");
    }
    if (concrete?.unit !== "m3") blockers.push("FORMULA_STRIP_FOUNDATION_CONCRETE_NOT_M3");
    if (expectedConcrete != null && concrete && Math.abs(concrete.quantity - expectedConcrete) > 0.01) {
      blockers.push("FORMULA_STRIP_FOUNDATION_CONCRETE_VOLUME_MISMATCH");
    }
    if (!formwork || formwork.quantity <= 0 || formwork.unit !== "sq_m") blockers.push("FORMULA_STRIP_FOUNDATION_FORMWORK_AREA_MISSING");
    if (!waterproofing || waterproofing.quantity <= 0 || waterproofing.unit !== "sq_m") blockers.push("FORMULA_STRIP_FOUNDATION_WATERPROOFING_AREA_MISSING");
    if (!hasCode(rows, /rebar|stirrup|binding_wire|spacer/)) blockers.push("FORMULA_STRIP_FOUNDATION_REBAR_SYSTEM_MISSING");
    if (!hasCode(rows, /sand_cushion/) || !hasCode(rows, /crushed_stone_base/)) blockers.push("FORMULA_STRIP_FOUNDATION_BASE_LAYERS_MISSING");
  }

  if (result.work.category === "roofing") {
    const baseArea = result.input.volume;
    const covering = rowQuantity(rows, /covering|roofing|soft_roof|metal_roof/);
    const membrane = rowQuantity(rows, /membrane|waterproof/);
    if (covering != null && covering < baseArea) blockers.push("FORMULA_ROOF_COVERING_BELOW_BASE_AREA");
    if (membrane != null && covering != null && membrane < Math.min(covering, baseArea)) blockers.push("FORMULA_ROOF_MEMBRANE_BELOW_ROOF_AREA");
    if (!hasCode(rows, /batten|fastener/)) blockers.push("FORMULA_ROOF_BATTENS_OR_FASTENERS_MISSING");
    if (!hasCode(rows, /flashing|trim/)) blockers.push("FORMULA_ROOF_FLASHINGS_MISSING");
  }

  if (result.work.category === "tile") {
    const tile = rows.find((row) => /tile.*waste|tile_with_waste|main_material/.test(row.code));
    if (!tile || tile.quantity < result.input.volume) blockers.push("FORMULA_TILE_WASTE_FACTOR_MISSING");
    if (!hasCode(rows, /adhesive/)) blockers.push("FORMULA_TILE_ADHESIVE_MISSING");
    if (!hasCode(rows, /grout/)) blockers.push("FORMULA_TILE_GROUT_MISSING");
    if (!hasCode(rows, /primer/)) blockers.push("FORMULA_TILE_PRIMER_MISSING");
    if (!hasCode(rows, /laying|install/)) blockers.push("FORMULA_TILE_LABOR_MISSING");
  }

  if (result.work.category === "roadworks") {
    if (!hasCode(rows, /sand_base|crushed_stone_base|base_install|grading/)) blockers.push("FORMULA_ASPHALT_BASE_LAYERS_MISSING");
    if (!hasCode(rows, /bitumen|tack_coat|emulsion/)) blockers.push("FORMULA_ASPHALT_BITUMEN_OR_EMULSION_MISSING");
    if (!hasCode(rows, /asphalt/)) blockers.push("FORMULA_ASPHALT_CONCRETE_MISSING");
    if (!hasCode(rows, /equipment|mobilization|compaction/)) blockers.push("FORMULA_ASPHALT_EQUIPMENT_MISSING");
    if (!hasCode(rows, /compaction|grading/)) blockers.push("FORMULA_ASPHALT_COMPACTION_MISSING");
  }

  return blockers;
}

export function validateProfessionalEstimateFormulaQuality(result: GlobalEstimateResult): ProfessionalFormulaQualityValidation {
  const base = validateEstimateFormulaQuality(result);
  const unitSemantics = validateEstimateUnitSemantics(result);
  const formulaBlockers = categoryFormulaBlockers(result);
  const blockers = Array.from(new Set([...base.blockers, ...unitSemantics.blockers, ...formulaBlockers]));
  return {
    ...base,
    passed: blockers.length === 0,
    blockers,
    unitSemantics,
    categoryFormulaChecks: {
      passed: formulaBlockers.length === 0,
      blockers: formulaBlockers,
    },
  };
}
