import { resolveProfessionalWorkTemplate } from "../professionalEstimateTemplates";
import type { EstimateQualitySnapshotContext, EstimateQualityRuleResult } from "./estimateQualityTypes";
import { qualityFailure, qualityRuleResult } from "./estimateQualityReport";

const FORBIDDEN_TEXT_BY_GROUP: Record<string, RegExp> = {
  flooring: /brick|masonry|concrete b25|rebar|roof|pipe|cable/i,
  foundation_concrete: /carpet|laminate|socket|plumbing/i,
  electrical_power: /carpet|masonry|ppr pipe|roof/i,
  plumbing_sewerage: /carpet|masonry|vvg|cable|roof/i,
  roofing: /bathroom|tile|ppr pipe|carpet|masonry/i,
};

export function evaluateProfessionalCompletenessQuality(
  context: EstimateQualitySnapshotContext,
): EstimateQualityRuleResult {
  const snapshot = context.snapshot;
  if (!snapshot) return qualityRuleResult({ check: "professional_completeness_passed" });

  const template = resolveProfessionalWorkTemplate(snapshot.selected_work_key);
  const failures = [];
  const lineKeys = new Set(snapshot.lines.map((line) => line.material_key ?? line.row_key));
  for (const required of template?.required_material_keys ?? []) {
    if (!lineKeys.has(required)) {
      failures.push(qualityFailure({
        code: "MISSING_REQUIRED_MATERIAL",
        details: "Required material from professional template is missing from the snapshot.",
        selectedWorkKey: snapshot.selected_work_key,
        rowKey: required,
      }));
    }
  }
  if (!snapshot.lines.some((line) => line.row_kind === "labor" && line.price_required)) {
    failures.push(qualityFailure({
      code: "MISSING_REQUIRED_LABOR_ROW",
      details: "No priced labor row is present.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }
  const forbiddenPattern = FORBIDDEN_TEXT_BY_GROUP[snapshot.group_key];
  if (forbiddenPattern) {
    for (const line of snapshot.lines) {
      if (forbiddenPattern.test(`${line.visible_name_ru} ${line.material_key ?? ""} ${line.row_key}`)) {
        failures.push(qualityFailure({
          code: "CROSS_DOMAIN_ROW_LEAK",
          details: "Forbidden domain term was found in a professional estimate row.",
          selectedWorkKey: snapshot.selected_work_key,
          rowKey: line.row_key,
          visibleNameRu: line.visible_name_ru,
        }));
      }
    }
  }

  return qualityRuleResult({ check: "professional_completeness_passed", failures });
}
