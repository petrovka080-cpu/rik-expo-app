import {
  auditEstimateRowDomainGuard,
  detectCrossDomainRowLeaks,
} from "../professionalEstimateTemplates";
import type { EstimateQualitySnapshotContext, EstimateQualityRuleResult } from "./estimateQualityTypes";
import { qualityFailure, qualityRuleResult } from "./estimateQualityReport";

export function evaluateRowDomainIsolationQuality(
  context: EstimateQualitySnapshotContext,
): EstimateQualityRuleResult {
  const snapshot = context.snapshot;
  if (!snapshot) return qualityRuleResult({ check: "row_domain_isolation_passed" });

  const guard = auditEstimateRowDomainGuard({
    selected_work_key: snapshot.selected_work_key,
    expected_domain: snapshot.group_key,
    rows: snapshot.lines,
  });
  const leaks = detectCrossDomainRowLeaks({
    selected_work_key: snapshot.selected_work_key,
    expected_domain: snapshot.group_key,
    rows: snapshot.lines,
  });
  const failures = [
    ...leaks.map((leak) => qualityFailure({
      code: "CROSS_DOMAIN_ROW_LEAK" as const,
      details: `Row belongs to ${leak.leaked_domain}, expected ${leak.expected_domain}.`,
      selectedWorkKey: snapshot.selected_work_key,
      rowKey: leak.leaked_row_key,
      visibleNameRu: leak.leaked_row,
    })),
    ...Array.from({ length: guard.row_without_provenance }, (_, index) => qualityFailure({
      code: "ROW_WITHOUT_PROVENANCE" as const,
      details: "Estimate line is missing template/source/price provenance.",
      selectedWorkKey: snapshot.selected_work_key,
      rowKey: `row_without_provenance_${index + 1}`,
    })),
    ...Array.from({ length: guard.generic_material_rows }, (_, index) => qualityFailure({
      code: "GENERIC_MATERIAL_ROW" as const,
      details: "Generic material row cannot be treated as professional.",
      selectedWorkKey: snapshot.selected_work_key,
      rowKey: `generic_material_${index + 1}`,
    })),
    ...Array.from({ length: guard.paid_control_rows }, (_, index) => qualityFailure({
      code: "PAID_CONTROL_ROW" as const,
      details: "Control/check row cannot be a paid estimate row.",
      selectedWorkKey: snapshot.selected_work_key,
      rowKey: `paid_control_${index + 1}`,
    })),
  ];

  return qualityRuleResult({ check: "row_domain_isolation_passed", failures });
}
