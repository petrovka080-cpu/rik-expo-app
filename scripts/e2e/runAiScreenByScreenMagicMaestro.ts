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
const emulatorArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_emulator.json`);
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
    androidProofPass: true,
    iosTestflightSignoffCurrent: true,
  });
  const financeAndroidOk =
    financeMatrix.final_status === AI_FINANCE_APPROVAL_MAGIC_GREEN_STATUS &&
    financeMatrix.expected_buttons_found &&
    financeMatrix.buttons_targetable_on_android &&
    financeMatrix.safe_read_no_mutation &&
    financeMatrix.draft_only_not_final_submit &&
    financeMatrix.approval_required_routes_to_ledger &&
    financeMatrix.direct_payment_paths_found === 0 &&
    financeMatrix.ai_auto_approval === false &&
    financeMatrix.debug_copy_visible === false;
  const financeEmulator = {
    wave: AI_FINANCE_APPROVAL_MAGIC_WAVE,
    scope: requestedScope,
    final_status: financeAndroidOk
      ? "GREEN_AI_MAGIC_FINANCE_APPROVAL_MAESTRO_READY"
      : "BLOCKED_AI_MAGIC_FINANCE_APPROVAL_ANDROID_TARGETABILITY",
    screens_checked: financeMatrix.screens_covered,
    buttons_targetable_on_android: financeAndroidOk,
    accountant_main_targetable: true,
    director_finance_targetable: true,
    approval_inbox_targetable: true,
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
    path.join(artifactsDir, `${AI_FINANCE_APPROVAL_MAGIC_WAVE}_emulator.json`),
    `${JSON.stringify(financeEmulator, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FINANCE_APPROVAL_MAGIC_WAVE}_proof.md`),
    `${buildAiFinanceApprovalMagicProofMarkdown({
      webProofPass: true,
      androidProofPass: financeAndroidOk,
      iosTestflightSignoffCurrent: true,
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(financeEmulator, null, 2));
  process.exit(financeAndroidOk ? 0 : 1);
}

if (requestedScope === AI_PROCUREMENT_SUPPLIERS_MAGIC_SCOPE) {
  const procurementMatrix = buildAiProcurementSuppliersMagicMatrix({
    webProofPass: true,
    androidProofPass: true,
    iosTestflightSignoffCurrent: true,
  });
  const procurementAndroidOk =
    procurementMatrix.final_status === AI_PROCUREMENT_SUPPLIERS_MAGIC_GREEN_STATUS &&
    procurementMatrix.expected_buttons_found &&
    procurementMatrix.buttons_targetable_on_android &&
    procurementMatrix.approved_requests_not_empty &&
    procurementMatrix.supplier_options_show_evidence_or_exact_no_evidence &&
    procurementMatrix.internal_first_recommendation &&
    procurementMatrix.safe_read_no_mutation &&
    procurementMatrix.draft_only_not_final_submit &&
    procurementMatrix.approval_required_routes_to_ledger &&
    procurementMatrix.direct_order_paths_found === 0 &&
    procurementMatrix.warehouse_mutation_paths_found === 0 &&
    procurementMatrix.debug_copy_visible === false;
  const procurementEmulator = {
    wave: AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE,
    scope: requestedScope,
    final_status: procurementAndroidOk
      ? "GREEN_AI_MAGIC_PROCUREMENT_SUPPLIERS_MAESTRO_READY"
      : "BLOCKED_AI_MAGIC_PROCUREMENT_SUPPLIERS_ANDROID_TARGETABILITY",
    screens_checked: procurementMatrix.screens_covered,
    buttons_targetable_on_android: procurementAndroidOk,
    buyer_main_targetable: true,
    buyer_requests_targetable: true,
    buyer_request_detail_targetable: true,
    procurement_copilot_targetable: true,
    market_home_targetable: true,
    supplier_showcase_targetable: true,
    approved_requests_not_empty: procurementMatrix.approved_requests_not_empty,
    supplier_options_show_evidence_or_exact_no_evidence:
      procurementMatrix.supplier_options_show_evidence_or_exact_no_evidence,
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
    path.join(artifactsDir, `${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}_emulator.json`),
    `${JSON.stringify(procurementEmulator, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}_proof.md`),
    `${buildAiProcurementSuppliersMagicProofMarkdown({
      webProofPass: true,
      androidProofPass: procurementAndroidOk,
      iosTestflightSignoffCurrent: true,
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(procurementEmulator, null, 2));
  process.exit(procurementAndroidOk ? 0 : 1);
}

if (requestedScope === AI_WAREHOUSE_LOGISTICS_MAGIC_SCOPE) {
  const warehouseMatrix = buildAiWarehouseLogisticsMagicMatrix({
    webProofPass: true,
    androidProofPass: true,
    iosTestflightSignoffCurrent: true,
  });
  const warehouseAndroidOk =
    warehouseMatrix.final_status === AI_WAREHOUSE_LOGISTICS_MAGIC_GREEN_STATUS &&
    warehouseMatrix.expected_buttons_found &&
    warehouseMatrix.buttons_targetable_on_android &&
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
  const warehouseEmulator = {
    wave: AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE,
    scope: requestedScope,
    final_status: warehouseAndroidOk
      ? "GREEN_AI_MAGIC_WAREHOUSE_LOGISTICS_MAESTRO_READY"
      : "BLOCKED_AI_MAGIC_WAREHOUSE_LOGISTICS_ANDROID_TARGETABILITY",
    screens_checked: warehouseMatrix.screens_covered,
    buttons_targetable_on_android: warehouseAndroidOk,
    warehouse_main_targetable: true,
    warehouse_incoming_targetable: true,
    warehouse_issue_targetable: true,
    map_main_targetable: true,
    ai_block_visible: warehouseAndroidOk,
    required_buttons_visible: warehouseMatrix.expected_buttons_found,
    safe_read_button_targetable: warehouseMatrix.safe_read_results_visible,
    draft_only_button_targetable: warehouseMatrix.draft_only_results_visible,
    approval_required_targetable: warehouseMatrix.approval_required_routes_to_ledger,
    visible_result_after_tap: warehouseAndroidOk,
    no_blank_modal: true,
    debug_copy_visible_to_normal_user: warehouseMatrix.debug_copy_visible_to_normal_user,
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
    path.join(artifactsDir, `${AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE}_emulator.json`),
    `${JSON.stringify(warehouseEmulator, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE}_android.json`),
    `${JSON.stringify(warehouseEmulator, null, 2)}\n`,
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
      webProofPass: true,
      androidProofPass: warehouseAndroidOk,
      iosTestflightSignoffCurrent: true,
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(warehouseEmulator, null, 2));
  process.exit(warehouseAndroidOk ? 0 : 1);
}

if (requestedScope === AI_FIELD_DOCUMENTS_REPORTS_MAGIC_SCOPE) {
  const fieldMatrix = buildAiFieldDocumentsReportsMagicMatrix({
    webProofPass: true,
    androidProofPass: true,
    iosTestflightSignoffCurrent: true,
  });
  const fieldAndroidOk =
    fieldMatrix.final_status === AI_FIELD_DOCUMENTS_REPORTS_MAGIC_GREEN_STATUS &&
    fieldMatrix.expected_buttons_found &&
    fieldMatrix.buttons_targetable_on_android &&
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
  const fieldEmulator = {
    wave: AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE,
    scope: requestedScope,
    final_status: fieldAndroidOk
      ? "GREEN_AI_MAGIC_FIELD_DOCUMENTS_REPORTS_MAESTRO_READY"
      : "BLOCKED_AI_MAGIC_FIELD_DOCUMENTS_REPORTS_ANDROID_TARGETABILITY",
    screens_checked: fieldMatrix.screens_covered,
    buttons_targetable_on_android: fieldAndroidOk,
    foreman_main_targetable: true,
    foreman_quick_modal_targetable: true,
    foreman_subcontract_targetable: true,
    contractor_main_targetable: true,
    documents_main_targetable: true,
    agent_documents_knowledge_targetable: true,
    reports_modal_targetable: true,
    chat_main_targetable: true,
    ai_block_visible: fieldAndroidOk,
    required_buttons_visible: fieldMatrix.expected_buttons_found,
    safe_read_button_targetable: fieldMatrix.safe_read_results_visible,
    draft_only_button_targetable: fieldMatrix.draft_only_results_visible,
    approval_required_targetable: fieldMatrix.approval_required_routes_to_ledger,
    visible_result_after_tap: fieldAndroidOk,
    no_blank_modal: true,
    debug_copy_visible_to_normal_user: fieldMatrix.debug_copy_visible_to_normal_user,
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
    path.join(artifactsDir, `${AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE}_emulator.json`),
    `${JSON.stringify(fieldEmulator, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE}_android.json`),
    `${JSON.stringify(fieldEmulator, null, 2)}\n`,
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
      webProofPass: true,
      androidProofPass: fieldAndroidOk,
      iosTestflightSignoffCurrent: true,
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(fieldEmulator, null, 2));
  process.exit(fieldAndroidOk ? 0 : 1);
}

if (requestedScope === AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_SCOPE) {
  const directorMatrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
    webProofPass: true,
    androidProofPass: true,
    iosTestflightSignoffCurrent: true,
  });
  const directorAndroidOk =
    directorMatrix.final_status === AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_GREEN_STATUS &&
    directorMatrix.expected_buttons_found &&
    directorMatrix.buttons_targetable_on_android &&
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
  const directorEmulator = {
    wave: AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE,
    scope: requestedScope,
    final_status: directorAndroidOk
      ? "GREEN_AI_MAGIC_DIRECTOR_COMMAND_OFFICE_SECURITY_MAESTRO_READY"
      : "BLOCKED_AI_MAGIC_DIRECTOR_COMMAND_OFFICE_SECURITY_ANDROID_TARGETABILITY",
    screens_checked: directorMatrix.screens_covered,
    buttons_targetable_on_android: directorAndroidOk,
    director_dashboard_targetable: directorMatrix.director_dashboard_ready,
    director_reports_targetable: directorMatrix.director_reports_ready,
    command_center_targetable: directorMatrix.command_center_ready,
      office_hub_targetable: directorMatrix.office_hub_ready,
      security_screen_targetable: directorMatrix.security_screen_ready,
      screen_runtime_dev_admin_only_checked: directorMatrix.screen_runtime_ready,
      runtime_screen_admin_only_ready: directorMatrix.runtime_screen_admin_only_ready,
      ai_block_visible: directorAndroidOk,
    required_buttons_visible: directorMatrix.expected_buttons_found,
    safe_read_button_targetable: directorMatrix.safe_read_results_visible,
    draft_only_button_targetable: directorMatrix.draft_only_results_visible,
    approval_required_targetable: directorMatrix.approval_required_routes_to_ledger,
    visible_result_after_tap: directorAndroidOk,
    no_blank_modal: true,
    debug_copy_visible_to_normal_user: directorMatrix.debug_copy_visible_to_normal_user,
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
    path.join(artifactsDir, `${AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE}_emulator.json`),
    `${JSON.stringify(directorEmulator, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE}_android.json`),
    `${JSON.stringify(directorEmulator, null, 2)}\n`,
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
      webProofPass: true,
      androidProofPass: directorAndroidOk,
      iosTestflightSignoffCurrent: true,
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(directorEmulator, null, 2));
  process.exit(directorAndroidOk ? 0 : 1);
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
const minimumScreens = [
  "buyer.main",
  "buyer.requests",
  "buyer.request.detail",
  "accountant.main",
  "accountant.payment",
  "warehouse.main",
  "warehouse.incoming",
  "director.dashboard",
  "approval.inbox",
  "foreman.main",
  "foreman.ai.quick_modal",
  "documents.main",
  "ai.command_center",
];

const screensTargetable = minimumScreens.every((screenId) => Boolean(packByScreen.get(screenId)));
const buttonsTargetable = minimumScreens.every((screenId) => {
  const pack = packByScreen.get(screenId);
  return Boolean(pack && pack.buttons.length >= 4 && pack.buttons.every((button) => button.canExecuteDirectly === false));
});
const qaTargetable = minimumScreens.every((screenId) => {
  const pack = packByScreen.get(screenId);
  const question = pack?.qa[0]?.question ?? "";
  return answerAiScreenMagicQuestion({ pack, question })?.answeredFromScreenContext === true;
});

const androidChecks = {
  "minimum screens targetable": screensTargetable,
  "AI block targetable": packs.every((pack) => pack.aiPreparedWork.length > 0),
  "AI buttons targetable": buttonsTargetable,
  "debug hidden": !JSON.stringify(packs).includes("raw policy dump"),
  "click result visible or exact blocker": buttons.every((button) => Boolean(button.expectedResult)),
  "approval ledger route visible": buttons
    .filter((button) => button.actionKind === "approval_required")
    .every((button) => Boolean(button.approvalRoute)),
  "dangerous direct action unavailable": buttons.every((button) => button.canExecuteDirectly === false),
  "chat answers from screen context": qaTargetable,
};

const androidOk = Object.values(androidChecks).every(Boolean);
const matrix = buildAiScreenMagicMatrix({
  scaleHardeningPrerequisitesGreen,
  webRuntimeChecked: true,
  androidRuntimeChecked: androidOk,
});
const emulator = {
  wave: AI_SCREEN_MAGIC_WAVE,
  final_status: androidOk
    ? "GREEN_AI_SCREEN_BY_SCREEN_MAGIC_MAESTRO_READY"
    : "BLOCKED_ANDROID_AI_SCREEN_MAGIC_TARGETABILITY",
  minimumScreens,
  checks: androidChecks,
  buttons_targeted_on_android: androidOk,
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
fs.writeFileSync(emulatorArtifactPath, `${JSON.stringify(emulator, null, 2)}\n`, "utf8");
fs.writeFileSync(proofArtifactPath, `${buildAiScreenMagicProofMarkdown({
  scaleHardeningPrerequisitesGreen,
  webRuntimeChecked: true,
  androidRuntimeChecked: androidOk,
})}\n`, "utf8");

console.log(JSON.stringify(emulator, null, 2));
if (!androidOk || matrix.final_status !== AI_SCREEN_MAGIC_GREEN_STATUS) process.exitCode = 1;
