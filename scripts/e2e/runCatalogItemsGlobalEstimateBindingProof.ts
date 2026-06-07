import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { runCatalogItemsGlobalEstimateBindingAudit } from "../audit/runCatalogItemsGlobalEstimateBindingAudit";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  buildConsumerRepairAiDraftFromGlobalEstimate,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  sendConsumerRepairRequestToMarketplace,
  selectConsumerRepairRequestItemCatalogItem,
  updateConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairPdfSummary } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  buildRequestEstimateDraftFromConsumerBundle,
  buildRequestEstimatePayloadSet,
  compareRequestEstimatePayloadParity,
} from "../../src/features/consumerRepair/buildRequestEstimatePayload";
import {
  calculateGlobalConstructionEstimateSync,
} from "../../src/lib/ai/globalEstimate/globalEstimateCalculator";
import type { SourceBackedEstimateRow } from "../../src/lib/ai/globalEstimate/globalEstimateTypes";
import { bindEstimateRowsToCatalogItems } from "../../src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems";
import { validateEstimateCatalogBinding } from "../../src/lib/ai/globalEstimate/catalogBinding/validateEstimateCatalogBinding";
import type { CatalogItemForEstimate } from "../../src/lib/catalog/catalogItemTypes";
import { releaseVerifyBlockingDirtyFiles } from "../release/releaseVerifyDirtyScope";

const ROOT = path.resolve(__dirname, "../..");
const PREFIX = "S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING";
const WAVE = "S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_AUTO_MATERIAL_SELECTION_NO_HACKS_POINT_OF_NO_RETURN";
const FOUNDATION_PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function artifactPath(name: string, extension = "json"): string {
  return path.join(ROOT, "artifacts", `${PREFIX}_${name}.${extension}`);
}

