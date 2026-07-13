import { resolveProfessionalWorkTemplate } from "../professionalEstimateTemplates";
import type { EstimateQualitySnapshotContext, EstimateQualityRuleResult } from "./estimateQualityTypes";
import { qualityFailure, qualityRuleResult } from "./estimateQualityReport";

export function evaluateTemplateCompletenessQuality(
  context: EstimateQualitySnapshotContext,
): EstimateQualityRuleResult {
  const snapshot = context.snapshot;
  if (!snapshot) return qualityRuleResult({ check: "template_completeness_passed" });

  const template = resolveProfessionalWorkTemplate(snapshot.selected_work_key);
  const failures = [];
  if (!template || !template.supported || template.template_status !== "SUPPORTED") {
    failures.push(qualityFailure({
      code: "MISSING_REQUIRED_MATERIAL",
      details: "Selected work has no supported professional template.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }
  if (snapshot.lines.length === 0 || snapshot.visible_rows.length === 0) {
    failures.push(qualityFailure({
      code: "MISSING_REQUIRED_MATERIAL",
      details: "Professional template produced no estimate lines.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }
  if (!snapshot.lines.some((line) => line.row_kind === "labor")) {
    failures.push(qualityFailure({
      code: "MISSING_REQUIRED_LABOR_ROW",
      details: "Professional estimate has no required labor row.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }

  return qualityRuleResult({ check: "template_completeness_passed", failures });
}
