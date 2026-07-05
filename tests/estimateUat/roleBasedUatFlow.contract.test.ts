import {
  buildRoleBasedUatScenarioProof,
  loadUatCriticalScenarios,
} from "../../scripts/estimate/buildRoleBasedUatDashboard";

describe("role based UAT flow proof", () => {
  it("checks request to snapshot, PDF, procurement, feedback and support package", () => {
    const scenario = loadUatCriticalScenarios()[0];
    const proof = buildRoleBasedUatScenarioProof(scenario, "web");

    expect(proof.passed).toBe(true);
    expect(proof.domain.parser_result_present).toBe(true);
    expect(proof.domain.snapshot_created).toBe(true);
    expect(proof.domain.pdf_generated_from_snapshot).toBe(true);
    expect(proof.domain.buyer_handoff_procurement_subset_valid).toBe(true);
    expect(proof.role_proof.support_package_redacted).toBe(true);
    expect(proof.feedback_item.scenario_id).toBe(scenario.scenario_id);
    expect(proof.feedback_item.revision_id).toBeTruthy();
  });
});
