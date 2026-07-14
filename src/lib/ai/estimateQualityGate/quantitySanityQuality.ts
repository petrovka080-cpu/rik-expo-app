import type {
  ProfessionalEstimateLine,
  ProfessionalEstimateUnit,
  ProfessionalGroupKey,
} from "../professionalEstimateTemplates";
import type { EstimateQualitySnapshotContext, EstimateQualityRuleResult } from "./estimateQualityTypes";
import { qualityFailure, qualityRuleResult } from "./estimateQualityReport";

function valueIsSane(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value < 1_000_000_000;
}

function groupInputUnitAllowed(group: ProfessionalGroupKey, unit: ProfessionalEstimateUnit): boolean {
  if (group === "flooring" || group === "tile_stone" || group === "roofing" || group === "waterproofing") {
    return unit === "m2";
  }
  if (group === "foundation_concrete") return unit === "m3" || unit === "m2" || unit === "linear_m";
  if (group === "electrical_power" || group === "low_voltage_security") return unit === "piece" || unit === "set" || unit === "m2";
  if (group === "plumbing_sewerage" || group === "heating_hvac" || group === "ventilation_ac") {
    return unit === "linear_m" || unit === "piece" || unit === "set";
  }
  return true;
}

function lineHasCompatibleUnit(line: ProfessionalEstimateLine): boolean {
  if (line.row_domain === "flooring" && line.row_kind === "material") return line.unit !== "m3";
  if (line.row_domain === "foundation_concrete" && line.row_kind === "material") return line.unit !== "piece";
  if (line.row_domain === "electrical_power" && line.row_kind === "material" && /socket/i.test(line.row_key)) {
    return line.unit === "piece" || line.unit === "linear_m" || line.unit === "set" || line.unit === "hour" || line.unit === "shift";
  }
  return true;
}

export function evaluateQuantitySanityQuality(
  context: EstimateQualitySnapshotContext,
): EstimateQualityRuleResult {
  const snapshot = context.snapshot;
  if (!snapshot) return qualityRuleResult({ check: "quantity_sanity_passed" });

  const failures = [];
  if (!valueIsSane(snapshot.quantity)) {
    failures.push(qualityFailure({
      code: "ROW_WITHOUT_PROVENANCE",
      details: "Snapshot quantity is non-positive, non-finite, or absurdly high.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }
  if (!groupInputUnitAllowed(snapshot.group_key, snapshot.unit)) {
    failures.push(qualityFailure({
      code: "ROW_WITHOUT_PROVENANCE",
      details: "Snapshot input unit is incompatible with selected work group.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }

  for (const line of snapshot.lines) {
    if (!valueIsSane(line.quantity) || line.waste_percent < 0 || line.waste_percent > 30 || !lineHasCompatibleUnit(line)) {
      failures.push(qualityFailure({
        code: "ROW_WITHOUT_PROVENANCE",
        details: "Line quantity, waste percent, or unit failed sanity validation.",
        selectedWorkKey: snapshot.selected_work_key,
        rowKey: line.row_key,
        visibleNameRu: line.visible_name_ru,
      }));
    }
  }

  return qualityRuleResult({ check: "quantity_sanity_passed", failures });
}
