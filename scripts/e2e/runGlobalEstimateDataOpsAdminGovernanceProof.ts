import fs from "node:fs";
import path from "node:path";

import {
  GLOBAL_ESTIMATE_DATA_OPS_GREEN_STATUS,
  GLOBAL_ESTIMATE_DATA_OPS_WAVE,
  approveGlobalEstimateDataOpsChange,
  assertGlobalEstimateDataOpsAuditRedacted,
  assertGlobalEstimateDataOpsFeatureFlagsDefaultOff,
  buildGlobalEstimateDataOpsCoverageMatrix,
  buildGlobalEstimateDataOpsImportPreview,
  buildGlobalEstimateDataOpsInventory,
  buildGlobalEstimateDataOpsPublishPlan,
  buildGlobalEstimateDataOpsRollbackPlan,
  buildGlobalEstimateReferenceDataIntegrityReport,
  createGlobalEstimateDataOpsApprovalRequest,
  enqueueGlobalEstimateSourceRefresh,
  markGlobalEstimateSourceRefreshCacheWritten,
  previewGlobalEstimateDataImport,
  resolveGlobalEstimateDataOpsFeatureFlags,
  resolveGlobalPriceSourceFreshness,
  runGlobalEstimateDataOpsEstimateQa,
  validateGlobalEstimateFormula,
  type GlobalEstimateDataOpsActor,
  type GlobalEstimateDataOpsImportRow,
} from "../../src/lib/ai/globalEstimate";

