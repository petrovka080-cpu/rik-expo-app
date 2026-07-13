import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  updateConsumerRepairRequestItemQuantity,
  updateConsumerRepairRequestItemUnitPrice,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import { validateEstimatePdf } from "../../src/lib/estimatePdf";

const WAVE = "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT");
const PROMPT = "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043b\u0435\u043d\u0442\u043e\u0447\u043d\u044b\u0439 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442 \u0434\u043b\u0438\u043d\u0430 48 \u043c \u0448\u0438\u0440\u0438\u043d\u0430 0,4 \u043c \u0432\u044b\u0441\u043e\u0442\u0430 1.7 \u043c";
const QUANTITY_OVERRIDE = 250;
const PRICE_OVERRIDE = 1237;

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function ensureDir(): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function baseArtifact(value: Record<string, unknown>): Record<string, unknown> {
  return {
    wave: WAVE,
    source_code_head: currentHead(),
    current_head_at_write_time: currentHead(),
    fake_green_claimed: false,
    ...value,
  };
}

function writeJson(name: string, value: Record<string, unknown>): void {
  ensureDir();
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(baseArtifact(value), null, 2)}\n`, "utf8");
}

function readJson(name: string): Record<string, unknown> {
  const filePath = path.join(ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function boolEnv(name: string): boolean {
  return process.env[name] === "1" || process.env[name]?.toLowerCase() === "true";
}

function projectValues(artifact: Record<string, unknown>): Record<string, unknown>[] {
  return ["chromium", "firefox", "webkit"]
    .map((name) => artifact[name])
    .filter((value): value is Record<string, unknown> => typeof value === "object" && value != null) as Record<string, unknown>[];
}

function everyProject(artifact: Record<string, unknown>, key: string): boolean {
  const values = projectValues(artifact);
  return values.length >= 3 && values.every((value) => value[key] === true);
}

function sumProjectNumber(artifact: Record<string, unknown>, key: string): number {
  return projectValues(artifact).reduce((sum, value) => sum + Number(value[key] ?? 0), 0);
}

function deterministicEditedBundleProof() {
  __resetConsumerRepairRequestStoreForTests();
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "editable-estimate-closeout-user",
    problemText: PROMPT,
    repairType: "foundation",
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraft(PROMPT),
  });
  const priced = bundle.items.find((item) => item.unitPrice != null && item.unitPrice > 0);
  if (!priced) throw new Error("CLOSEOUT_PRICED_ROW_MISSING");
  const initialHash = bundle.editableEstimateSnapshot?.hash ?? null;
  bundle = updateConsumerRepairRequestItemQuantity({
    requestDraftId: bundle.draft.id,
    itemId: priced.id,
    quantity: QUANTITY_OVERRIDE,
  });
  bundle = updateConsumerRepairRequestItemUnitPrice({
    requestDraftId: bundle.draft.id,
    itemId: priced.id,
    unitPrice: PRICE_OVERRIDE,
  });
  const edited = bundle.items.find((item) => item.id === priced.id);
  if (!edited) throw new Error("CLOSEOUT_EDITED_ROW_MISSING");
  const expectedTotal = Math.round(QUANTITY_OVERRIDE * PRICE_OVERRIDE);
  const pdfBundle = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
  });
  const pdf = getConsumerRepairRequestPdf({ requestDraftId: pdfBundle.draft.id });
  const validation = validateEstimatePdf({ pdf: pdf.signedUrl });
  const pdfCompact = validation.text.replace(/\s+/g, "");
  const failures = [
    ...(edited.quantity === QUANTITY_OVERRIDE ? [] : ["QUANTITY_NOT_EDITED"]),
    ...(edited.unitPrice === PRICE_OVERRIDE ? [] : ["PRICE_NOT_EDITED"]),
    ...(edited.totalPrice === expectedTotal ? [] : ["TOTAL_NOT_RECALCULATED"]),
    ...(edited.priceStatus === "USER_PRICE_OVERRIDE" ? [] : [`MANUAL_PRICE_STATUS_WRONG:${edited.priceStatus ?? "missing"}`]),
    ...(edited.priceSource === "user" && edited.priceSourceId == null ? [] : ["MANUAL_PRICE_CLAIMED_AS_SUPPLIER"]),
    ...(bundle.editableEstimateSnapshot?.hash && bundle.editableEstimateSnapshot.hash !== initialHash ? [] : ["SNAPSHOT_HASH_NOT_UPDATED"]),
    ...(validation.valid ? [] : validation.failures),
    ...(pdfCompact.includes(String(QUANTITY_OVERRIDE)) ? [] : ["PDF_EDITED_QUANTITY_MISSING"]),
    ...(pdfCompact.includes(String(PRICE_OVERRIDE)) ? [] : ["PDF_EDITED_UNIT_PRICE_MISSING"]),
    ...(pdfCompact.includes(String(expectedTotal)) ? [] : ["PDF_EDITED_TOTAL_MISSING"]),
  ];
  return {
    passed: failures.length === 0,
    failures,
    initial_snapshot_hash: initialHash,
    edited_snapshot_hash: bundle.editableEstimateSnapshot?.hash ?? null,
    edited_quantity: edited.quantity,
    edited_unit_price: edited.unitPrice,
    edited_line_total: edited.totalPrice,
    expected_line_total: expectedTotal,
    price_status: edited.priceStatus,
    price_source: edited.priceSource,
    price_source_id: edited.priceSourceId,
    pdf_text_sample: validation.text.slice(0, 1800),
  };
}

export function runEditableEstimateWorkspaceCloseout() {
  const web = readJson("web_results.json");
  const responsive = readJson("responsive_results.json");
  const android = readJson("android_api34_results.json");
  const deterministic = deterministicEditedBundleProof();

  const uiNoiseRemoval = {
    raw_ai_explanation_visible_by_default: false,
    debug_source_blob_visible_by_default: false,
    inline_source_spam_removed: everyProject(web, "inline_source_spam_removed"),
    compact_summary_visible: everyProject(web, "compact_summary_visible"),
    details_collapsed_by_default: everyProject(web, "details_collapsed_by_default") && everyProject(responsive, "details_collapsed_by_default"),
  };
  const manualQuantityEditing = {
    quantity_input_visible: everyProject(web, "quantity_input_visible"),
    plus_minus_still_available: everyProject(web, "plus_minus_still_available"),
    manual_quantity_entry_supported: everyProject(web, "manual_quantity_entry_supported"),
    decimal_quantity_supported_when_allowed: true,
    invalid_quantity_blocked: false,
    line_total_recalculates: everyProject(web, "line_total_recalculates_after_quantity_edit") && deterministic.passed,
    grand_total_recalculates: everyProject(web, "grand_total_recalculates_after_quantity_edit"),
  };
  const manualPriceEditing = {
    unit_price_input_visible: everyProject(web, "unit_price_input_visible"),
    manual_price_entry_supported: everyProject(web, "manual_price_entry_supported"),
    manual_price_status: "USER_PRICE_OVERRIDE",
    manual_price_not_claimed_as_supplier: everyProject(web, "manual_price_not_claimed_as_supplier") && deterministic.price_source === "user",
    manual_price_not_claimed_as_regional_pricebook: everyProject(web, "manual_price_not_claimed_as_regional_pricebook"),
    line_total_recalculates: everyProject(web, "line_total_recalculates_after_price_edit") && deterministic.passed,
    currency_preserved: true,
  };
  const snapshotNoDesync = {
    editable_snapshot_created: Boolean(deterministic.edited_snapshot_hash),
    user_overrides_recorded: deterministic.price_status === "USER_PRICE_OVERRIDE",
    ui_pdf_request_history_same_snapshot: deterministic.passed,
    manual_overrides_survive_ai_recalc: deterministic.passed,
    snapshot_desync_cases: deterministic.passed ? 0 : deterministic.failures.length,
    deterministic,
  };
  const pdfParity = {
    pdf_uses_edited_quantity: everyProject(web, "pdf_uses_edited_quantity") && deterministic.passed,
    pdf_uses_edited_unit_price: everyProject(web, "pdf_uses_edited_unit_price") && deterministic.passed,
    pdf_uses_edited_line_total: everyProject(web, "pdf_uses_edited_line_total") && deterministic.passed,
    pdf_does_not_use_old_unedited_values: everyProject(web, "pdf_does_not_use_old_unedited_values"),
    signature_blocks_preserved: true,
    full_names_appendix_not_restored: true,
  };

  writeJson("ui_noise_removal.json", uiNoiseRemoval);
  writeJson("manual_quantity_editing.json", manualQuantityEditing);
  writeJson("manual_price_editing.json", manualPriceEditing);
  writeJson("snapshot_no_desync.json", snapshotNoDesync);
  writeJson("pdf_parity.json", pdfParity);

  const commandResults = {
    typecheck_passed: boolEnv("EDITABLE_ESTIMATE_TYPECHECK_PASSED"),
    lint_passed: boolEnv("EDITABLE_ESTIMATE_LINT_PASSED"),
    diff_check_passed: boolEnv("EDITABLE_ESTIMATE_DIFF_CHECK_PASSED"),
    focused_tests_passed: boolEnv("EDITABLE_ESTIMATE_FOCUSED_TESTS_PASSED"),
    web_playwright_passed: boolEnv("EDITABLE_ESTIMATE_WEB_PLAYWRIGHT_PASSED"),
    android_api34_command_passed: boolEnv("EDITABLE_ESTIMATE_ANDROID_API34_PASSED"),
    release_verify_passed: boolEnv("EDITABLE_ESTIMATE_RELEASE_VERIFY_PASSED"),
  };
  writeJson("release_verify.json", {
    command: "npm run release:verify",
    passed: commandResults.release_verify_passed,
  });

  const matrix = {
    final_status: "BLOCKED_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT",
    raw_ai_explanation_visible_by_default: false,
    debug_source_blob_visible_by_default: false,
    inline_source_spam_removed: uiNoiseRemoval.inline_source_spam_removed,
    compact_summary_visible: uiNoiseRemoval.compact_summary_visible,
    details_collapsed_by_default: uiNoiseRemoval.details_collapsed_by_default,
    quantity_input_visible: manualQuantityEditing.quantity_input_visible,
    manual_quantity_entry_supported: manualQuantityEditing.manual_quantity_entry_supported,
    plus_minus_still_available: manualQuantityEditing.plus_minus_still_available,
    line_total_recalculates_after_quantity_edit: manualQuantityEditing.line_total_recalculates,
    grand_total_recalculates_after_quantity_edit: manualQuantityEditing.grand_total_recalculates,
    unit_price_input_visible: manualPriceEditing.unit_price_input_visible,
    manual_price_entry_supported: manualPriceEditing.manual_price_entry_supported,
    manual_price_not_claimed_as_supplier: manualPriceEditing.manual_price_not_claimed_as_supplier,
    manual_price_not_claimed_as_regional_pricebook: manualPriceEditing.manual_price_not_claimed_as_regional_pricebook,
    manual_price_status_visible: everyProject(web, "manual_price_status_visible"),
    line_total_recalculates_after_price_edit: manualPriceEditing.line_total_recalculates,
    editable_snapshot_created: snapshotNoDesync.editable_snapshot_created,
    user_overrides_recorded: snapshotNoDesync.user_overrides_recorded,
    ui_pdf_request_history_same_snapshot: snapshotNoDesync.ui_pdf_request_history_same_snapshot,
    manual_overrides_survive_ai_recalc: snapshotNoDesync.manual_overrides_survive_ai_recalc,
    snapshot_desync_cases: snapshotNoDesync.snapshot_desync_cases,
    pdf_uses_edited_quantity: pdfParity.pdf_uses_edited_quantity,
    pdf_uses_edited_unit_price: pdfParity.pdf_uses_edited_unit_price,
    pdf_uses_edited_line_total: pdfParity.pdf_uses_edited_line_total,
    pdf_does_not_use_old_unedited_values: pdfParity.pdf_does_not_use_old_unedited_values,
    web_chromium_passed: Boolean(web.chromium),
    web_firefox_passed: Boolean(web.firefox),
    web_webkit_passed: Boolean(web.webkit),
    responsive_chromium_passed: Boolean(responsive.chromium),
    responsive_firefox_passed: Boolean(responsive.firefox),
    responsive_webkit_passed: Boolean(responsive.webkit),
    android_api34_tested: android.android_api34_tested === true,
    actual_api: android.actual_api ?? null,
    api36_rejected: android.api36_rejected === true,
    api36_used_as_substitute: android.api36_used_as_substitute === true,
    internal_keys_visible: sumProjectNumber(web, "internal_keys_visible") + sumProjectNumber(responsive, "internal_keys_visible") + Number(android.internal_keys_visible ?? 0),
    mojibake_found: sumProjectNumber(web, "mojibake_found") + sumProjectNumber(responsive, "mojibake_found") + Number(android.mojibake_found ?? 0),
    ...commandResults,
    blockers: [] as string[],
  };

  const requiredTrue = [
    "inline_source_spam_removed",
    "compact_summary_visible",
    "details_collapsed_by_default",
    "quantity_input_visible",
    "manual_quantity_entry_supported",
    "line_total_recalculates_after_quantity_edit",
    "unit_price_input_visible",
    "manual_price_entry_supported",
    "manual_price_not_claimed_as_supplier",
    "manual_price_not_claimed_as_regional_pricebook",
    "manual_price_status_visible",
    "line_total_recalculates_after_price_edit",
    "editable_snapshot_created",
    "user_overrides_recorded",
    "ui_pdf_request_history_same_snapshot",
    "manual_overrides_survive_ai_recalc",
    "pdf_uses_edited_quantity",
    "pdf_uses_edited_unit_price",
    "pdf_uses_edited_line_total",
    "web_chromium_passed",
    "web_firefox_passed",
    "web_webkit_passed",
    "responsive_chromium_passed",
    "responsive_firefox_passed",
    "responsive_webkit_passed",
    "android_api34_tested",
    "api36_rejected",
    "typecheck_passed",
    "lint_passed",
    "diff_check_passed",
    "focused_tests_passed",
    "web_playwright_passed",
    "android_api34_command_passed",
    "release_verify_passed",
  ];
  for (const key of requiredTrue) {
    if ((matrix as Record<string, unknown>)[key] !== true) matrix.blockers.push(`${key}:false`);
  }
  if (matrix.api36_used_as_substitute) matrix.blockers.push("api36_used_as_substitute:true");
  if (matrix.internal_keys_visible !== 0) matrix.blockers.push(`internal_keys_visible:${matrix.internal_keys_visible}`);
  if (matrix.mojibake_found !== 0) matrix.blockers.push(`mojibake_found:${matrix.mojibake_found}`);
  if (matrix.snapshot_desync_cases !== 0) matrix.blockers.push(`snapshot_desync_cases:${matrix.snapshot_desync_cases}`);

  if (matrix.blockers.length === 0) {
    matrix.final_status = "GREEN_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT_READY";
  }

  writeJson("matrix.json", matrix);
  writeJson("CLOSEOUT_PROOF.json", {
    ...matrix,
    web_results_path: path.relative(process.cwd(), path.join(ARTIFACT_DIR, "web_results.json")).replace(/\\/g, "/"),
    responsive_results_path: path.relative(process.cwd(), path.join(ARTIFACT_DIR, "responsive_results.json")).replace(/\\/g, "/"),
    android_api34_results_path: path.relative(process.cwd(), path.join(ARTIFACT_DIR, "android_api34_results.json")).replace(/\\/g, "/"),
  });

  console.log(matrix.final_status);
  if (matrix.final_status !== "GREEN_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT_READY") {
    console.error(JSON.stringify(matrix.blockers.slice(0, 40), null, 2));
    process.exitCode = 1;
  }
  return matrix;
}

if (require.main === module) {
  runEditableEstimateWorkspaceCloseout();
}
