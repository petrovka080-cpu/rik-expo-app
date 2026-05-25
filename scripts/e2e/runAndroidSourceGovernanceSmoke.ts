import fs from "node:fs";
import path from "node:path";

import { writeAllScreensEnterpriseArtifacts } from "./allScreensEnterpriseRuntimeAcceptance.shared";
import {
  __resetConsumerRepairRequestStoreForTests,
  buildConsumerRepairAiDraftFromGlobalEstimate,
  buildConsumerRepairCanonicalDraftPayload,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  selectConsumerRepairRequestItemCatalogCandidate,
  validateConsumerRepairPayloadSourceGovernance,
} from "../../src/lib/consumerRequests";
import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate/globalEstimateCalculator";
import { bindEstimateRowsToCatalogItems } from "../../src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems";
import type { CatalogItemForEstimate } from "../../src/lib/catalog/catalogItemTypes";
import type { SourceBackedEstimateRow } from "../../src/lib/ai/globalEstimate/globalEstimateTypes";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_RATEBOOK_CATALOG_SOURCE_GOVERNANCE";
const WAVE = "S_RATEBOOK_CATALOG_SOURCE_GOVERNANCE_CONFIDENCE_NO_FAKE_AVAILABILITY_POINT_OF_NO_RETURN";
const FOUNDATION_PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function candidateFor(row: SourceBackedEstimateRow): CatalogItemForEstimate {
  return {
    catalogItemId: `android_source_governance_${row.rateKey || row.code}`,
    name: `${row.name} catalog item`,
    normalizedName: `${row.name} catalog item`.toLowerCase(),
    category: "material",
    materialKey: row.materialKey,
    rateKey: row.rateKey,
    unit: row.unit,
    unitLabel: row.displayQuantity.replace(String(row.quantity), "").trim() || row.unit,
    unitPrice: row.unitPrice,
    currency: row.currency,
    sourceId: "catalog_items",
    sourceLabel: "catalog_items",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "high",
    availabilityStatus: "unknown",
    stockStatus: "unknown",
  };
}

export async function runAndroidSourceGovernanceSmoke() {
  const androidProbe = await writeAllScreensEnterpriseArtifacts({ probeAndroid: true });
  const androidEmulatorPassed = androidProbe.matrix.android_emulator_proof_passed === true;

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
  const selectedRow = binding.rows.find((row) => row.catalogCandidates.length > 0);
  const selectedCandidate = selectedRow?.catalogCandidates[0];

  __resetConsumerRepairRequestStoreForTests();
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "source-governance-android-user",
    problemText: FOUNDATION_PROMPT,
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
  bundle = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id });
  const pdf = getConsumerRepairRequestPdf({ requestDraftId: bundle.draft.id });
  const payload = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");
  const sourceGovernance = validateConsumerRepairPayloadSourceGovernance(payload);
  const productSearch = answerBuiltInAi({
    text: "арматура Ø14",
    route: "/product/search",
    screenContext: "marketplace",
    role: "buyer",
    userId: "source-governance-android-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const productCandidates = productSearch.toolResult.productSearch?.candidates ?? [];
  const fakeProductAvailability = productCandidates.some((candidate) =>
    /fake|supplier found|"stockStatus":"in_stock"|"availabilityStatus":"available"/i.test(JSON.stringify(candidate))
  );
  const passed = androidEmulatorPassed
    && sourceGovernance.passed
    && Boolean(selectedCandidate)
    && !fakeProductAvailability
    && pdf.signedUrl.startsWith("data:application/pdf;base64,");

  writeJson(`${PREFIX}_android_screenshots.json`, {
    wave: WAVE,
    final_status: passed ? "GREEN_ANDROID_SOURCE_GOVERNANCE_READY" : "BLOCKED_ANDROID_SOURCE_GOVERNANCE_FAILED",
    android_emulator_passed: androidEmulatorPassed,
    catalog_item_selected: Boolean(selectedCandidate),
    no_fake_availability_displayed: !fakeProductAvailability,
    pdf_viewer_android_passed: pdf.signedUrl.startsWith("data:application/pdf;base64,") && androidEmulatorPassed,
    all_screens_android_matrix_path: "artifacts/S_ALL_SCREENS_matrix.json",
    fake_green_claimed: false,
  });
  writeJson(`${PREFIX}_android_transcripts.json`, {
    wave: WAVE,
    route: "/request",
    product_search_route: "/product/search",
    prompt: FOUNDATION_PROMPT,
    selectedCatalogItemId: selectedCandidate?.catalogItemId,
    source_governance_passed: sourceGovernance.passed,
    source_governance_failures: sourceGovernance.failures,
    product_candidate_count: productCandidates.length,
    fake_product_availability: fakeProductAvailability,
    ui_text_sample: androidProbe.android.ui_text_sample,
    failures: passed ? [] : [{ code: androidEmulatorPassed ? "ANDROID_SOURCE_GOVERNANCE_FAILED" : "ANDROID_EMULATOR_NOT_RUN" }],
    fake_green_claimed: false,
  });

  return { passed };
}

if (require.main === module) {
  runAndroidSourceGovernanceSmoke()
    .then((result) => {
      console.log(result.passed ? "GREEN_ANDROID_SOURCE_GOVERNANCE_READY" : "BLOCKED_ANDROID_SOURCE_GOVERNANCE_FAILED");
      if (!result.passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