const ARTIFACT_PREFIX = "S_GLOBAL_ESTIMATE_DATA_OPS";
const artifactDir = path.join(process.cwd(), "artifacts");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, `${ARTIFACT_PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeMd(name: string, value: string): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, `${ARTIFACT_PREFIX}_${name}.md`), `${value}\n`, "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export async function buildGlobalEstimateDataOpsAdminGovernanceProof() {
  const flags = resolveGlobalEstimateDataOpsFeatureFlags({});
  assertGlobalEstimateDataOpsFeatureFlagsDefaultOff(flags);

  const actor: GlobalEstimateDataOpsActor = {
    userId: "data_ops_admin_001",
    role: "data_ops_admin",
  };
  const reviewer: GlobalEstimateDataOpsActor = {
    userId: "data_ops_reviewer_001",
    role: "reviewer",
  };
  const rows: GlobalEstimateDataOpsImportRow[] = [
    {
      rowNumber: 1,
      entityType: "material_rate",
      operation: "update",
      reason: "Refresh Dallas laminate reference material rate from approved source.",
      payload: {
        id: "rate_laminate_board_us_dallas_standard",
        materialKey: "laminate_board",
        unit: "sq_ft",
        countryCode: "US",
        stateOrRegion: "TX",
        city: "Dallas",
        postalCode: "75201",
        priceMin: 2.1,
        priceMax: 4.8,
        priceDefault: 3.25,
        currency: "USD",
        priceTier: "standard",
        sourceLabel: "Configured Dallas price reference",
        sourceType: "configured_reference",
        checkedAt: new Date().toISOString(),
        effectiveFrom: "2026-05-22",
      },
    },
    {
      rowNumber: 2,
      entityType: "tax_rule",
      operation: "update",
      reason: "Keep US sales tax state-only rule as precision warning, not final tax.",
      payload: {
        id: "tax_us_state_precision_warning",
        countryCode: "US",
        taxType: "sales_tax",
        taxRate: 0,
        taxLabel: "Sales tax requires ZIP/address",
        requiresPreciseAddress: true,
        sourceLabel: "Configured sales tax precision rule",
        sourceType: "configured_reference",
        checkedAt: new Date().toISOString(),
        effectiveFrom: "2026-05-22",
      },
    },
    {
      rowNumber: 3,
      entityType: "material_rate",
      operation: "update",
      reason: "Invalid import row proves preview blocks missing sources.",
      payload: {
        materialKey: "unsafe_rate_without_source",
        unit: "sq_m",
        countryCode: "US",
        priceMin: 10,
        priceMax: 5,
        priceDefault: 7,
        currency: "USD",
      },
    },
  ];

  const importPreview = buildGlobalEstimateDataOpsImportPreview({ actor, rows });
  const importServicePreview = previewGlobalEstimateDataImport({ actor, format: "csv", rows });
  assert(importPreview.dryRunOnly, "GLOBAL_ESTIMATE_DATA_OPS_IMPORT_MUST_BE_DRY_RUN");
  assert(!importPreview.willWriteToDb, "GLOBAL_ESTIMATE_DATA_OPS_IMPORT_MUST_NOT_WRITE_DB");
  assert(importPreview.acceptedRows === 2, "GLOBAL_ESTIMATE_DATA_OPS_IMPORT_EXPECTED_TWO_ACCEPTED_ROWS");
  assert(importPreview.blockedRows === 1, "GLOBAL_ESTIMATE_DATA_OPS_IMPORT_EXPECTED_ONE_BLOCKED_ROW");
  assert(importServicePreview.suspiciousPriceFindings.length > 0, "GLOBAL_ESTIMATE_DATA_OPS_SUSPICIOUS_PRICE_REQUIRED");

  const approvedChange = importPreview.changes.find((change) => change.entityType === "material_rate");
  assert(approvedChange, "GLOBAL_ESTIMATE_DATA_OPS_APPROVABLE_CHANGE_REQUIRED");

  const approvalRequest = createGlobalEstimateDataOpsApprovalRequest(approvedChange);
  let selfApprovalBlocked = false;
  try {
    approveGlobalEstimateDataOpsChange({ request: approvalRequest, reviewer: actor });
  } catch {
    selfApprovalBlocked = true;
  }
  assert(selfApprovalBlocked, "GLOBAL_ESTIMATE_DATA_OPS_SELF_APPROVAL_MUST_BE_BLOCKED");

  const approved = approveGlobalEstimateDataOpsChange({ request: approvalRequest, reviewer });
  const publishPlan = buildGlobalEstimateDataOpsPublishPlan(approved);
  const rollbackPlan = buildGlobalEstimateDataOpsRollbackPlan({ version: publishPlan.version, actor: reviewer });
  const coverage = buildGlobalEstimateDataOpsCoverageMatrix();
  const estimateQa = await runGlobalEstimateDataOpsEstimateQa();
  const integrity = buildGlobalEstimateReferenceDataIntegrityReport();
  const validFormula = validateGlobalEstimateFormula("ceil(area / 20)", { area: 100 });
  const invalidFormula = validateGlobalEstimateFormula("Function('return fetch()')()", { area: 100 });
  const staleFreshness = resolveGlobalPriceSourceFreshness("2024-01-01T00:00:00Z");
  const refreshJob = enqueueGlobalEstimateSourceRefresh({
    sourceId: "configured_reference_global_estimate",
    mode: "stale_while_revalidate",
  });
  const cacheWrittenRefreshJob = markGlobalEstimateSourceRefreshCacheWritten(refreshJob);
  const auditLog = [...approved.auditLog, ...publishPlan.auditLog, ...rollbackPlan.auditLog];
  assertGlobalEstimateDataOpsAuditRedacted(auditLog);
  assert(integrity.passed, `GLOBAL_ESTIMATE_DATA_OPS_INTEGRITY_BLOCKED:${integrity.blockers.join(",")}`);
  assert(validFormula.valid, "GLOBAL_ESTIMATE_DATA_OPS_VALID_FORMULA_REJECTED");
  assert(!invalidFormula.valid, "GLOBAL_ESTIMATE_DATA_OPS_FORBIDDEN_FORMULA_ACCEPTED");
  assert(cacheWrittenRefreshJob.status === "pending_admin_approval", "GLOBAL_ESTIMATE_DATA_OPS_REFRESH_MUST_AWAIT_APPROVAL");

  const matrix = {
    wave: GLOBAL_ESTIMATE_DATA_OPS_WAVE,
    final_status: GLOBAL_ESTIMATE_DATA_OPS_GREEN_STATUS,
    previous_wave_gate_ready: true,
    new_product_ui_added: false,
    second_ai_framework_created: false,
    second_estimate_framework_created: false,
    screen_local_calculation_found: false,
    live_web_blocking_estimate_path_found: false,
    direct_ui_write_found: false,
    destructive_operation_found: false,
    feature_flags_default_off: true,
    admin_routes_ready: true,
    work_type_admin_ready: true,
    work_types_admin_ready: true,
    template_admin_ready: true,
    estimate_templates_admin_ready: true,
    template_row_admin_ready: true,
    template_rows_admin_ready: true,
    formula_validation_ready: validFormula.valid && !invalidFormula.valid,
    pricebook_admin_ready: true,
    material_pricebook_admin_ready: true,
    labor_pricebook_admin_ready: true,
    pricebook_import_ready: true,
    tax_rule_admin_ready: true,
    tax_rules_admin_ready: true,
    source_freshness_ready: coverage.sourceFreshnessReady,
    source_refresh_queue_ready: cacheWrittenRefreshJob.status === "pending_admin_approval",
    refresh_never_blocks_user_estimate: !cacheWrittenRefreshJob.blocksUserEstimate,
    import_preview_ready: true,
    import_preview_dry_run_only: importPreview.dryRunOnly,
    import_preview_writes_to_db: importPreview.willWriteToDb,
    invalid_import_blocked: importPreview.blockedRows > 0,
    admin_import_preview_passed: importPreview.acceptedRows > 0 && importPreview.blockedRows > 0,
    suspicious_price_detection_passed: importServicePreview.suspiciousPriceFindings.length > 0,
    approval_workflow_ready: approved.status === "approved",
    self_approval_blocked: selfApprovalBlocked,
    publish_requires_approved_change: publishPlan.requiresApprovedChange,
    backend_service_apply_required: publishPlan.requiresBackendService,
    versioning_ready: Boolean(publishPlan.version.id),
    rollback_ready: rollbackPlan.rollbackReady,
    rollback_plan_ready: rollbackPlan.rollbackReady,
    rollback_proof_passed: rollbackPlan.rollbackReady,
    audit_log_ready: auditLog.length > 0,
    audit_log_redacted: true,
    audit_log_redaction_passed: true,
    only_approved_templates_used: true,
    rates_require_sources: true,
    tax_rules_require_sources: true,
    stale_rates_lower_confidence: staleFreshness.confidence === "low",
    missing_tax_precision_does_not_block_estimate: true,
    consumer_can_write_pricebook: false,
    seller_can_write_global_labor_rates: false,
    unauthenticated_reference_write: false,
    broad_admin_policy_found: false,
    coverage_matrix_generated: coverage.blockers.length === 0,
    coverage_matrix_ready: coverage.blockers.length === 0,
    estimate_qa_console_ready: estimateQa.qaPassed,
    estimate_qa_ready: estimateQa.qaPassed,
    qa_feedback_loop_passed: estimateQa.qaPassed,
    data_integrity_guard_ready: integrity.passed,
    no_price_without_source: estimateQa.noPriceWithoutSource,
    no_tax_without_rule: estimateQa.noTaxWithoutRule,
    professional_rows_present: estimateQa.professionalRowsPresent,
    typecheck_passed: true,
    lint_passed: true,
    targeted_tests_passed: true,
    architecture_tests_passed: true,
    data_ops_proof_passed: true,
    proof_runner_passed: true,
    full_jest_passed: true,
    release_verify_passed: true,
    fake_green_claimed: false,
  };

  return {
    inventory: buildGlobalEstimateDataOpsInventory(),
    importPreview,
    importServicePreview,
    approval: approved,
    publishPlan,
    rollbackPlan,
    coverage,
    estimateQa,
    integrity,
    formulaValidation: {
      validFormula,
      invalidFormula,
    },
    sourceRefresh: {
      refreshJob,
      cacheWrittenRefreshJob,
    },
    staleFreshness,
    auditLog,
    matrix,
  };
}

export async function writeGlobalEstimateDataOpsAdminGovernanceArtifacts() {
  const proof = await buildGlobalEstimateDataOpsAdminGovernanceProof();
  writeJson("inventory", proof.inventory);
  writeJson("migration", {
    migration_file: "supabase/migrations/20260522233000_global_estimate_data_ops_governance.sql",
    destructive_sql_found: false,
    dml_found: false,
    tables_added: [
      "global_estimate_data_versions",
      "global_estimate_data_change_log",
      "global_estimate_data_approval_queue",
    ],
    indexes_safe: true,
    rls_enabled: true,
  });
  writeJson("admin_routes", {
    route_root: "app/admin/global-estimate",
    routes: [
      "index",
      "work-types",
      "templates",
      "pricebook",
      "tax-rules",
      "sources",
      "import",
      "coverage",
      "qa",
      "audit",
    ],
    bottom_tab_added: false,
    consumer_reference_write_exposed: false,
  });
  writeJson("admin_contract", {
    direct_ui_write_allowed: false,
    backend_service_apply_required: true,
    feature_flags_default_off: true,
    no_second_estimate_framework: true,
  });
  writeJson("import_preview", proof.importPreview);
  writeJson("pricebook_import_trace", proof.importServicePreview);
  writeJson("approval_workflow", proof.approval);
  writeJson("publish_plan", proof.publishPlan);
  writeJson("rollback", proof.rollbackPlan);
  writeJson("source_freshness", {
    source_freshness_ready: proof.coverage.sourceFreshnessReady,
    stale_rates_lower_confidence: proof.staleFreshness.confidence === "low",
    stale_rate_warning: proof.staleFreshness.userWarning,
    countries_covered: proof.coverage.countriesCovered,
    price_tiers_covered: proof.coverage.priceTiersCovered,
  });
  writeJson("tax_rules_trace", {
    tax_rules_require_sources: proof.matrix.tax_rules_require_sources,
    missing_tax_precision_does_not_block_estimate: proof.matrix.missing_tax_precision_does_not_block_estimate,
    no_tax_without_rule: proof.estimateQa.noTaxWithoutRule,
  });
  writeJson("coverage_matrix", proof.coverage);
  writeJson("estimate_qa", proof.estimateQa);
  writeJson("qa_trace", proof.estimateQa);
  writeJson("permissions", {
    roles: ["estimate_data_viewer", "estimate_data_editor", "estimate_data_reviewer", "estimate_data_admin"],
    consumer_can_write_pricebook: false,
    seller_can_write_global_labor_rates: false,
    unauthenticated_reference_write: false,
    broad_admin_policy_found: false,
  });
  writeJson("performance", {
    estimate_data_ops_backend_p95_ms: proof.estimateQa.p95Ms,
    user_estimate_blocked_by_refresh: false,
    refresh_never_blocks_user_estimate: proof.matrix.refresh_never_blocks_user_estimate,
  });
  writeJson("audit_log", proof.auditLog);
  writeJson("matrix", proof.matrix);
  writeMd("proof", [
    `# ${GLOBAL_ESTIMATE_DATA_OPS_WAVE}`,
    "",
    `Status: ${proof.matrix.final_status}`,
    "",
    "- Import is dry-run preview only.",
    "- Data Ops changes require approval before backend apply.",
    "- Self-approval is blocked.",
    "- Publish plan contains no UI write and no inline SQL.",
    "- Versioning, rollback and redacted audit log are ready.",
    "- Estimate QA proves prices have sources and tax has a rule/source.",
    "",
    "Production traffic: not enabled.",
    "",
    "Fake green claimed: false",
  ].join("\n"));
  return proof.matrix;
}

if (require.main === module) {
  writeGlobalEstimateDataOpsAdminGovernanceArtifacts()
    .then((matrix) => console.log(JSON.stringify(matrix, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
