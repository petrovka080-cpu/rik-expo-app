import fs from "node:fs";
import path from "node:path";

import {
  buildConsumerRepairCanonicalDraftPayload,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairPdfStorageObject,
  removeConsumerRepairRequestItem,
} from "../../src/lib/consumerRequests";
import {
  buildAiEstimatePdfSourceFromConsumerRepairDraft,
  generateAiEstimatePdf,
} from "../../src/lib/ai/estimatePdf";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { extractEstimatePdfText, validateEstimatePdf } from "../../src/lib/estimatePdf";
import { normalizeRuText } from "../../src/lib/text/encoding";
import {
  foundationDraftWithManualCatalogItem,
  MANUAL_CATALOG_ITEM,
  updateManualQuantity,
} from "./requestEstimateBoqCatalogTestHelpers";

function readable(value: string | null | undefined): string {
  return String(normalizeRuText(String(value ?? "")) ?? "").replace(/\s+/g, " ").trim();
}

describe("request PDF uses canonical payload rows", () => {
  it("renders current request rows instead of recalculating estimate from prompt", () => {
    let bundle = foundationDraftWithManualCatalogItem();
    const removed = bundle.items.find((item) => item.source === "reference_price_book" && !item.catalogItemId);
    expect(removed).toBeTruthy();
    const removedName = readable(removed!.titleRu);

    bundle = updateManualQuantity(bundle, 3);
    bundle = removeConsumerRepairRequestItem({ requestDraftId: bundle.draft.id, itemId: removed!.id });
    bundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-06-06T00:00:00.000Z",
    });

    const pdf = bundle.pdfs[0];
    const object = getConsumerRepairPdfStorageObject({
      storageBucket: pdf.storageBucket,
      storageKey: pdf.storageKey,
    });
    expect(object).toBeTruthy();

    const payload = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");
    const viewModel = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: bundle.draft,
      items: bundle.items,
      media: bundle.media,
      generatedAt: "2026-06-06T00:00:00.000Z",
    });
    expect(viewModel?.runtimeTrace.selectedTool).toBe("consumer_repair_canonical_payload");
    expect(viewModel?.runtimeTrace.traceId).toContain(payload.parityFingerprint);

    const payloadNames = payload.items.map((item) => readable(item.titleRu)).sort();
    const pdfViewNames = viewModel!.sections.flatMap((section) => section.rows.map((row) => row.name)).sort();
    expect(pdfViewNames).toEqual(payloadNames);

    const validation = validateEstimatePdf({
      pdf: object!.body,
      requiredText: [
        readable(MANUAL_CATALOG_ITEM.name),
        viewModel!.totals.grand,
      ],
    });
    expect(validation.valid).toBe(true);

    const text = extractEstimatePdfText(object!.body);
    expect(text).toContain(readable(MANUAL_CATALOG_ITEM.name));
    expect(text).not.toContain(removedName);
    expect(text).not.toContain("materialKey:");
    expect(text).not.toContain("rateKey:");
    expect(text).not.toContain("consumer_request_payload");
    expect(text).not.toContain("consumer_repair_canonical_payload");
    expect(text).not.toContain("calculate_global_estimate");
  });

  it("keeps consumer PDF service free of prompt-based estimate recalculation", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/consumerRequests/consumerRequestPdfService.ts"),
      "utf8",
    );
    expect(source).toContain("buildConsumerRepairCanonicalDraftPayload");
    expect(source).not.toMatch(/calculateGlobalConstructionEstimateSync|routeUniversalEstimateIntent|buildGlobalEstimateInputFromRoute/);
    expect(source).not.toMatch(/selectedTool:\s*["']calculate_global_estimate["']/);
  });

  it("preserves catalog selections through the AI PDF consumer-draft adapter", () => {
    let bundle = foundationDraftWithManualCatalogItem();
    bundle = updateManualQuantity(bundle, 4);
    const source = buildAiEstimatePdfSourceFromConsumerRepairDraft(bundle);
    const manualRow = source.estimate.sections.flatMap((section) => section.rows)
      .find((row) => row.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId);

    expect(manualRow).toMatchObject({
      requestItemType: "material",
      requestItemSource: "catalog_item",
      catalogItemId: MANUAL_CATALOG_ITEM.catalogItemId,
      selectedCatalogItemId: MANUAL_CATALOG_ITEM.catalogItemId,
      sourceId: MANUAL_CATALOG_ITEM.sourceId,
    });

    const result = generateAiEstimatePdf({ source, userConfirmed: true });
    const validation = validateEstimatePdf({
      pdf: result.access.uri,
      requiredText: [readable(MANUAL_CATALOG_ITEM.name)],
    });
    expect(validation.valid).toBe(true);
    expect(validation.text).toContain(readable(MANUAL_CATALOG_ITEM.name));
    expect(validation.text).not.toContain("materialKey:");
    expect(validation.text).not.toContain("rateKey:");
    expect(validation.text).not.toContain("consumer_request_payload");
  });
});
