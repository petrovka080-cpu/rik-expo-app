import {
  buildCoreMutationIdempotencyReport,
  CORE_MUTATION_IDEMPOTENCY_GREEN_STATUS,
} from "../../scripts/audit/coreMutationIdempotency.shared";

describe("core mutation idempotency discipline", () => {
  it("keeps core approve/submit mutation ids stable and service-boundary owned", () => {
    const report = buildCoreMutationIdempotencyReport({ assumeGatesPassed: true });

    expect(report.findings).toEqual([]);
    expect(report.matrix).toMatchObject({
      final_status: CORE_MUTATION_IDEMPOTENCY_GREEN_STATUS,
      core_mutation_id_helper_present: true,
      screen_random_client_mutation_ids_found: false,
      director_request_approve_id_boundary_owned: true,
      director_proposal_approve_id_boundary_owned: true,
      buyer_proposal_submit_id_stable: true,
      date_now_client_mutation_id_found: false,
      math_random_client_mutation_id_found: false,
      fake_green_claimed: false,
    });
  });
});

