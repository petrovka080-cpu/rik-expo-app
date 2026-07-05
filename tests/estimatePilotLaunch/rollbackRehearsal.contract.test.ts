import { rehearseEstimatePilotRollback } from "../../scripts/estimate/rehearseEstimatePilotRollback";

describe("pilot launch rollback rehearsal", () => {
  it("keeps previous catalog/pricebook selectable and artifacts readable", () => {
    const summary = rehearseEstimatePilotRollback({ writeRuntime: false });

    expect(summary.rollback_rehearsal_passed).toBe(true);
    expect(summary.previous_catalog_selectable).toBe(true);
    expect(summary.previous_pricebook_selectable).toBe(true);
    expect(summary.feature_flag_disables_pilot_mode).toBe(true);
    expect(summary.snapshots_remain_readable).toBe(true);
    expect(summary.pdf_remains_readable).toBe(true);
    expect(summary.buyer_handoff_remains_auditable).toBe(true);
    expect(summary.support_package_versions_recorded).toBe(true);
  });
});
