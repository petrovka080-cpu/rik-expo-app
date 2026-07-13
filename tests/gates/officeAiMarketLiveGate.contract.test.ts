import fs from "node:fs";
import path from "node:path";
import {
  OFFICE_AI_MARKET_LIVE_GATE_FAILURE_CATEGORIES,
  OFFICE_AI_MARKET_LIVE_GATE_STOP_STATUS_BY_CATEGORY,
  buildOfficeAiMarketLiveGateFailure,
} from "../../scripts/gates/officeAiMarketLiveGateFailureTaxonomy";
import {
  createSyntheticLiveGateEvidence,
  evaluateOfficeAiMarketLiveRepeatabilityEvidence,
} from "../../scripts/gates/auditOfficeAiMarketLiveCleanup";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function greenSummary(runNumber: number): Record<string, unknown> {
  return {
    final_status: "GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS",
    branch: "release/ios-after-build48-integration",
    source_sha: "1111111111111111111111111111111111111111",
    run_started_at: `2026-06-30T21:0${runNumber}:00.000Z`,
    role_isolation: true,
    same_company_for_all_roles: true,
    ai_estimate_created: true,
    ai_estimate_user_confirmed: true,
    ai_request_submitted: true,
    ai_request_id: runNumber === 1 ? "11111111-1111-4111-8111-111111111111" : "22222222-2222-4222-8222-222222222222",
    ai_request_id_present: true,
    manual_estimate_created: true,
    manual_request_submitted: true,
    manual_totals_recalculated: true,
    manual_request_id: runNumber === 1 ? "33333333-3333-4333-8333-333333333333" : "44444444-4444-4444-8444-444444444444",
    manual_request_id_present: true,
    director_ai_request_visible: true,
    director_manual_request_visible: true,
    director_pdf_ai_opened: true,
    director_pdf_manual_opened: true,
    director_approve_ai_passed: true,
    director_approve_manual_passed: true,
    buyer_ai_request_visible_after_approve: true,
    buyer_manual_request_visible_after_approve: true,
    buyer_full_items_visible: true,
    buyer_no_item_truncation: true,
    warehouse_route_visible: true,
    warehouse_procurement_items_visible: true,
    contractor_route_visible: true,
    contractor_request_visible: true,
    accountant_route_visible: true,
    accountant_amounts_visible: true,
    market_listing_created: true,
    market_listing_id: runNumber === 1 ? "55555555-5555-4555-8555-555555555555" : "66666666-6666-4666-8666-666666666666",
    market_real_photo_attached: true,
    market_counter_matches_assets_length: true,
    market_photo_change_passed: true,
    market_photo_delete_passed: true,
    market_photo_readd_passed: true,
    market_card_photo_visible: true,
    market_card_photo_visible_after_refresh: true,
    market_my_listings_screen_visible: true,
    market_my_listing_visible: true,
    market_my_listing_media_visible: true,
    market_my_listing_after_refresh_visible: true,
    market_my_listing_after_relogin_visible: true,
    market_detail_photo_visible: true,
    market_detail_photo_visible_after_relogin: true,
    market_product_card_visible: true,
    market_product_contact_panel_visible: true,
    market_product_related_feed_visible: true,
    image_url_not_blob: true,
    image_url_not_data_url: true,
    image_url_not_local_file: true,
    image_record_exists: true,
    persistent_image_url_present: true,
    live_gate_extended_with_my_listings: true,
    live_gate_my_listings_owner_only: true,
    live_gate_my_listings_media_persistent: true,
    live_gate_public_market_unaffected: true,
    production_db_touched: false,
    destructive_migration_run: false,
    seed_reset_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    developer_full_access_used_as_proof: false,
    developer_control_used_as_proof: false,
    fake_green_claimed: false,
  };
}

