import { readAuditJson, readRestoreJson, WAVE } from "./constructionWorkOntologyTestHelpers";

it("starts only after the catalog architecture audit green proof", () => {
  const audit = readAuditJson<Record<string, unknown>>("matrix.json");
  const restore = readRestoreJson<Record<string, unknown>>("matrix.json");

  expect(audit.final_status).toBe("GREEN_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT_READY");
  expect(audit.previous_restore_product_ui_pdf_green_confirmed).toBe(true);
  expect(audit.existing_catalog_audited).toBe(true);
  expect(audit.primary_catalog_table_identified).toBe(true);
  expect(audit.catalog_relationship_map_written).toBe(true);
  expect(audit.catalog_item_type_audit_written).toBe(true);
  expect(audit.catalog_duplicate_report_written).toBe(true);
  expect(audit.estimate_source_of_truth_map_written).toBe(true);
  expect(audit.foreman_request_flow_mapped).toBe(true);
  expect(audit.classification_standards_readiness_written).toBe(true);
  expect(audit.hybrid_retrieval_readiness_written).toBe(true);
  expect(audit.recommended_option).toBe("B");
  expect(audit.planned_next_wave).toBe(WAVE);
  expect(audit.full_jest_passed).toBe(true);
  expect(audit.release_verify_passed).toBe(true);
  expect(audit.final_worktree_clean).toBe(true);
  expect(audit.fake_green_claimed).toBe(false);
  expect(restore.final_status).toBe(
    "GREEN_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH_PROOF_REPAIRED_AND_REVERIFIED_READY",
  );
});
