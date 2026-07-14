import {
  auditProfessionalEstimateRiskReadiness,
  buildProfessionalEstimateRiskFindingFromPricingBlocker,
} from "../../src/lib/estimate/auditProfessionalEstimateRiskReadiness";
import {
  RISK_AUDIT_11610_BASELINE_SHA,
  S_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_REAL_ESTIMATES_ROOT_CAUSE_REMEDIATION_WEB_ANDROID_PDF_POINT_OF_NO_RELEASE,
  STOP_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_BLOCKERS_FOUND_NO_RELEASE,
} from "../../src/lib/estimate/professionalEstimateRiskAuditContract";
import type { PricingBlockerLedgerEntry } from "../../src/lib/estimate/kgRegionalPricingContract";

jest.setTimeout(420_000);

describe("Professional estimate 11610 risk ledger", () => {
  it("audits the full catalog and imports upstream pricing STOP as P1 blockers", () => {
    const result = auditProfessionalEstimateRiskReadiness({ findingSampleLimit: 8 });
    const summary = result.summary;

    expect(summary.target_status).toBe(
      S_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_REAL_ESTIMATES_ROOT_CAUSE_REMEDIATION_WEB_ANDROID_PDF_POINT_OF_NO_RELEASE,
    );
    expect(summary.final_status).toBe(STOP_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_BLOCKERS_FOUND_NO_RELEASE);
    expect(summary.baseline_sha).toBe(RISK_AUDIT_11610_BASELINE_SHA);
    expect(summary.catalog_total).toBe(11610);
    expect(summary.catalog_audited).toBe(11610);
    expect(summary.priceable_resource_rows).toBeGreaterThan(11610);
    expect(summary.unique_price_keys).toBeGreaterThan(0);
    expect(summary.p0_open_count).toBe(0);
    expect(summary.p1_open_count).toBe(summary.upstream_unresolved_blockers_count);
    expect(summary.p2_open_count).toBe(0);
    expect(summary.price_source_missing_count).toBe(summary.unique_price_keys);
    expect(summary.external_blocker_count).toBe(summary.price_source_missing_count);
    expect(summary.open_findings_count).toBe(summary.upstream_unresolved_blockers_count);
    expect(summary.closed_findings_count).toBe(0);
    expect(summary.full_11610_audit_passed).toBe(false);
    expect(summary.real_estimate_corpus_5000_manifest_hash).toBeNull();
    expect(summary.real_estimate_corpus_5000_passed).toBe(false);
    expect(summary.web_replay_passed).toBe(false);
    expect(summary.android_replay_passed).toBe(false);
    expect(summary.pdf_replay_passed).toBe(false);
    expect(summary.full_catalog_green_claimed).toBe(false);
    expect(summary.release_started).toBe(false);
    expect(summary.deploy_started).toBe(false);
    expect(summary.eas_started).toBe(false);
    expect(summary.native_build_started).toBe(false);
    expect(summary.production_db_touched).toBe(false);
    expect(summary.main_changed).toBe(false);
    expect(summary.pr44_changed).toBe(false);
    expect(summary.catalog_registry_hash).toMatch(/^eh_/);
    expect(summary.passport_registry_hash).toMatch(/^eh_/);
    expect(summary.assembly_registry_hash).toMatch(/^eh_/);
    expect(summary.formula_registry_hash).toMatch(/^eh_/);
    expect(summary.source_registry_hash).toMatch(/^eh_/);
    expect(summary.price_registry_hash).toMatch(/^eh_/);
    expect(summary.audit_manifest_hash).toMatch(/^eh_/);
    expect(summary.pricing_summary_hash).toMatch(/^eh_/);

    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.length).toBeLessThanOrEqual(8);
    const first = result.findings[0];
    expect(Object.keys(first)).toEqual([
      "finding_id",
      "case_id",
      "work_id",
      "professional_family",
      "severity",
      "risk_type",
      "observed",
      "expected",
      "source_evidence",
      "root_cause",
      "affected_work_ids",
      "affected_passport_ids",
      "affected_formula_ids",
      "resolution",
      "regression_test",
      "commit_sha",
      "status",
    ]);
    expect(first.finding_id).toMatch(/^professional_risk_/);
    expect(first.severity).toBe("P1");
    expect(first.risk_type).toBe("PRICE_SOURCE_MISSING");
    expect(first.status).toBe("EXTERNAL_BLOCKER");
    expect(first.commit_sha).toBe(RISK_AUDIT_11610_BASELINE_SHA);
    expect(first.affected_work_ids.length).toBeGreaterThan(0);
    expect(first.affected_passport_ids[0]).toContain(first.affected_work_ids[0]);
    expect(first.resolution).toMatch(/verified supplier|official|contract|market price/i);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.source_evidence)).toBe(true);
    expect(Object.isFrozen(first.affected_work_ids)).toBe(true);
  });

  it("builds stable immutable risk findings from pricing blockers", () => {
    const blocker: PricingBlockerLedgerEntry = Object.freeze({
      blocker_id: "kg_pricing_blocker_test_price_source_missing",
      work_ids: ["work_b", "work_a"],
      resource_code: "material:test",
      price_key_id: "kg_price_key_test",
      blocker_type: "PRICE_SOURCE_MISSING",
      severity: "required",
      reason_ru: "No verified price source.",
      source_evidence: Object.freeze({
        affected_resource_rows: 2,
        work_ids_truncated: false,
      }),
      owner: "supplier_price_registry",
      required_action: "Add verified supplier quote.",
      created_at: "2026-07-14T00:00:00.000Z",
      resolved_at: null,
      resolution: null,
    });

    const first = buildProfessionalEstimateRiskFindingFromPricingBlocker(blocker);
    const second = buildProfessionalEstimateRiskFindingFromPricingBlocker(blocker);

    expect(first).toEqual(second);
    expect(first.finding_id).toBe(second.finding_id);
    expect(first.affected_work_ids).toEqual(["work_a", "work_b"]);
    expect(first.affected_formula_ids).toEqual([]);
    expect(first.root_cause).toBe(
      "KG_PRICE_SOURCE_REGISTRY_HAS_NO_VERIFIED_SUPPLIER_OR_OFFICIAL_RECORD_FOR_PRICE_KEY",
    );
    expect(first.regression_test).toBe("tests/estimateNorms/professionalEstimateRiskAudit.contract.test.ts");
    expect(first.status).toBe("EXTERNAL_BLOCKER");
    expect(Object.isFrozen(first)).toBe(true);
  });
});
