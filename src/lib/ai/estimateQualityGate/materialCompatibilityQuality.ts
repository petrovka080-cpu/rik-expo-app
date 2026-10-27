import { getMarketMaterialMasterItem } from "../marketPricebook";
import type { EstimateQualitySnapshotContext, EstimateQualityRuleResult } from "./estimateQualityTypes";
import { qualityFailure, qualityRuleResult } from "./estimateQualityReport";

export function evaluateMaterialCompatibilityQuality(
  context: EstimateQualitySnapshotContext,
): EstimateQualityRuleResult {
  const snapshot = context.snapshot;
  if (!snapshot) return qualityRuleResult({ check: "material_compatibility_passed" });

  const failures = [];
  for (const line of snapshot.lines.filter((item) => item.row_kind === "material" || item.row_kind === "waste")) {
    const materialKey = line.material_key ?? line.row_key;
    const material = getMarketMaterialMasterItem(materialKey);
    if (!material) {
      failures.push(qualityFailure({
        code: "MISSING_REQUIRED_MATERIAL",
        details: "Material line is not present in the governed material master.",
        selectedWorkKey: snapshot.selected_work_key,
        rowKey: line.row_key,
        visibleNameRu: line.visible_name_ru,
      }));
      continue;
    }
    if (!material.compatible_work_groups.includes(line.row_domain) || material.forbidden_work_groups.includes(line.row_domain)) {
      failures.push(qualityFailure({
        code: "MATERIAL_INCOMPATIBLE_WITH_WORK",
        details: "Material master compatibility policy forbids this row for the selected work.",
        selectedWorkKey: snapshot.selected_work_key,
        rowKey: line.row_key,
        visibleNameRu: line.visible_name_ru,
      }));
    }
  }

  return qualityRuleResult({ check: "material_compatibility_passed", failures });
}
