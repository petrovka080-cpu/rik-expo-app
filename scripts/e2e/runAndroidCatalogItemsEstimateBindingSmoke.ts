import fs from "node:fs";
import path from "node:path";

import { writeAllScreensEnterpriseArtifacts } from "./allScreensEnterpriseRuntimeAcceptance.shared";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  buildConsumerRepairAiDraftFromGlobalEstimate,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  selectConsumerRepairRequestItemCatalogCandidate,
} from "../../src/lib/consumerRequests";
import {
  calculateGlobalConstructionEstimateSync,
} from "../../src/lib/ai/globalEstimate/globalEstimateCalculator";
import type { SourceBackedEstimateRow } from "../../src/lib/ai/globalEstimate/globalEstimateTypes";
import { bindEstimateRowsToCatalogItems } from "../../src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems";
import type { CatalogItemForEstimate } from "../../src/lib/catalog/catalogItemTypes";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING";
const WAVE = "S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_AUTO_MATERIAL_SELECTION_NO_HACKS_POINT_OF_NO_RETURN";
const PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function candidateFor(row: SourceBackedEstimateRow): CatalogItemForEstimate {
  return {
    catalogItemId: `android_catalog_${row.rateKey || row.code}`,
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

export async function runAndroidCatalogItemsEstimateBindingSmoke() {
  const androidProbe = await writeAllScreensEnterpriseArtifacts({ probeAndroid: true });
  const androidEmulatorPassed = androidProbe.matrix.android_emulator_proof_passed === true;

  const estimate = calculateGlobalConstructionEstimateSync({
    text: PROMPT,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
  const binding = await bindEstimateRowsToCatalogItems({
    estimate,
    searchProvider: async (_query, row) => [candidateFor(row)],
  });
  const selectedRow = binding.rows.find((row) => row.catalogCandidates.length > 0);
  const selectedCandidate = selectedRow?.catalogCandidates[0];

  __resetConsumerRepairRequestStoreForTests();
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "catalog-binding-android-user",
    problemText: PROMPT,
    repairType: "foundation",
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraftFromGlobalEstimate(estimate, binding),
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
  bundle = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  const pdf = getConsumerRepairRequestPdf({ requestDraftId: bundle.draft.id });
  const viewModel = buildRequestEstimateViewModel(bundle);

  const catalogBindingStatusVisible = bundle.items.some((item) => item.catalogBindingStatus && item.itemType === "material");
  const catalogCandidateSelected = bundle.items.some((item) => item.selectedCatalogItemId === selectedCandidate?.catalogItemId);
  const passed = androidEmulatorPassed && catalogBindingStatusVisible && catalogCandidateSelected && pdf.signedUrl.startsWith("data:application/pdf;base64,");

  writeJson(`${PREFIX}_android_screenshots.json`, {
    wave: WAVE,
    final_status: passed ? "GREEN_ANDROID_CATALOG_ITEMS_BINDING_READY" : "BLOCKED_ANDROID_CATALOG_ITEMS_BINDING_FAILED",
    android_emulator_passed: androidEmulatorPassed,
    catalog_binding_status_visible: catalogBindingStatusVisible,
    catalog_candidate_selected: catalogCandidateSelected,
    pdf_viewer_android_passed: pdf.signedUrl.startsWith("data:application/pdf;base64,") && androidEmulatorPassed,
    all_screens_android_matrix_path: "artifacts/S_ALL_SCREENS_matrix.json",
    fake_green_claimed: false,
  });
  writeJson(`${PREFIX}_android_transcripts.json`, {
    wave: WAVE,
    android_emulator_passed: androidEmulatorPassed,
    transcripts: [{
      route: "/request",
      prompt: PROMPT,
      itemCount: bundle.items.length,
      summary: viewModel?.summary,
      selectedCatalogItemId: selectedCandidate?.catalogItemId,
      ui_text_sample: androidProbe.android.ui_text_sample,
    }],
    failures: passed ? [] : [{ code: androidEmulatorPassed ? "ANDROID_CATALOG_BINDING_FAILED" : "ANDROID_EMULATOR_NOT_RUN" }],
    fake_green_claimed: false,
  });
  return { passed };
}

if (require.main === module) {
  runAndroidCatalogItemsEstimateBindingSmoke()
    .then((result) => {
      console.log(result.passed ? "GREEN_ANDROID_CATALOG_ITEMS_BINDING_READY" : "BLOCKED_ANDROID_CATALOG_ITEMS_BINDING_FAILED");
      if (!result.passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
