import { buildFinal50k92ScoreReaudit } from "../../scripts/audit/final50k92ScoreReaudit.shared";
import { isIosTestFlightInternalQaScopedRun } from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

describe("final 50k 9.2 scorecard evidence", () => {
  it("uses hardening-wave evidence and requires live proof evidence for live gates", () => {
    const report = buildFinal50k92ScoreReaudit();
    const evidence = report.evidenceMap;

    if (isIosTestFlightInternalQaScopedRun()) {
      expect(report.matrix.fake_green_claimed).toBe(false);
      expect(report.matrix.new_score_out_of_10_gte_9_2).toBe(false);
      expect(report.matrix.external_blockers.length).toBeGreaterThan(0);
      return;
    }

    expect(evidence.query_boundary_resolved).toBe(true);
    expect(evidence.media_storage_100k_passed).toBe(true);
    expect(evidence.ai_live_transcripts_passed).toBe(true);
    expect(evidence.ai_context_gateway_budget_passed).toBe(true);
    expect(evidence.backend_service_boundaries_passed).toBe(true);
    expect(evidence.transactions_idempotency_passed).toBe(true);
    expect(evidence.observability_rate_limits_passed).toBe(true);
    expect(evidence.security_privacy_passed).toBe(true);
    expect(evidence.release_pipeline_passed).toBe(true);

    expect(evidence.rls_static_preflight_passed).toBe(true);
    expect(evidence.whole_app_50k_static_preflight_passed).toBe(true);
    if (evidence.rls_dynamic_proof_passed) {
      expect(evidence.rls_status).toBe("GREEN_RLS_DYNAMIC_CROSS_TENANT_READY");
    } else {
      expect(typeof evidence.rls_external_blocker).toBe("string");
      expect(String(evidence.rls_external_blocker)).toMatch(
        /SUPABASE_RLS_PROOF_DATABASE_URL_REQUIRED|ALLOW_RLS_DYNAMIC_MUTATION_PROOF=1_REQUIRED|RUN_RLS_DYNAMIC_LIVE_PROOF_REQUIRED|RUN_RLS_DYNAMIC_LIVE_PROOF_FAILED|RLS_DYNAMIC_LIVE_PROOF_CONNECTIVITY_FAILED|RLS_DYNAMIC_LIVE_PROOF_AUTH_FAILED/,
      );
    }
    if (evidence.whole_app_50k_proof_passed) {
      expect(evidence.whole_app_50k_status).toBe("GREEN_WHOLE_APP_50K_EXPLAIN_P95_READY");
    } else {
      expect(typeof evidence.whole_app_50k_external_blocker).toBe("string");
      expect(String(evidence.whole_app_50k_external_blocker)).toMatch(
        /WHOLE_APP_50K_DATABASE_URL_REQUIRED|ALLOW_WHOLE_APP_50K_LIVE_PROOF=1_REQUIRED|RUN_WHOLE_APP_50K_LIVE_PROOF_REQUIRED|RUN_WHOLE_APP_50K_LIVE_PROOF_FAILED|WHOLE_APP_50K_LIVE_PROOF_CONNECTIVITY_FAILED|WHOLE_APP_50K_LIVE_PROOF_AUTH_FAILED|50K_FIXTURE_DATA_REQUIRED/,
      );
    }
    expect(report.matrix.fake_green_claimed).toBe(false);
  });
});
