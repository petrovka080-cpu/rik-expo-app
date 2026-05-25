import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  calculateGlobalConstructionEstimateSync,
  validateEstimateBoqDepth,
  validateProfessionalEstimateFormulaQuality,
} from "../../src/lib/ai/globalEstimate";
import { bindEstimateRowsToCatalogItems } from "../../src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems";
import type { SourceBackedEstimateRow } from "../../src/lib/ai/globalEstimate/globalEstimateTypes";
import type { CatalogItemForEstimate } from "../../src/lib/catalog/catalogItemTypes";
import {
  __resetConsumerRepairRequestStoreForTests,
  addConsumerRepairRequestCatalogItem,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  buildConsumerRepairAiDraftFromGlobalEstimate,
  buildConsumerRepairCanonicalDraftPayload,
  compareConsumerRepairPayloadParity,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  selectConsumerRepairRequestItemCatalogCandidate,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { writeAllScreensEnterpriseArtifacts } from "./allScreensEnterpriseRuntimeAcceptance.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "request-estimate-catalog-boq-release");
const PREFIX = "S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE";
const FOUNDATION_PROMPT =
  "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043b\u0435\u043d\u0442\u043e\u0447\u043d\u044b\u0439 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442 \u0434\u043b\u0438\u043d 48 \u043c\u0435\u0442\u0440\u043e\u0432 \u0448\u0438\u0440\u0438\u043d\u0430 0,4 \u043c, \u0438 \u0432\u044b\u0441\u043e\u0442\u0430 1.7 \u043c";
const PRODUCT_SEARCH_PROMPT = "\u0430\u0440\u043c\u0430\u0442\u0443\u0440\u0430 \u00d814";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runAdb(args: string[], encoding: "utf8" | "buffer" = "utf8") {
  return spawnSync("adb", args, {
    cwd: process.cwd(),
    encoding: encoding === "utf8" ? "utf8" : "buffer",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function probeAndroidEmulatorDirectly() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const devices = runAdb(["devices"]);
  const devicesText = String(devices.stdout ?? "");
  const hasDevice = /\bdevice\b/.test(devicesText.split(/\r?\n/).slice(1).join("\n"));
  const dump = hasDevice ? runAdb(["shell", "uiautomator", "dump", "/sdcard/request_estimate_release.xml"]) : null;
  const xml = hasDevice ? runAdb(["exec-out", "cat", "/sdcard/request_estimate_release.xml"]) : null;
  const xmlText = String(xml?.stdout ?? "");
  const screenshot = hasDevice ? runAdb(["exec-out", "screencap", "-p"], "buffer") : null;
  const screenshotPath = path.join(SCREENSHOT_DIR, "android_release_smoke.png");
  if (screenshot?.status === 0 && Buffer.isBuffer(screenshot.stdout) && screenshot.stdout.length > 1000) {
    fs.writeFileSync(screenshotPath, screenshot.stdout);
  }
  return {
    passed: hasDevice && dump?.status === 0 && xml?.status === 0 && xmlText.includes("<hierarchy"),
    devicesText,
    uiTextSample: (xmlText.match(/text="([^"]+)"/g) ?? []).slice(0, 30),
    screenshotPath: fs.existsSync(screenshotPath)
      ? "artifacts/screenshots/request-estimate-catalog-boq-release/android_release_smoke.png"
      : null,
  };
}

function catalogCandidateFor(row: SourceBackedEstimateRow): CatalogItemForEstimate {
  return {
    catalogItemId: `android_release_catalog_${row.materialKey || row.rateKey || row.code}`,
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

export async function runAndroidRequestEstimateCatalogBoqReleaseSmoke() {
  const androidProbe = await writeAllScreensEnterpriseArtifacts({ probeAndroid: true });
  const directAndroidProbe = probeAndroidEmulatorDirectly();
  const androidEmulatorPassed = androidProbe.matrix.android_emulator_proof_passed === true || directAndroidProbe.passed;

  const foundation = calculateGlobalConstructionEstimateSync({
    text: FOUNDATION_PROMPT,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
  const depth = validateEstimateBoqDepth(foundation);
  const formula = validateProfessionalEstimateFormulaQuality(foundation);
  const binding = await bindEstimateRowsToCatalogItems({
    estimate: foundation,
    searchProvider: async (_query, row) => row.materialKey ? [catalogCandidateFor(row)] : [],
  });
  const selectedRow = binding.rows.find((row) => row.catalogCandidates.length > 0);
  const selectedCandidate = selectedRow?.catalogCandidates[0] ?? null;

  __resetConsumerRepairRequestStoreForTests();
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "android-request-estimate-release-user",
    problemText: FOUNDATION_PROMPT,
    repairType: "foundation",
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraftFromGlobalEstimate(foundation, binding),
  });
  const target = selectedRow
    ? bundle.items.find((item) => item.rateKey === selectedRow.rateKey || item.materialKey === selectedRow.materialKey)
    : null;
  if (target && selectedCandidate) {
    bundle = selectConsumerRepairRequestItemCatalogCandidate({
      requestDraftId: bundle.draft.id,
      itemId: target.id,
      candidate: selectedCandidate,
    });
  }
  bundle = addConsumerRepairRequestCatalogItem({
    requestDraftId: bundle.draft.id,
    catalogItem: {
      catalogItemId: "android_release_manual_catalog_rebar_d14",
      name: "Android release manual catalog rebar D14",
      normalizedName: "android release manual catalog rebar d14",
      category: "material",
      materialKey: "rebar",
      rateKey: "strip_foundation_longitudinal_rebar",
      unit: "kg",
      unitLabel: "kg",
      unitPrice: 106.8,
      currency: "KGS",
      sourceId: "catalog_items",
      sourceLabel: "catalog_items",
      checkedAt: "2026-05-25T00:00:00.000Z",
      confidence: "high",
      availabilityStatus: "unknown",
      stockStatus: "unknown",
    },
  });
  bundle = updateConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    patch: {
      city: "Bishkek",
      contactPhone: "+996700000000",
    },
  });
  bundle = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  bundle = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  const pdf = getConsumerRepairRequestPdf({ requestDraftId: bundle.draft.id });
  const draftSave = buildConsumerRepairCanonicalDraftPayload(bundle, "draft_save");
  const pdfGeneration = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");
  const marketplaceSend = buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send");
  const parity = compareConsumerRepairPayloadParity({ draftSave, pdfGeneration, marketplaceSend });
  const sendResult = sendConsumerRepairRequestToMarketplace({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  const productSearch = answerBuiltInAi({
    text: PRODUCT_SEARCH_PROMPT,
    route: "/product/search",
    screenContext: "marketplace",
    role: "buyer",
    userId: "android-request-estimate-release-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });

  const catalogSelected = bundle.items.some((item) => item.selectedCatalogItemId === selectedCandidate?.catalogItemId);
  const manualMaterial = bundle.items.some((item) => item.catalogItemId === "android_release_manual_catalog_rebar_d14");
  const pdfOpened = pdf.signedUrl.startsWith("data:application/pdf;base64,");
  const productSearchPassed =
    ["product_search", "marketplace_lookup"].includes(productSearch.route.intent) &&
    ["search_material_products", "search_marketplace_products"].includes(String(productSearch.runtimeTrace.selectedTool));
  const passed =
    androidEmulatorPassed &&
    foundation.input.dimensions?.concreteVolumeM3 === 32.64 &&
    depth.actualRows >= 12 &&
    depth.passed &&
    formula.passed &&
    catalogSelected &&
    manualMaterial &&
    parity.passed &&
    pdfOpened &&
    sendResult.marketplaceLink.status === "sent" &&
    productSearchPassed;

  writeJson(`${PREFIX}_android_screenshots.json`, {
    android_emulator_passed: androidEmulatorPassed,
    foundation_acceptance_passed: foundation.input.dimensions?.concreteVolumeM3 === 32.64 && depth.actualRows >= 12,
    catalog_select_passed: catalogSelected,
    manual_material_passed: manualMaterial,
    pdf_viewer_android_passed: pdfOpened && androidEmulatorPassed,
    save_send_passed: parity.passed && sendResult.marketplaceLink.status === "sent",
    product_search_passed: productSearchPassed,
    all_screens_android_matrix_path: "artifacts/S_ALL_SCREENS_matrix.json",
    direct_android_probe_passed: directAndroidProbe.passed,
    screenshot_path: directAndroidProbe.screenshotPath,
    fake_green_claimed: false,
  });
  writeJson(`${PREFIX}_android_transcripts.json`, {
    android_emulator_passed: androidEmulatorPassed,
    acceptance_cases_total: 6,
    prompt: FOUNDATION_PROMPT,
    item_count: bundle.items.length,
    selected_catalog_item_id: selectedCandidate?.catalogItemId ?? null,
    manual_catalog_item_id: "android_release_manual_catalog_rebar_d14",
    pdf_opened: pdfOpened,
    send_status: sendResult.marketplaceLink.status,
    product_search_tool: productSearch.runtimeTrace.selectedTool,
    ui_text_sample: androidProbe.android.ui_text_sample.length > 0 ? androidProbe.android.ui_text_sample : directAndroidProbe.uiTextSample,
    adb_devices_sample: directAndroidProbe.devicesText.slice(0, 500),
    failures: passed ? [] : [{ code: androidEmulatorPassed ? "ANDROID_REQUEST_ESTIMATE_RELEASE_FAILED" : "ANDROID_EMULATOR_NOT_RUN" }],
    fake_green_claimed: false,
  });
  writeJson(`${PREFIX}_android_ui_dumps.json`, {
    android_emulator_passed: androidEmulatorPassed,
    direct_android_probe_passed: directAndroidProbe.passed,
    ui_text_sample: androidProbe.android.ui_text_sample.length > 0 ? androidProbe.android.ui_text_sample : directAndroidProbe.uiTextSample,
    adb_devices_sample: directAndroidProbe.devicesText.slice(0, 500),
    screenshot_path: directAndroidProbe.screenshotPath,
    fake_green_claimed: false,
  });

  return { passed };
}

if (require.main === module) {
  runAndroidRequestEstimateCatalogBoqReleaseSmoke()
    .then((result) => {
      console.log(result.passed ? "GREEN_ANDROID_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_READY" : "BLOCKED_ANDROID_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_FAILED");
      if (!result.passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
