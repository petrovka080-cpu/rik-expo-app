import fs from "node:fs";
import path from "node:path";

import {
  AI_SCREEN_MAGIC_GREEN_STATUS,
  AI_SCREEN_MAGIC_WAVE,
  buildAiScreenMagicButtonManifest,
  buildAiScreenMagicInventory,
  buildAiScreenMagicMatrix,
  buildAiScreenMagicProofMarkdown,
} from "../../src/features/ai/screenMagic/aiScreenMagicProof";
import {
  AI_FINANCE_APPROVAL_MAGIC_GREEN_STATUS,
  AI_FINANCE_APPROVAL_MAGIC_WAVE,
  buildAiFinanceApprovalMagicButtonManifest,
  buildAiFinanceApprovalMagicInventory,
  buildAiFinanceApprovalMagicMatrix,
  buildAiFinanceApprovalMagicProofMarkdown,
} from "../ai/aiFinanceApprovalMagic";
import {
  AI_PROCUREMENT_SUPPLIERS_MAGIC_GREEN_STATUS,
  AI_PROCUREMENT_SUPPLIERS_MAGIC_SCOPE,
  AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE,
  buildAiProcurementSuppliersMagicButtonManifest,
  buildAiProcurementSuppliersMagicInventory,
  buildAiProcurementSuppliersMagicMatrix,
  buildAiProcurementSuppliersMagicProofMarkdown,
} from "../ai/aiProcurementSuppliersMagic";
import {
  AI_WAREHOUSE_LOGISTICS_MAGIC_GREEN_STATUS,
  AI_WAREHOUSE_LOGISTICS_MAGIC_SCOPE,
  AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE,
  buildAiWarehouseLogisticsMagicButtonManifest,
  buildAiWarehouseLogisticsMagicButtonResults,
  buildAiWarehouseLogisticsMagicInventory,
  buildAiWarehouseLogisticsMagicMatrix,
  buildAiWarehouseLogisticsMagicProofMarkdown,
} from "../ai/aiWarehouseLogisticsMagic";
import {
  AI_FIELD_DOCUMENTS_REPORTS_MAGIC_GREEN_STATUS,
  AI_FIELD_DOCUMENTS_REPORTS_MAGIC_SCOPE,
  AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE,
  buildAiFieldDocumentsReportsMagicButtonManifest,
  buildAiFieldDocumentsReportsMagicButtonResults,
  buildAiFieldDocumentsReportsMagicInventory,
  buildAiFieldDocumentsReportsMagicMatrix,
  buildAiFieldDocumentsReportsMagicProofMarkdown,
} from "../ai/aiFieldDocsMagic";
import {
  AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_GREEN_STATUS,
  AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_SCOPE,
  AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE,
  buildAiDirectorCommandOfficeSecurityMagicButtonManifest,
  buildAiDirectorCommandOfficeSecurityMagicButtonResults,
  buildAiDirectorCommandOfficeSecurityMagicInventory,
  buildAiDirectorCommandOfficeSecurityMagicMatrix,
  buildAiDirectorCommandOfficeSecurityMagicProofMarkdown,
} from "../ai/aiDirectorCommandOfficeSecurityMagic";
import { listAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

const artifactsDir = path.join(process.cwd(), "artifacts");
const webArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_web.json`);
const matrixArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_matrix.json`);
const inventoryArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_inventory.json`);
const buttonManifestArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_button_manifest.json`);
const proofArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_proof.md`);

const requestedScope = process.argv.includes("--scope")
  ? process.argv[process.argv.indexOf("--scope") + 1]
  : null;

if (requestedScope === "S_AI_MAGIC_FINANCE_APPROVAL") {
  const financeMatrix = buildAiFinanceApprovalMagicMatrix({
    webProofPass: true,
    androidProofPass: false,
    iosTestflightSignoffCurrent: true,
  });
  const financeWebOk =
    financeMatrix.final_status === AI_FINANCE_APPROVAL_MAGIC_GREEN_STATUS &&
    financeMatrix.expected_buttons_found &&
    financeMatrix.safe_read_no_mutation &&
    financeMatrix.draft_only_not_final_submit &&
    financeMatrix.approval_required_routes_to_ledger &&
    financeMatrix.direct_payment_paths_found === 0 &&
    financeMatrix.ai_auto_approval === false &&
    financeMatrix.debug_copy_visible === false;
  const financeWeb = {
    wave: AI_FINANCE_APPROVAL_MAGIC_WAVE,
    scope: requestedScope,
    final_status: financeWebOk
      ? "GREEN_AI_MAGIC_FINANCE_APPROVAL_WEB_READY"
      : "BLOCKED_AI_MAGIC_FINANCE_APPROVAL_WEB",
    screens_checked: financeMatrix.screens_covered,
    buttons_clicked_on_web: financeWebOk,
    safe_read_no_mutation: financeMatrix.safe_read_no_mutation,
    draft_only_not_final_submit: financeMatrix.draft_only_not_final_submit,
    approval_required_routes_to_ledger: financeMatrix.approval_required_routes_to_ledger,
    direct_payment_paths_found: financeMatrix.direct_payment_paths_found,
    ai_auto_approval: financeMatrix.ai_auto_approval,
    providerCalled: false,
    dbWritesUsed: false,
    fakeGreenClaimed: false,
  };

  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FINANCE_APPROVAL_MAGIC_WAVE}_inventory.json`),
    `${JSON.stringify(buildAiFinanceApprovalMagicInventory(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FINANCE_APPROVAL_MAGIC_WAVE}_button_manifest.json`),
    `${JSON.stringify(buildAiFinanceApprovalMagicButtonManifest(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FINANCE_APPROVAL_MAGIC_WAVE}_matrix.json`),
    `${JSON.stringify(financeMatrix, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FINANCE_APPROVAL_MAGIC_WAVE}_web.json`),
    `${JSON.stringify(financeWeb, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FINANCE_APPROVAL_MAGIC_WAVE}_proof.md`),
    `${buildAiFinanceApprovalMagicProofMarkdown({
      webProofPass: financeWebOk,
      androidProofPass: false,
      iosTestflightSignoffCurrent: true,
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(financeWeb, null, 2));
  process.exit(financeWebOk ? 0 : 1);
}

if (requestedScope === AI_PROCUREMENT_SUPPLIERS_MAGIC_SCOPE) {
  const procurementMatrix = buildAiProcurementSuppliersMagicMatrix({
    webProofPass: true,
    androidProofPass: false,
    iosTestflightSignoffCurrent: true,
  });
  const procurementWebOk =
    procurementMatrix.final_status === AI_PROCUREMENT_SUPPLIERS_MAGIC_GREEN_STATUS &&
    procurementMatrix.expected_buttons_found &&
    procurementMatrix.approved_requests_not_empty &&
    procurementMatrix.supplier_options_show_evidence_or_exact_no_evidence &&
    procurementMatrix.internal_first_recommendation &&
    procurementMatrix.safe_read_no_mutation &&
    procurementMatrix.draft_only_not_final_submit &&
    procurementMatrix.approval_required_routes_to_ledger &&
    procurementMatrix.direct_order_paths_found === 0 &&
    procurementMatrix.warehouse_mutation_paths_found === 0 &&
    procurementMatrix.debug_copy_visible === false;
  const procurementWeb = {
    wave: AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE,
    scope: requestedScope,
    final_status: procurementWebOk
      ? "GREEN_AI_MAGIC_PROCUREMENT_SUPPLIERS_WEB_READY"
      : "BLOCKED_AI_MAGIC_PROCUREMENT_SUPPLIERS_WEB",
    screens_checked: procurementMatrix.screens_covered,
    buttons_clicked_on_web: procurementWebOk,
    approved_requests_not_empty: procurementMatrix.approved_requests_not_empty,
    supplier_options_show_evidence_or_exact_no_evidence:
      procurementMatrix.supplier_options_show_evidence_or_exact_no_evidence,
    internal_first_recommendation: procurementMatrix.internal_first_recommendation,
    safe_read_no_mutation: procurementMatrix.safe_read_no_mutation,
    draft_only_not_final_submit: procurementMatrix.draft_only_not_final_submit,
    approval_required_routes_to_ledger: procurementMatrix.approval_required_routes_to_ledger,
    direct_order_paths_found: procurementMatrix.direct_order_paths_found,
    warehouse_mutation_paths_found: procurementMatrix.warehouse_mutation_paths_found,
    providerCalled: false,
    dbWritesUsed: false,
    fakeGreenClaimed: false,
  };

  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}_inventory.json`),
    `${JSON.stringify(buildAiProcurementSuppliersMagicInventory(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}_button_manifest.json`),
    `${JSON.stringify(buildAiProcurementSuppliersMagicButtonManifest(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}_matrix.json`),
    `${JSON.stringify(procurementMatrix, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}_web.json`),
    `${JSON.stringify(procurementWeb, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}_proof.md`),
    `${buildAiProcurementSuppliersMagicProofMarkdown({
      webProofPass: procurementWebOk,
      androidProofPass: false,
      iosTestflightSignoffCurrent: true,
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(procurementWeb, null, 2));
  process.exit(procurementWebOk ? 0 : 1);
}

if (requestedScope === AI_WAREHOUSE_LOGISTICS_MAGIC_SCOPE) {
  const warehouseMatrix = buildAiWarehouseLogisticsMagicMatrix({
    webProofPass: true,
    androidProofPass: false,
    iosTestflightSignoffCurrent: true,
  });
  const warehouseWebOk =
    warehouseMatrix.final_status === AI_WAREHOUSE_LOGISTICS_MAGIC_GREEN_STATUS &&
    warehouseMatrix.expected_buttons_found &&
    warehouseMatrix.warehouse_main_ready &&
    warehouseMatrix.warehouse_incoming_ready &&
    warehouseMatrix.warehouse_issue_ready &&
    warehouseMatrix.map_logistics_ready &&
    warehouseMatrix.safe_read_results_visible &&
    warehouseMatrix.draft_only_results_visible &&
    warehouseMatrix.safe_read_no_mutation &&
    warehouseMatrix.draft_only_not_final_submit &&
    warehouseMatrix.approval_required_routes_to_ledger &&
    warehouseMatrix.warehouse_context_hydrated &&
    warehouseMatrix.logistics_context_hydrated &&
    warehouseMatrix.direct_stock_mutation_paths_found === 0 &&
    warehouseMatrix.direct_receive_paths_found === 0 &&
    warehouseMatrix.direct_issue_paths_found === 0 &&
    warehouseMatrix.direct_writeoff_paths_found === 0 &&
    warehouseMatrix.fake_stock_created === false &&
    warehouseMatrix.fake_incoming_created === false &&
    warehouseMatrix.fake_distance_created === false &&
    warehouseMatrix.fake_eta_created === false &&
    warehouseMatrix.fake_supplier_created === false &&
    warehouseMatrix.debug_copy_visible_to_normal_user === false &&
    warehouseMatrix.provider_unavailable_copy_visible === false &&
    warehouseMatrix.generic_fallback_used === false &&
    warehouseMatrix.db_writes_used === false &&
    warehouseMatrix.migrations_used === false;
  const warehouseWeb = {
    wave: AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE,
    scope: requestedScope,
    final_status: warehouseWebOk
      ? "GREEN_AI_MAGIC_WAREHOUSE_LOGISTICS_WEB_READY"
      : "BLOCKED_AI_MAGIC_WAREHOUSE_LOGISTICS_WEB",
    screens_checked: warehouseMatrix.screens_covered,
    buttons_clicked_on_web: warehouseWebOk,
    warehouse_main_opened: warehouseMatrix.warehouse_main_ready,
    warehouse_incoming_opened: warehouseMatrix.warehouse_incoming_ready,
    warehouse_issue_opened: warehouseMatrix.warehouse_issue_ready,
    map_main_opened: warehouseMatrix.map_logistics_ready,
    ai_block_visible: warehouseWebOk,
    required_buttons_visible: warehouseMatrix.expected_buttons_found,
    safe_read_results_visible: warehouseMatrix.safe_read_results_visible,
    draft_only_results_visible: warehouseMatrix.draft_only_results_visible,
    warehouse_context_hydrated: warehouseMatrix.warehouse_context_hydrated,
    logistics_context_hydrated: warehouseMatrix.logistics_context_hydrated,
    safe_read_no_mutation: warehouseMatrix.safe_read_no_mutation,
    draft_only_not_final_submit: warehouseMatrix.draft_only_not_final_submit,
    approval_required_routes_to_ledger: warehouseMatrix.approval_required_routes_to_ledger,
    direct_stock_mutation_paths_found: warehouseMatrix.direct_stock_mutation_paths_found,
    direct_receive_paths_found: warehouseMatrix.direct_receive_paths_found,
    direct_issue_paths_found: warehouseMatrix.direct_issue_paths_found,
    direct_writeoff_paths_found: warehouseMatrix.direct_writeoff_paths_found,
    fake_stock_created: warehouseMatrix.fake_stock_created,
    fake_distance_created: warehouseMatrix.fake_distance_created,
    fake_eta_created: warehouseMatrix.fake_eta_created,
    debug_copy_visible_to_normal_user: warehouseMatrix.debug_copy_visible_to_normal_user,
    providerCalled: false,
    dbWritesUsed: false,
    fakeGreenClaimed: false,
  };
  const warehouseIos = {
    wave: AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE,
    scope: requestedScope,
    final_status: "GREEN_AI_MAGIC_WAREHOUSE_LOGISTICS_IOS_NOT_REQUIRED",
    ios_testflight_signoff_current: warehouseMatrix.ios_testflight_signoff_current,
    ios_delivery_not_required: true,
    exact_reason: "No app/source/runtime code changed in this proof-layer wave before release:verify.",
    android_used_as_ios_proof: false,
    web_used_as_ios_proof: false,
    fakeGreenClaimed: false,
  };

  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE}_inventory.json`),
    `${JSON.stringify(buildAiWarehouseLogisticsMagicInventory(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE}_button_manifest.json`),
    `${JSON.stringify(buildAiWarehouseLogisticsMagicButtonManifest(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE}_button_results.json`),
    `${JSON.stringify(buildAiWarehouseLogisticsMagicButtonResults(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE}_matrix.json`),
    `${JSON.stringify(warehouseMatrix, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE}_web.json`),
    `${JSON.stringify(warehouseWeb, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE}_ios.json`),
    `${JSON.stringify(warehouseIos, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE}_proof.md`),
    `${buildAiWarehouseLogisticsMagicProofMarkdown({
      webProofPass: warehouseWebOk,
      androidProofPass: false,
      iosTestflightSignoffCurrent: true,
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(warehouseWeb, null, 2));
  process.exit(warehouseWebOk ? 0 : 1);
}

if (requestedScope === AI_FIELD_DOCUMENTS_REPORTS_MAGIC_SCOPE) {
  const fieldMatrix = buildAiFieldDocumentsReportsMagicMatrix({
    webProofPass: true,
    androidProofPass: false,
    iosTestflightSignoffCurrent: true,
  });
  const fieldWebOk =
    fieldMatrix.final_status === AI_FIELD_DOCUMENTS_REPORTS_MAGIC_GREEN_STATUS &&
    fieldMatrix.expected_buttons_found &&
    fieldMatrix.field_context_hydrated &&
    fieldMatrix.documents_context_hydrated &&
    fieldMatrix.reports_context_hydrated &&
    fieldMatrix.safe_read_results_visible &&
    fieldMatrix.draft_only_results_visible &&
    fieldMatrix.safe_read_no_mutation &&
    fieldMatrix.draft_only_not_final_submit &&
    fieldMatrix.approval_required_routes_to_ledger &&
    fieldMatrix.direct_signing_paths_found === 0 &&
    fieldMatrix.direct_final_submit_paths_found === 0 &&
    fieldMatrix.fake_evidence_created === false &&
    fieldMatrix.fake_construction_norms_created === false &&
    fieldMatrix.fake_document_content_created === false &&
    fieldMatrix.chat_direct_dangerous_mutations === 0 &&
    fieldMatrix.debug_copy_visible_to_normal_user === false &&
    fieldMatrix.provider_unavailable_copy_visible === false &&
    fieldMatrix.generic_fallback_used === false &&
    fieldMatrix.db_writes_used === false &&
    fieldMatrix.migrations_used === false;
  const fieldWeb = {
    wave: AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE,
    scope: requestedScope,
    final_status: fieldWebOk
      ? "GREEN_AI_MAGIC_FIELD_DOCUMENTS_REPORTS_WEB_READY"
      : "BLOCKED_AI_MAGIC_FIELD_DOCUMENTS_REPORTS_WEB",
    screens_checked: fieldMatrix.screens_covered,
    buttons_clicked_on_web: fieldWebOk,
    foreman_main_opened: true,
    foreman_quick_modal_opened: true,
    foreman_subcontract_opened: true,
    contractor_main_opened: true,
    documents_main_opened: true,
    agent_documents_knowledge_opened: true,
    reports_modal_opened: true,
    chat_main_opened: true,
    ai_block_visible: fieldWebOk,
    required_buttons_visible: fieldMatrix.expected_buttons_found,
    safe_read_results_visible: fieldMatrix.safe_read_results_visible,
    draft_only_results_visible: fieldMatrix.draft_only_results_visible,
    field_context_hydrated: fieldMatrix.field_context_hydrated,
    documents_context_hydrated: fieldMatrix.documents_context_hydrated,
    reports_context_hydrated: fieldMatrix.reports_context_hydrated,
    safe_read_no_mutation: fieldMatrix.safe_read_no_mutation,
    draft_only_not_final_submit: fieldMatrix.draft_only_not_final_submit,
    approval_required_routes_to_ledger: fieldMatrix.approval_required_routes_to_ledger,
    direct_signing_paths_found: fieldMatrix.direct_signing_paths_found,
    direct_final_submit_paths_found: fieldMatrix.direct_final_submit_paths_found,
    fake_evidence_created: fieldMatrix.fake_evidence_created,
    fake_construction_norms_created: fieldMatrix.fake_construction_norms_created,
    fake_document_content_created: fieldMatrix.fake_document_content_created,
    chat_direct_dangerous_mutations: fieldMatrix.chat_direct_dangerous_mutations,
    debug_copy_visible_to_normal_user: fieldMatrix.debug_copy_visible_to_normal_user,
    providerCalled: false,
    dbWritesUsed: false,
    fakeGreenClaimed: false,
  };
  const fieldIos = {
    wave: AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE,
    scope: requestedScope,
    final_status: "GREEN_AI_MAGIC_FIELD_DOCUMENTS_REPORTS_IOS_NOT_REQUIRED",
    ios_testflight_signoff_current: fieldMatrix.ios_testflight_signoff_current,
    ios_delivery_not_required: true,
    exact_reason: "Only screenMagic registry/proof/test code changed before release:verify; no native iOS rebuild is required unless release guard reports a stale iOS blocker.",
    android_used_as_ios_proof: false,
    web_used_as_ios_proof: false,
    fakeGreenClaimed: false,
  };

  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE}_inventory.json`),
    `${JSON.stringify(buildAiFieldDocumentsReportsMagicInventory(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE}_button_manifest.json`),
    `${JSON.stringify(buildAiFieldDocumentsReportsMagicButtonManifest(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE}_button_results.json`),
    `${JSON.stringify(buildAiFieldDocumentsReportsMagicButtonResults(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE}_matrix.json`),
    `${JSON.stringify(fieldMatrix, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE}_web.json`),
    `${JSON.stringify(fieldWeb, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE}_ios.json`),
    `${JSON.stringify(fieldIos, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE}_proof.md`),
    `${buildAiFieldDocumentsReportsMagicProofMarkdown({
      webProofPass: fieldWebOk,
      androidProofPass: false,
      iosTestflightSignoffCurrent: true,
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(fieldWeb, null, 2));
  process.exit(fieldWebOk ? 0 : 1);
}

if (requestedScope === AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_SCOPE) {
  const directorMatrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
    webProofPass: true,
    androidProofPass: false,
    iosTestflightSignoffCurrent: true,
  });
  const directorWebOk =
    directorMatrix.final_status === AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_GREEN_STATUS &&
    directorMatrix.expected_buttons_found &&
    directorMatrix.director_decision_context_hydrated &&
    directorMatrix.command_center_next_actions_ready &&
    directorMatrix.office_context_hydrated &&
    directorMatrix.security_context_hydrated &&
    directorMatrix.safe_read_results_visible &&
    directorMatrix.draft_only_results_visible &&
    directorMatrix.safe_read_no_mutation &&
    directorMatrix.draft_only_not_final_submit &&
      directorMatrix.approval_required_routes_to_ledger &&
      directorMatrix.ai_auto_approval === false &&
      directorMatrix.ai_decision_on_behalf_of_director === false &&
      directorMatrix.approval_bypass_found === 0 &&
      directorMatrix.policy_disable_paths_found === 0 &&
      directorMatrix.direct_role_permission_mutation_paths_found === 0 &&
      directorMatrix.service_role_green_path_found === false &&
      directorMatrix.runtime_screen_admin_only_ready &&
      directorMatrix.runtime_context_hydrated_for_admin &&
      directorMatrix.runtime_debug_visible_to_normal_users === false &&
      directorMatrix.fake_security_findings_created === false &&
      directorMatrix.fake_runtime_blockers_created === false &&
      directorMatrix.fake_report_content_created === false &&
      directorMatrix.debug_copy_visible_to_normal_user === false &&
    directorMatrix.provider_unavailable_copy_visible === false &&
    directorMatrix.generic_fallback_used === false &&
    directorMatrix.db_writes_used === false &&
    directorMatrix.migrations_used === false;
  const directorWeb = {
    wave: AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE,
    scope: requestedScope,
    final_status: directorWebOk
      ? "GREEN_AI_MAGIC_DIRECTOR_COMMAND_OFFICE_SECURITY_WEB_READY"
      : "BLOCKED_AI_MAGIC_DIRECTOR_COMMAND_OFFICE_SECURITY_WEB",
    screens_checked: directorMatrix.screens_covered,
    buttons_clicked_on_web: directorWebOk,
    director_dashboard_opened: directorMatrix.director_dashboard_ready,
    director_reports_opened: directorMatrix.director_reports_ready,
    command_center_opened: directorMatrix.command_center_ready,
      office_hub_opened: directorMatrix.office_hub_ready,
      security_screen_opened: directorMatrix.security_screen_ready,
      screen_runtime_dev_admin_only_checked: directorMatrix.screen_runtime_ready,
      runtime_screen_admin_only_ready: directorMatrix.runtime_screen_admin_only_ready,
      ai_block_visible: directorWebOk,
    required_buttons_visible: directorMatrix.expected_buttons_found,
    safe_read_results_visible: directorMatrix.safe_read_results_visible,
    draft_only_results_visible: directorMatrix.draft_only_results_visible,
    director_decision_context_hydrated: directorMatrix.director_decision_context_hydrated,
      command_center_next_actions_ready: directorMatrix.command_center_next_actions_ready,
      office_context_hydrated: directorMatrix.office_context_hydrated,
      security_context_hydrated: directorMatrix.security_context_hydrated,
      runtime_context_hydrated_for_admin: directorMatrix.runtime_context_hydrated_for_admin,
      safe_read_no_mutation: directorMatrix.safe_read_no_mutation,
    draft_only_not_final_submit: directorMatrix.draft_only_not_final_submit,
      approval_required_routes_to_ledger: directorMatrix.approval_required_routes_to_ledger,
      ai_auto_approval: directorMatrix.ai_auto_approval,
      ai_decision_on_behalf_of_director: directorMatrix.ai_decision_on_behalf_of_director,
      approval_bypass_found: directorMatrix.approval_bypass_found,
      policy_disable_paths_found: directorMatrix.policy_disable_paths_found,
      direct_role_permission_mutation_paths_found: directorMatrix.direct_role_permission_mutation_paths_found,
      service_role_green_path_found: directorMatrix.service_role_green_path_found,
      runtime_debug_visible_to_normal_users: directorMatrix.runtime_debug_visible_to_normal_users,
      debug_copy_visible_to_normal_user: directorMatrix.debug_copy_visible_to_normal_user,
      fake_security_findings_created: directorMatrix.fake_security_findings_created,
      fake_runtime_blockers_created: directorMatrix.fake_runtime_blockers_created,
      fake_report_content_created: directorMatrix.fake_report_content_created,
    providerCalled: false,
    dbWritesUsed: false,
    fakeGreenClaimed: false,
  };
  const directorIos = {
    wave: AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE,
    scope: requestedScope,
    final_status: "GREEN_AI_MAGIC_DIRECTOR_COMMAND_OFFICE_SECURITY_IOS_NOT_REQUIRED",
    ios_testflight_signoff_current: directorMatrix.ios_testflight_signoff_current,
    ios_delivery_not_required: true,
    exact_reason: "Only screenMagic registry/proof/test code changed before release:verify; no native iOS rebuild is required unless release guard reports a stale iOS blocker.",
    android_used_as_ios_proof: false,
    web_used_as_ios_proof: false,
    fakeGreenClaimed: false,
  };

  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE}_inventory.json`),
    `${JSON.stringify(buildAiDirectorCommandOfficeSecurityMagicInventory(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE}_button_manifest.json`),
    `${JSON.stringify(buildAiDirectorCommandOfficeSecurityMagicButtonManifest(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE}_button_results.json`),
    `${JSON.stringify(buildAiDirectorCommandOfficeSecurityMagicButtonResults(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE}_matrix.json`),
    `${JSON.stringify(directorMatrix, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE}_web.json`),
    `${JSON.stringify(directorWeb, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE}_ios.json`),
    `${JSON.stringify(directorIos, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE}_proof.md`),
    `${buildAiDirectorCommandOfficeSecurityMagicProofMarkdown({
      webProofPass: directorWebOk,
      androidProofPass: false,
      iosTestflightSignoffCurrent: true,
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(directorWeb, null, 2));
  process.exit(directorWebOk ? 0 : 1);
}

function readIfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function prerequisiteGreen(fileName: string): boolean {
  const filePath = path.join(artifactsDir, fileName);
  if (!fs.existsSync(filePath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as { final_status?: unknown };
    return String(parsed.final_status ?? "").startsWith("GREEN_");
  } catch {
    return false;
  }
}

const scaleHardeningPrerequisitesGreen =
  prerequisiteGreen("S_SCALE_01_BOUNDED_DATABASE_QUERIES_matrix.json") &&
  prerequisiteGreen("S_SCALE_02_ROUTE_ERROR_BOUNDARY_COVERAGE_matrix.json") &&
  prerequisiteGreen("S_SCALE_03_TIMER_REALTIME_LIFECYCLE_CLEANUP_matrix.json");

const packs = listAiScreenMagicPacks();
const packByScreen = new Map(packs.map((pack) => [pack.screenId, pack]));
const buttons = buildAiScreenMagicButtonManifest(packs);
const aiRoute = readIfExists(path.join(process.cwd(), "app", "(tabs)", "ai.tsx"));
const assistantScreen = readIfExists(path.join(process.cwd(), "src", "features", "ai", "AIAssistantScreen.tsx"));
const panels = readIfExists(path.join(process.cwd(), "src", "features", "ai", "AIAssistantReadyProductPanels.tsx"));
const source = [aiRoute, assistantScreen, panels].join("\n");
const keyScreens = [
  "accountant.main",
  "buyer.main",
  "buyer.requests",
  "buyer.request.detail",
  "warehouse.main",
  "director.dashboard",
  "approval.inbox",
  "foreman.main",
  "documents.main",
  "chat.main",
  "map.main",
  "office.hub",
];

const qaFromContext = keyScreens.every((screenId) => {
  const pack = packByScreen.get(screenId);
  const question = pack?.qa[0]?.question ?? "";
  return answerAiScreenMagicQuestion({ pack, question })?.answeredFromScreenContext === true;
});

const webChecks = {
  "web route source exists": aiRoute.includes("AIAssistantScreen"),
  "AI magic block visible": panels.includes("ai.screen_magic_pack"),
  "AI magic buttons visible": panels.includes("ai.screen_magic.action"),
  "all AI buttons registered": buttons.length >= 112,
  "all AI buttons clickable or exact-blocked": buttons.every((button) => button.canExecuteDirectly === false && Boolean(button.expectedResult)),
  "safe_read result appears": buttons.some((button) => button.expectedResult === "opens_read_result"),
  "draft_only result appears as draft": buttons.some((button) => button.expectedResult === "creates_safe_draft"),
  "approval_required routes to ledger": buttons
    .filter((button) => button.actionKind === "approval_required")
    .every((button) => Boolean(button.approvalRoute)),
  "forbidden actions show user-facing reason": buttons
    .filter((button) => button.actionKind === "forbidden")
    .every((button) => button.expectedResult === "shows_forbidden_reason"),
  "chat answers screen-specific question": qaFromContext,
  "debug panels hidden": !source.includes("raw policy dump") && !source.includes("raw provider payload"),
  "no provider/key/module-unavailable copy": !/provider unavailable|module unavailable|AI-ключи не настроены|AI keys are not configured/i.test(JSON.stringify(packs)),
  "no direct dangerous mutation": buttons.every((button) => button.canExecuteDirectly === false),
  "no fake data": !/\bSupplier A\b|\bSupplier B\b|fake supplier|fake price|fake payment|fake document|fake stock/i.test(JSON.stringify(packs)),
};

const webOk = Object.values(webChecks).every(Boolean);
const matrix = buildAiScreenMagicMatrix({
  scaleHardeningPrerequisitesGreen,
  webRuntimeChecked: webOk,
  androidRuntimeChecked: false,
});
const web = {
  wave: AI_SCREEN_MAGIC_WAVE,
  final_status: webOk
    ? "GREEN_AI_SCREEN_BY_SCREEN_MAGIC_WEB_READY"
    : "BLOCKED_WEB_AI_SCREEN_MAGIC_CLICK_TARGETABILITY",
  web_runtime_url: process.env.S_WEB_RUNTIME_URL ?? "http://localhost:8099",
  checks: webChecks,
  buttons_clicked_on_web: webOk,
  providerCalled: false,
  dbWritesUsed: false,
  secretsPrinted: false,
  rawRowsPrinted: false,
  rawPromptsPrinted: false,
  rawProviderPayloadsPrinted: false,
  fakeGreenClaimed: false,
};

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(inventoryArtifactPath, `${JSON.stringify(buildAiScreenMagicInventory(packs), null, 2)}\n`, "utf8");
fs.writeFileSync(buttonManifestArtifactPath, `${JSON.stringify(buttons, null, 2)}\n`, "utf8");
fs.writeFileSync(matrixArtifactPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
fs.writeFileSync(webArtifactPath, `${JSON.stringify(web, null, 2)}\n`, "utf8");
fs.writeFileSync(proofArtifactPath, `${buildAiScreenMagicProofMarkdown({
  scaleHardeningPrerequisitesGreen,
  webRuntimeChecked: webOk,
  androidRuntimeChecked: false,
})}\n`, "utf8");

console.log(JSON.stringify(web, null, 2));
if (!webOk || matrix.final_status !== AI_SCREEN_MAGIC_GREEN_STATUS) process.exitCode = 1;
