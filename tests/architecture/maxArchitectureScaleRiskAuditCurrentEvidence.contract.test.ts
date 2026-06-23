import { buildMaxArchitectureScaleRiskAudit50k } from "../../scripts/audit/maxArchitectureScaleRiskAudit50k.shared";
import { isIosTestFlightInternalQaScopedRun } from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

describe("max architecture scale risk audit current evidence", () => {
  it("uses fresh hardening-wave matrices and leaves only live-proof external P1 blockers", () => {
    const report = buildMaxArchitectureScaleRiskAudit50k();
    const caps = report.scorecard.caps;
    const risks = report.riskRegister.risks;

    if (isIosTestFlightInternalQaScopedRun()) {
      expect(report.matrix.fake_green_claimed).toBe(false);
      expect(risks.length).toBeGreaterThan(0);
      return;
    }

    expect(report.matrix.final_status).toBe("GREEN_ARCHITECTURE_SCALE_RISK_AUDIT_50K_APP_SCORE_COMPLETE");
    expect(report.scorecard.current_score_out_of_10).toBeGreaterThanOrEqual(8.6);

    expect(caps.rls_static_policy_coverage_complete).toBe(true);
    expect(caps.query_boundary_green).toBe(true);
    expect(caps.query_candidates_unresolved).toBe(0);
    expect(caps.whole_app_50k_static_evidence_complete).toBe(true);
    expect(caps.media_100k_green).toBe(true);
    expect(caps.ai_live_transcript_green).toBe(true);
    expect(caps.observability_green).toBe(true);
    expect(caps.security_privacy_green).toBe(true);

    const localP1Risks = risks.filter((risk) =>
      risk.severity === "P1"
      && !risk.title.includes("requires a live Supabase database target")
      && !risk.title.includes("requires a live database target")
    );
    expect(localP1Risks).toEqual([]);

    const riskText = JSON.stringify(risks);
    expect(riskText).not.toContain("40 query-boundary candidates");
    expect(riskText).not.toContain("Media/PDF storage has good B2C proof but no fresh 100k");
    expect(riskText).not.toContain("AI usefulness is broadly covered by deterministic proofs");
  });
});
