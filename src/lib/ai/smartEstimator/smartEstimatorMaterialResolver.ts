import {
  auditEstimateRowDomainGuard,
  detectCrossDomainRowLeaks,
} from "../professionalEstimateTemplates";
import type { ProfessionalEstimateSnapshot } from "../professionalEstimateTemplates";
import type { SmartEstimatorMaterialAudit } from "./smartEstimatorTypes";

export function auditSmartEstimatorMaterials(
  snapshot: ProfessionalEstimateSnapshot,
): SmartEstimatorMaterialAudit {
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
  return {
    rows_checked: guard.rows_checked,
    cross_domain_row_leaks: leaks.length,
    row_without_provenance: guard.row_without_provenance,
    generic_material_rows: guard.generic_material_rows,
    paid_control_rows: guard.paid_control_rows,
    fake_green_claimed: false,
  };
}
