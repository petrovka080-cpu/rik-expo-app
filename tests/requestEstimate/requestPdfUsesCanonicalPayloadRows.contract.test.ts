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
import {
  extractEstimatePdfText,
  renderEstimatePdfBinaryDocument,
  validateEstimatePdf,
} from "../../src/lib/estimatePdf";
import { publicBoqDisplayNameRu } from "../../src/lib/estimate/publicBoqNaming";
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
  it("uses the same durable title as approved history", () => {
    const bundle = foundationDraftWithManualCatalogItem();
    const historyTitle = "Мосты, тоннели и инженерные сооружения: устройство асфальтобетонного покрытия моста — 6 400 м²";
    const viewModel = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: {
        ...bundle.draft,
        title: historyTitle,
        selectedWorkTitleRu: "Асфальтобетонное покрытие мостового сооружения",
      },
      items: bundle.items,
      media: bundle.media,
      generatedAt: "2026-09-12T00:00:00.000Z",
    });

    expect(viewModel?.workTitle).toBe(historyTitle);
  });

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
      canonicalPayload: payload,
      generatedAt: "2026-06-06T00:00:00.000Z",
    });
    expect(viewModel?.runtimeTrace.selectedTool).toBe("consumer_repair_canonical_payload");
    expect(viewModel?.runtimeTrace.traceId).toContain(payload.parityFingerprint);

    const payloadNames = payload.items.map((item) => readable(publicBoqDisplayNameRu({
      sourceNameRu: item.titleRu,
      rowType: item.itemType,
    }))).sort();
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

  it("uses the shared concise material title in the rendered PDF without mutating the payload", () => {
    const bundle = foundationDraftWithManualCatalogItem();
    const verbose = "Герметик битумно-полимерный ТЕХНОНИКОЛЬ №42 для узлов водоотвода, ведро 12 кг — предварительная упаковка до сверки поставщика";
    const concise = "Герметик ТЕХНОНИКОЛЬ №42, 12 кг";
    const items = bundle.items.map((item, index) => index === 0 ? {
      ...item,
      titleRu: verbose,
      itemType: "material" as const,
      category: "materials",
    } : item);
    const viewModel = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: bundle.draft,
      items,
      media: bundle.media,
      generatedAt: "2026-10-01T00:00:00.000Z",
    });

    expect(items[0]?.titleRu).toBe(verbose);
    expect(viewModel?.sections.flatMap((section) => section.rows.map((row) => row.name)))
      .toContain(concise);

    const pdf = renderEstimatePdfBinaryDocument(viewModel!);
    const validation = validateEstimatePdf({ pdf: pdf.bytes, requiredText: [concise] });
    expect(validation.valid).toBe(true);
    const text = extractEstimatePdfText(pdf.bytes);
    expect(text).toContain(concise);
    expect(text).not.toContain(verbose);
  });

  it("keeps consumer PDF service free of prompt-based estimate recalculation", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/consumerRequests/consumerRequestPdfService.ts"),
      "utf8",
    );
    expect(source).toContain("canonicalPayload");
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

  it("uses the shared concise material title through the AI PDF consumer-draft adapter", () => {
    const bundle = foundationDraftWithManualCatalogItem();
    const verbose = "Эмульсия битумная катионная для двух сплошных слоёв сцепления: стяжка/нижний асфальт и нижний/верхний асфальт; марка уточняется проектом";
    const concise = "Битумная эмульсия для слоёв сцепления";
    const firstItemId = bundle.items[0]!.id;
    const sourceBundle = {
      ...bundle,
      items: bundle.items.map((item) => item.id === firstItemId ? {
        ...item,
        titleRu: verbose,
        itemType: "material" as const,
        category: "materials",
      } : item),
    };
    const source = buildAiEstimatePdfSourceFromConsumerRepairDraft(sourceBundle);
    const names = source.estimate.sections.flatMap((section) => section.rows.map((row) => row.name));

    expect(sourceBundle.items[0]?.titleRu).toBe(verbose);
    expect(names).toContain(concise);
    expect(names).not.toContain(verbose);

    const result = generateAiEstimatePdf({ source, userConfirmed: true });
    const validation = validateEstimatePdf({ pdf: result.access.uri, requiredText: [concise] });
    expect(validation.valid).toBe(true);
    expect(validation.text).toContain(concise);
    expect(validation.text).not.toContain(verbose);
  });
});
