import fs from "node:fs";
import path from "node:path";
import {
  createSyntheticLiveGateEvidence,
  evaluateOfficeAiMarketLiveRepeatabilityEvidence,
} from "../../scripts/gates/auditOfficeAiMarketLiveCleanup";
import {
  evaluateOfficeAiMarketLiveRoleDrift,
  type OfficeAiMarketLiveInternalRoleDriftRow,
} from "../../scripts/gates/checkOfficeAiMarketLiveRoleDrift";

const ROOT = process.cwd();
const ROLE_NAMES = ["foreman", "director", "buyer", "warehouse", "contractor", "accountant"] as const;
type RoleName = (typeof ROLE_NAMES)[number];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function roleRows(): OfficeAiMarketLiveInternalRoleDriftRow[] {
  return ROLE_NAMES.map((role) => ({
    role,
    expected_role: role,
    email_present: true,
    auth_login_success: true,
    profile_exists: true,
    membership_exists: true,
    resolved_role: role,
    company_id_hash: "companyhash",
    user_id_hash: `${role}hash`,
    user_id: `${role}-user-id`,
    role_unique: true,
    expected_role_matched: true,
    expected_company_matched: true,
    company_ids: ["company-id"],
    role_drift: false,
  }));
}

function greenSummary(runNumber: number): Record<string, unknown> {
  return {
    final_status: "GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS",
    source_sha: "2222222222222222222222222222222222222222",
    run_started_at: `2026-06-30T22:0${runNumber}:00.000Z`,
    role_isolation: true,
    same_company_for_all_roles: true,
    ai_estimate_created: true,
    ai_estimate_user_confirmed: true,
    ai_request_submitted: true,
    ai_request_id: runNumber === 1 ? "10101010-1010-4010-8010-101010101010" : "20202020-2020-4020-8020-202020202020",
    ai_request_id_present: true,
    manual_estimate_created: true,
    manual_request_submitted: true,
    manual_totals_recalculated: true,
    manual_request_id: runNumber === 1 ? "30303030-3030-4030-8030-303030303030" : "40404040-4040-4040-8040-404040404040",
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
    market_listing_id: runNumber === 1 ? "50505050-5050-4050-8050-505050505050" : "60606060-6060-4060-8060-606060606060",
    market_real_photo_attached: true,
    market_counter_matches_assets_length: true,
    market_photo_change_passed: true,
    market_photo_delete_passed: true,
    market_photo_readd_passed: true,
    market_card_photo_visible: true,
    market_card_photo_visible_after_refresh: true,
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

function cloneSummary(summary: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(summary)) as Record<string, unknown>;
}

function pairEvaluation(firstSummary: Record<string, unknown>, secondSummary = greenSummary(2)) {
  return evaluateOfficeAiMarketLiveRepeatabilityEvidence(
    createSyntheticLiveGateEvidence("2026-06-30T22-01-00-000Z", firstSummary),
    createSyntheticLiveGateEvidence("2026-06-30T22-02-00-000Z", secondSummary),
    "2222222222222222222222222222222222222222",
  );
}

describe("office AI market live gate no-fake-green contract", () => {
  const driftSource = read("scripts/gates/checkOfficeAiMarketLiveRoleDrift.ts");
  const cleanupSource = read("scripts/gates/auditOfficeAiMarketLiveCleanup.ts");
  const taxonomySource = read("scripts/gates/officeAiMarketLiveGateFailureTaxonomy.ts");
  const liveHarnessSource = read("scripts/e2e/runOfficeMarketLiveWebE2E.ts");

  it("fails closed for missing role credentials", () => {
    for (const missingRole of ["foreman", "buyer", "warehouse"] as const) {
      const rows = roleRows();
      const row = rows.find((candidate) => candidate.role === missingRole);
      expect(row).toBeDefined();
      if (!row) return;
      row.email_present = false;
      row.auth_login_success = false;
      row.profile_exists = false;
      row.membership_exists = false;
      row.user_id = null;
      row.user_id_hash = null;
      row.expected_role_matched = false;
      row.expected_company_matched = false;
      row.role_drift = true;
      const evaluation = evaluateOfficeAiMarketLiveRoleDrift(rows);
      const driftByRole: Record<RoleName, boolean> = {
        foreman: evaluation.foreman_role_drift,
        director: evaluation.director_role_drift,
        buyer: evaluation.buyer_role_drift,
        warehouse: evaluation.warehouse_role_drift,
        contractor: evaluation.contractor_role_drift,
        accountant: evaluation.accountant_role_drift,
      };
      expect(evaluation.role_drift_detected).toBe(true);
      expect(evaluation.role_isolation).toBe(false);
      expect(driftByRole[missingRole]).toBe(true);
    }
  });

  it("fails closed when all roles resolve to the same user", () => {
    const rows = roleRows().map((row) => ({
      ...row,
      user_id: "same-user-id",
      user_id_hash: "samehash",
    }));
    const evaluation = evaluateOfficeAiMarketLiveRoleDrift(rows);
    expect(evaluation.role_drift_detected).toBe(true);
    expect(evaluation.role_isolation).toBe(false);
    expect(evaluation.foreman_role_drift).toBe(true);
    expect(evaluation.director_role_drift).toBe(true);
  });

  it("fails closed for developer control, role isolation, and fake green proof", () => {
    const developerControl = cloneSummary(greenSummary(1));
    developerControl.developer_full_access_used_as_proof = true;
    expect(pairEvaluation(developerControl).repeatability_passed).toBe(false);

    const roleIsolationBroken = cloneSummary(greenSummary(1));
    roleIsolationBroken.role_isolation = false;
    expect(pairEvaluation(roleIsolationBroken).repeatability_passed).toBe(false);

    const fakeGreen = cloneSummary(greenSummary(1));
    fakeGreen.fake_green_claimed = true;
    expect(pairEvaluation(fakeGreen).fake_green_claimed).toBe(true);
  });

  it("fails closed for blob, file, media-local, and counter-only market photo proof", () => {
    const blobImage = cloneSummary(greenSummary(1));
    blobImage.image_url_not_blob = false;
    expect(pairEvaluation(blobImage).market_real_photo_persistent).toBe(false);

    const localImage = cloneSummary(greenSummary(1));
    localImage.image_url_not_local_file = false;
    expect(pairEvaluation(localImage).repeatability_passed).toBe(false);

    const mediaLocalMarker = cloneSummary(greenSummary(1));
    mediaLocalMarker.market_real_photo_attached = false;
    expect(pairEvaluation(mediaLocalMarker).failure_reasons).toContain(
      "2026-06-30T22-01-00-000Z:market_real_photo_attached_not_true",
    );

    const counterOnly = cloneSummary(greenSummary(1));
    counterOnly.image_record_exists = false;
    counterOnly.persistent_image_url_present = false;
    expect(pairEvaluation(counterOnly).failure_reasons).toContain(
      "2026-06-30T22-01-00-000Z:counter_only_photo_detected",
    );
  });

  it("fails closed when AI confirmation, Director PDF, or Buyer handoff invariants are broken", () => {
    const aiAutoApply = cloneSummary(greenSummary(1));
    aiAutoApply.ai_estimate_user_confirmed = false;
    expect(pairEvaluation(aiAutoApply).ai_estimate_requires_user_confirmation).toBe(false);

    const pdfMissing = cloneSummary(greenSummary(1));
    pdfMissing.director_pdf_ai_opened = false;
    expect(pairEvaluation(pdfMissing).failure_reasons).toContain(
      "2026-06-30T22-01-00-000Z:director_pdf_ai_opened_not_true",
    );

    const submittedNotApprovedVisible = cloneSummary(greenSummary(1));
    submittedNotApprovedVisible.director_approve_ai_passed = false;
    submittedNotApprovedVisible.buyer_ai_request_visible_after_approve = true;
    expect(pairEvaluation(submittedNotApprovedVisible).repeatability_passed).toBe(false);

    const approvedNotVisible = cloneSummary(greenSummary(1));
    approvedNotVisible.buyer_ai_request_visible_after_approve = false;
    expect(pairEvaluation(approvedNotVisible).failure_reasons).toContain(
      "2026-06-30T22-01-00-000Z:buyer_handoff_invariant_broken",
    );
  });

  it("fails closed for duplicate current-run records and unsafe cleanup surfaces", () => {
    const first = cloneSummary(greenSummary(1));
    const second = cloneSummary(greenSummary(2));
    second.market_listing_id = first.market_listing_id;

    const evaluation = pairEvaluation(first, second);
    expect(evaluation.duplicate_records_created).toBe(true);
    expect(evaluation.cleanup_scope_bounded).toBe(false);
    expect(evaluation.cleanup_idempotent).toBe(false);

    expect(cleanupSource).toContain("cleanup_does_not_execute_db_deletes");
    expect(cleanupSource).not.toMatch(/\.delete\s*\(|\btruncate\s+table\b|\bdelete\s+from\b/i);
  });

  it("keeps source contracts against skips, local media proof, and developer-control proof", () => {
    const combined = [driftSource, cleanupSource, liveHarnessSource].join("\n");
    expect(combined).not.toMatch(/\btest\.skip\b|\btest\.only\b|\bdescribe\.only\b/);
    expect(combined).not.toMatch(/process[.]exit[(]0[)]|--no-verify/);
    expect(driftSource).toContain("STOP_LIVE_ROLE_FIXTURE_DRIFT_DETECTED");
    expect(driftSource).toContain("role_unique");
    expect(driftSource).toContain("developer_control_used_as_proof: false");
    expect(taxonomySource).toContain("MARKET_PERSISTENT_IMAGE_BROKEN");
    expect(taxonomySource).toContain("AI_CONFIRMATION_BROKEN");
    expect(liveHarnessSource).not.toContain("openMarketplaceMediaPicker");
    expect(liveHarnessSource).toContain("marketplace.media.entrypoints.gallery_photo_button");
  });
});