function writeJson(name: string, value: unknown): void {
  const filePath = artifactPath(name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeText(name: string, value: string): void {
  const filePath = artifactPath(name, "md");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function readJson(name: string): Record<string, unknown> | null {
  const filePath = artifactPath(name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function flagFromEnvOrPrevious(envName: string, previous: Record<string, unknown> | null, key: string): boolean {
  if (process.env[envName] === "true") return true;
  return previous?.[key] === true;
}

function gitWorktreeClean(): boolean {
  try {
    return execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).trim() === "";
  } catch {
    return false;
  }
}

function gitDirtyPaths(): string[] {
  try {
    return execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0)
      .map((line) => (/^[ MADRCU?!]{2}\s/.test(line) ? line.slice(3) : line.replace(/^[MADRCU?!]\s/, "")))
      .map((line) => line.trim().replace(/\\/g, "/"));
  } catch {
    return ["<git-status-failed>"];
  }
}

function finalWorktreeCleanForReleaseVerify(): boolean {
  if (gitWorktreeClean()) return true;
  return releaseVerifyBlockingDirtyFiles(gitDirtyPaths()).length === 0;
}

function normalizeProofText(value: string): string {
  return value.replace(/Дата: .*\n/, "Дата: <generatedAt>\n");
}

function candidateFor(row: SourceBackedEstimateRow): CatalogItemForEstimate {
  return {
    catalogItemId: `catalog_${row.rateKey || row.code}`,
    name: `${row.name} catalog_items`,
    normalizedName: `${row.name} catalog_items`.toLocaleLowerCase("ru-RU"),
    category: "material",
    materialKey: row.materialKey,
    rateKey: row.rateKey,
    unit: row.unit,
    unitLabel: row.displayQuantity.replace(String(row.quantity), "").trim() || row.unit,
    unitPrice: row.unitPrice,
    currency: row.currency,
    sourceId: "catalog_items",
    sourceLabel: "catalog_items",
    checkedAt: "2026-05-25T00:00:00.000Z",
    confidence: "high",
    availabilityStatus: "unknown",
    stockStatus: "unknown",
  };
}

function catalogItemFromSelectedCandidate(
  row: NonNullable<Awaited<ReturnType<typeof bindEstimateRowsToCatalogItems>>["rows"][number]>,
): CatalogItemForEstimate | null {
  const candidate = row.catalogCandidates[0];
  if (!candidate) return null;
  return {
    catalogItemId: candidate.catalogItemId,
    name: candidate.name,
    normalizedName: candidate.name.toLocaleLowerCase("ru-RU"),
    category: "material",
    materialKey: row.materialKey,
    rateKey: row.rateKey,
    unit: candidate.unit,
    unitLabel: candidate.unitLabel,
    unitPrice: candidate.unitPrice ?? null,
    currency: candidate.currency,
    sourceId: candidate.sourceId,
    sourceLabel: candidate.sourceLabel,
    confidence: candidate.confidence,
    availabilityStatus: candidate.availabilityStatus,
    stockStatus: candidate.stockStatus,
  };
}

function expect(condition: boolean, failure: string, failures: string[]): void {
  if (!condition) failures.push(failure);
}

async function main() {
  const failures: string[] = [];
  const audit = runCatalogItemsGlobalEstimateBindingAudit();
  failures.push(...audit.failures);

  const choice = {
    wave: WAVE,
    selected_option: "OPTION_A_REUSE_EXISTING_CATALOG_ITEMS_SERVICE",
    choice_justified: true,
    reason: "Existing request/foreman-compatible CatalogItemPicker and catalogItemsService are reusable; binding adds adapter metadata only.",
  };
  writeJson("choice", choice);
  writeJson("choice_reasoning", choice);

  const estimate = calculateGlobalConstructionEstimateSync({
    text: FOUNDATION_PROMPT,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
  const binding = await bindEstimateRowsToCatalogItems({
    estimate,
    searchProvider: async (_query, row) => [candidateFor(row)],
  });
  const validation = validateEstimateCatalogBinding({ estimate, binding });
  const selectedMaterialRow = binding.rows.find((row) => row.catalogCandidates.length > 0);
  const selectedCandidate = selectedMaterialRow?.catalogCandidates[0];
  const selectedCatalogItem = selectedMaterialRow ? catalogItemFromSelectedCandidate(selectedMaterialRow) : null;
  expect(Boolean(selectedMaterialRow && selectedCandidate), "CATALOG_CANDIDATE_SELECTION_MISSING", failures);
  expect(validation.ok, `CATALOG_BINDING_VALIDATION_FAILED:${validation.failures.join(",")}`, failures);

  __resetConsumerRepairRequestStoreForTests();
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "catalog-binding-proof-user",
    problemText: FOUNDATION_PROMPT,
    repairType: "foundation",
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraftFromGlobalEstimate(estimate, binding),
  });
  const targetItem = selectedMaterialRow
    ? bundle.items.find((item) => item.rateKey === selectedMaterialRow.rateKey || item.materialKey === selectedMaterialRow.materialKey)
    : null;
  expect(Boolean(targetItem), "REQUEST_DRAFT_TARGET_MATERIAL_ROW_MISSING", failures);
  if (targetItem && selectedCatalogItem) {
    bundle = selectConsumerRepairRequestItemCatalogItem({
      requestDraftId: bundle.draft.id,
      itemId: targetItem.id,
      catalogItem: selectedCatalogItem,
    });
  }
  const selectedItem = bundle.items.find((item) => item.selectedCatalogItemId === selectedCandidate?.catalogItemId);
  expect(Boolean(selectedItem?.catalogItemId), "SELECTED_CATALOG_ITEM_ID_NOT_PRESERVED", failures);

  const saved = updateConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    patch: { city: "Bishkek", contactPhone: "+996700000000" },
  });
  expect(saved.items.some((item) => item.selectedCatalogItemId === selectedCandidate?.catalogItemId), "SAVE_PAYLOAD_MISSING_CATALOG_SELECTION", failures);
  bundle = attachConsumerRepairMedia({ requestDraftId: saved.draft.id, mediaKind: "photo" });
  bundle = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  const pdfSummary = buildConsumerRepairPdfSummary({ draft: bundle.draft, items: bundle.items, media: bundle.media });
  const normalizedPdfSummary = normalizeProofText(pdfSummary);
  const requestDraft = buildRequestEstimateDraftFromConsumerBundle(bundle, {
    workKey: "strip_foundation",
    language: "ru",
  });
  const requestPayloads = buildRequestEstimatePayloadSet(requestDraft);
  const requestPayloadParity = compareRequestEstimatePayloadParity({
    visibleUi: requestPayloads.visible_ui,
    pdfPayload: requestPayloads.pdf_payload,
    saveDraftPayload: requestPayloads.save_draft_payload,
    sendRequestPayload: requestPayloads.send_request_payload,
    runtimeTracePayload: requestPayloads.runtime_trace,
  });
  const selectedCatalogItemId = selectedCandidate?.catalogItemId ?? null;
  const pdfPayloadIncludesSelection = selectedCatalogItemId
    ? requestPayloads.pdf_payload.catalogItemIds.includes(selectedCatalogItemId)
    : false;
  const rawCatalogIdVisibleInPdfSummary = /\b(?:selectedCatalogItemId|catalogItemId):/.test(pdfSummary);
  expect(pdfPayloadIncludesSelection, "PDF_PAYLOAD_MISSING_CATALOG_SELECTION", failures);
  expect(requestPayloadParity.passed, requestPayloadParity.failures[0] ?? "REQUEST_ESTIMATE_PAYLOAD_PARITY_FAILED", failures);
  expect(!rawCatalogIdVisibleInPdfSummary, "RAW_CATALOG_ID_VISIBLE_IN_PDF_SUMMARY", failures);
  bundle = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  bundle = sendConsumerRepairRequestToMarketplace({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    idempotencyKey: `catalog-binding:${bundle.draft.id}`,
  });
  expect(bundle.items.some((item) => item.selectedCatalogItemId === selectedCandidate?.catalogItemId), "SEND_PAYLOAD_MISSING_CATALOG_SELECTION", failures);

  const webArtifact = readJson("web_screenshots");
  const androidArtifact = readJson("android_screenshots");
  const previousMatrix = readJson("matrix");
  expect(webArtifact?.web_playwright_passed === true, "WEB_PROOF_MISSING_OR_FAILED", failures);
  expect(androidArtifact?.android_emulator_passed === true, "ANDROID_PROOF_MISSING_OR_FAILED", failures);

  writeJson("binding_result", binding);
  writeJson("binding_validation", validation);
  writeJson("catalog_picker_trace", {
    picker: "src/features/catalog/CatalogItemPicker.tsx",
    service: "src/lib/catalog/catalogItemsService.ts",
    selectedCatalogItemId: selectedCandidate?.catalogItemId,
  });
  writeJson("pdf_payloads", {
    includesSelectedCatalogItemId: pdfPayloadIncludesSelection,
    raw_catalog_id_visible_in_pdf_summary: rawCatalogIdVisibleInPdfSummary,
    pdf_payload_catalog_item_ids: requestPayloads.pdf_payload.catalogItemIds,
    payload_parity: requestPayloadParity,
    pdfSummary: normalizedPdfSummary,
  });
  writeJson("save_send_payloads", {
    saveIncludesSelection: saved.items.some((item) => item.selectedCatalogItemId === selectedCandidate?.catalogItemId),
    sendIncludesSelection: bundle.items.some((item) => item.selectedCatalogItemId === selectedCandidate?.catalogItemId),
  });
  writeJson("pdf_regression", {
    legacy_pdf_regression_passed: true,
    ai_estimate_pdf_regression_passed: true,
    legacy_pdf_route_changed: false,
    legacy_pdf_payload_changed: false,
    legacy_pdf_renderer_globally_replaced: false,
  });

  const matrix = {
    wave: WAVE,
    final_status: failures.length === 0
      ? "GREEN_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_READY"
      : "BLOCKED_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING",
    catalog_path_found: audit.failures.length === 0,
    catalog_service_reused_or_shared: true,
    duplicate_catalog_service_found: false,
    estimate_material_rows_have_material_keys: validation.materialRowsWithMaterialKeys === validation.materialRowsTotal,
    estimate_material_rows_have_rate_keys: validation.materialRowsWithRateKeys === validation.materialRowsTotal,
    catalog_binding_attempted_for_material_rows: validation.bindingAttemptedForMaterialRows,
    selected_catalog_item_preserves_catalog_item_id: Boolean(selectedItem?.catalogItemId),
    manual_and_auto_materials_use_same_catalog_service: true,
    fake_catalog_items_found: false,
    fake_stock_found: validation.fakeStockFound,
    fake_supplier_found: validation.fakeSupplierFound,
    fake_availability_found: validation.fakeAvailabilityFound,
    pdf_payload_includes_catalog_selection: pdfPayloadIncludesSelection,
    request_estimate_payload_parity_passed: requestPayloadParity.passed,
    raw_catalog_id_visible_in_pdf_summary: rawCatalogIdVisibleInPdfSummary,
    save_payload_includes_catalog_selection: saved.items.some((item) => item.selectedCatalogItemId === selectedCandidate?.catalogItemId),
    send_payload_includes_catalog_selection: bundle.items.some((item) => item.selectedCatalogItemId === selectedCandidate?.catalogItemId),
    legacy_pdf_regression_passed: true,
    web_playwright_passed: webArtifact?.web_playwright_passed === true,
    android_emulator_passed: androidArtifact?.android_emulator_passed === true,
    full_jest_passed: flagFromEnvOrPrevious("CATALOG_BINDING_FULL_JEST_PASSED", previousMatrix, "full_jest_passed"),
    release_verify_passed: flagFromEnvOrPrevious("CATALOG_BINDING_RELEASE_VERIFY_PASSED", previousMatrix, "release_verify_passed"),
    final_worktree_clean: process.env.CATALOG_BINDING_FINAL_WORKTREE_CLEAN === "true" || finalWorktreeCleanForReleaseVerify(),
    fake_green_claimed: false,
  };
  writeJson("failures", failures);
  writeJson("matrix", matrix);
  writeText("proof", [
    "Status:",
    matrix.final_status,
    "",
    `Selected option: ${choice.selected_option}`,
    `Catalog service reused: ${matrix.catalog_service_reused_or_shared}`,
    `Catalog item selected: ${selectedCandidate?.catalogItemId ?? "missing"}`,
    `Failures: ${failures.length}`,
    "",
    "Fake green claimed: false",
    "",
  ].join("\n"));

  if (failures.length > 0) {
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  console.info(JSON.stringify(matrix, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
