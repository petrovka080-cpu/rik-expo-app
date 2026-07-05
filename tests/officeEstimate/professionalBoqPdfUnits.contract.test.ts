import {
  compileProductionExpandedEstimate10000,
  type ProductionCompiledExpandedRow,
} from "../../src/lib/ai/estimateTemplate10000";
import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate/formatEstimateUnitLabel";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  type ConsumerRepairAiDraft,
  type ConsumerRepairItemType,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";

const ROW_CODES = {
  primer: "flooring_interior_laminate_lay_standard_materials_03",
  glue: "flooring_interior_laminate_lay_standard_materials_05",
  baseboard: "flooring_interior_laminate_lay_standard_labor_23",
} as const;

function itemTypeFor(row: ProductionCompiledExpandedRow): ConsumerRepairItemType {
  if (row.lineType === "material") return "material";
  if (row.lineType === "work") return "work";
  return "service";
}

function buildDraft(rows: ProductionCompiledExpandedRow[]): ConsumerRepairAiDraft {
  return {
    titleRu: "Wave2B flooring BOQ",
    summaryRu: "Wave2B base catalog PDF unit check",
    repairType: "flooring",
    dangerousDiyBlocked: false,
    missingData: [],
    items: rows.map((row) => ({
      itemType: itemTypeFor(row),
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      unitLabel: formatEstimateUnitLabel(row.unit),
      unitPrice: null,
      currency: "KGS",
      source: "reference_price_book",
      category: row.section,
      sourceId: row.normSourceId,
      sourceLabel: "source not selected",
      formulaId: row.formulaId,
      quantityFormula: row.quantityFormula,
      calculationTrace: row.calculationTrace,
      sourceParameters: row.sourceParameters,
      templateId: row.templateId,
      templateVersion: row.templateVersion,
      normId: row.normId,
      normFamilyId: row.normFamilyId,
      normSourceId: row.normSourceId,
      normSourceTitle: row.normSourceTitle,
      normVersion: row.normVersion,
      normReviewStatus: row.normReviewStatus,
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "source not selected",
      costConfidence: "missing",
      confidence: "medium",
      addedBy: "ai",
      materialKey: row.materialKey ?? null,
      rateKey: row.pricebookItemKey ?? row.laborRateKey ?? row.rowCode,
    })),
  };
}

function selectedRows(): ProductionCompiledExpandedRow[] {
  const compiled = compileProductionExpandedEstimate10000({
    workKey: "flooring_interior_laminate_lay_standard",
    quantity: 54,
    countryCode: "KG",
  });
  return Object.values(ROW_CODES).map((rowCode) => {
    const row = compiled.rows.find((candidate) => candidate.rowCode === rowCode);
    if (!row) throw new Error(`ROW_MISSING:${rowCode}`);
    return row;
  });
}

describe("professional BOQ PDF unit display", () => {
  it("keeps repaired units in the approved snapshot and never renders baseboard as m2", () => {
    __resetConsumerRepairRequestStoreForTests();
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "wave2b-pdf-units",
      problemText: "flooring PDF unit display check",
      repairType: "flooring",
      city: "Bishkek",
      addressText: "test address",
      contactPhone: "+996700000000",
      aiDraft: buildDraft(selectedRows()),
    });
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-05T00:00:00.000Z",
    });
    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: approved.draft,
      items: approved.items,
      media: approved.media,
      generatedAt: "2026-07-05T00:00:00.000Z",
    });
    if (!pdf) throw new Error("PDF_VIEW_MODEL_MISSING");

    const itemByRowCode = new Map(approved.items.map((item) => [String(item.sourceParameters?.rowCode), item]));
    expect(itemByRowCode.get(ROW_CODES.primer)?.unit).toBe("l");
    expect(itemByRowCode.get(ROW_CODES.glue)?.unit).toBe("kg");
    expect(itemByRowCode.get(ROW_CODES.baseboard)?.unit).toBe("linear_m");

    const pdfRows = pdf.sections.flatMap((section) => section.rows);
    const publicText = pdfRows.flatMap((row) => [
      row.sectionTitle,
      row.name,
      row.quantity,
      row.unitPrice,
      row.total,
      ...row.sourceLabels,
    ]).join("\n");
    const baseboardRow = pdfRows.find((row) => row.quantity.includes("\u043f\u043e\u0433. \u043c"));

    expect(baseboardRow?.quantity).toBe("54 \u043f\u043e\u0433. \u043c");
    expect(baseboardRow?.quantity).not.toContain("\u043c\u00b2");
    expect(publicText).not.toMatch(/\u0433\u0440\u0443\u043d\u0442\u043e\u0432\u043a[^\n]*\u043c\u00b2|\u043a\u043b\u0435\u0439[^\n]*\u043c\u00b2/i);
    expect(publicText).not.toMatch(/PRICE_MISSING|source_parameters|template_id|formula_id|raw_ai_json|linear_m/i);
  });
});