describe("office AI market live gate contract", () => {
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const driftSource = read("scripts/gates/checkOfficeAiMarketLiveRoleDrift.ts");
  const cleanupSource = read("scripts/gates/auditOfficeAiMarketLiveCleanup.ts");
  const taxonomySource = read("scripts/gates/officeAiMarketLiveGateFailureTaxonomy.ts");
  const docsSource = read("docs/office-ai-market-live-gate.md");

  it("exposes the no-build live, drift, and cleanup-audit commands", () => {
    expect(packageJson.scripts?.["gate:office-ai-market-live"]).toBe("tsx scripts/e2e/runOfficeMarketLiveWebE2E.ts");
    expect(packageJson.scripts?.["gate:office-ai-market-live:drift"]).toBe(
      "tsx scripts/gates/checkOfficeAiMarketLiveRoleDrift.ts",
    );
    expect(packageJson.scripts?.["gate:office-ai-market-live:cleanup-audit"]).toBe(
      "tsx scripts/gates/auditOfficeAiMarketLiveCleanup.ts",
    );
    expect(packageJson.scripts?.["e2e:office-market-live-web"]).toBe("tsx scripts/e2e/runOfficeMarketLiveWebE2E.ts");
  });

  it("keeps the taxonomy complete and machine-readable", () => {
    const expected = [
      "ROLE_FIXTURE_DRIFT",
      "AUTH_CREDENTIAL_INVALID",
      "COMPANY_SCOPE_MISMATCH",
      "DIRECTOR_VISIBILITY_BROKEN",
      "DIRECTOR_PDF_BROKEN",
      "DIRECTOR_APPROVE_BROKEN",
      "BUYER_HANDOFF_BROKEN",
      "BUYER_ITEM_TRUNCATION",
      "WAREHOUSE_SCOPE_BROKEN",
      "CONTRACTOR_VISIBILITY_BROKEN",
      "ACCOUNTANT_DEBUG_NOISE",
      "MARKET_UPLOAD_BROKEN",
      "MARKET_PERSISTENT_IMAGE_BROKEN",
      "MARKET_ADD_TO_ESTIMATE_BROKEN",
      "AI_CONFIRMATION_BROKEN",
      "CLEANUP_SCOPE_UNSAFE",
      "SECRET_LEAK_RISK",
      "INFRA_FLAKE",
      "UNKNOWN_PRODUCT_REGRESSION",
    ];
    expect(OFFICE_AI_MARKET_LIVE_GATE_FAILURE_CATEGORIES).toEqual(expected);
    for (const category of OFFICE_AI_MARKET_LIVE_GATE_FAILURE_CATEGORIES) {
      expect(OFFICE_AI_MARKET_LIVE_GATE_STOP_STATUS_BY_CATEGORY[category]).toBe(`STOP_${category}`);
      expect(buildOfficeAiMarketLiveGateFailure(category, "synthetic").secret_redacted).toBe(true);
    }
    expect(taxonomySource).not.toContain("as any");
  });

  it("validates a two-run repeatability pair without source drift or fake green", () => {
    const first = createSyntheticLiveGateEvidence("2026-06-30T21-01-00-000Z", greenSummary(1));
    const second = createSyntheticLiveGateEvidence("2026-06-30T21-02-00-000Z", greenSummary(2));
    const evaluation = evaluateOfficeAiMarketLiveRepeatabilityEvidence(
      first,
      second,
      "1111111111111111111111111111111111111111",
    );
    expect(evaluation.repeatability_two_runs).toBe(true);
    expect(evaluation.repeatability_passed).toBe(true);
    expect(evaluation.cleanup_scope_bounded).toBe(true);
    expect(evaluation.cleanup_idempotent).toBe(true);
    expect(evaluation.fake_green_claimed).toBe(false);
    expect(evaluation.market_real_photo_persistent).toBe(true);
    expect(evaluation.ai_estimate_requires_user_confirmation).toBe(true);
  });

  it("documents the operator runbook sections", () => {
    for (const section of [
      "How To Run Drift Audit",
      "How To Run Two-Pass Repeatability Check",
      "How Cleanup Is Bounded",
      "STOP Categories",
      "Fixture Repair Vs Source Repair",
      "Why Developer Control Is Not Accepted",
      "Market Image Proof",
      "AI Estimate Confirmation",
      "Evidence Safe To Share",
    ]) {
      expect(docsSource).toContain(section);
    }
  });

  it("keeps gate sources production-safe and non-release", () => {
    const combined = [driftSource, cleanupSource].join("\n");
    expect(combined).toContain("developer_control_used_as_proof: false");
    expect(combined).toContain("cleanup_does_not_execute_db_deletes");
    expect(combined).not.toMatch(/@ts-nocheck|ts-ignore|test\.skip|test\.only|describe\.only/);
    expect(combined).not.toMatch(/process[.]exit[(]0[)]|--no-verify/);
    expect(combined).not.toMatch(/eas\s+(build|submit|update)|release:verify|release:pipeline:verify/);
    expect(combined).not.toMatch(/\.delete\s*\(|\btruncate\s+table\b|\bdelete\s+from\b/i);
  });
});
