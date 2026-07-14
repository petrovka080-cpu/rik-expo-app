import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  compileProductionExpandedEstimate10000,
  type ProductionCompiledExpandedRow,
} from "../../src/lib/ai/estimateTemplate10000";
import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate/formatEstimateUnitLabel";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  type ConsumerRepairAiDraft,
  type ConsumerRepairItemType,
} from "../../src/lib/consumerRequests";

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
    summaryRu: "Wave2B base catalog unit display check",
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

describe("professional BOQ unit display in request estimate", () => {
  it("keeps repaired base-catalog units visible in public request rows", () => {
    __resetConsumerRepairRequestStoreForTests();
    const rows = selectedRows();
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "wave2b-request-units",
      problemText: "flooring unit display check",
      repairType: "flooring",
      city: "Bishkek",
      addressText: "test address",
      contactPhone: "+996700000000",
      aiDraft: buildDraft(rows),
    });
    const vm = buildRequestEstimateViewModel(bundle);
    if (!vm) throw new Error("REQUEST_VIEW_MODEL_MISSING");

    const itemByRowCode = new Map(bundle.items.map((item) => [String(item.sourceParameters?.rowCode), item]));
    const lineFor = (rowCode: string): string => {
      const item = itemByRowCode.get(rowCode);
      if (!item) throw new Error(`ITEM_MISSING:${rowCode}`);
      return vm.visibleLines.find((line) => line.id === item.id)?.text ?? "";
    };

    const primer = itemByRowCode.get(ROW_CODES.primer);
    const glue = itemByRowCode.get(ROW_CODES.glue);
    const baseboard = itemByRowCode.get(ROW_CODES.baseboard);
    if (!primer || !glue || !baseboard) throw new Error("TARGET_ITEMS_MISSING");

    expect(lineFor(ROW_CODES.primer)).toContain(`${primer.quantity} \u043b`);
    expect(lineFor(ROW_CODES.glue)).toContain(`${glue.quantity} \u043a\u0433`);
    expect(lineFor(ROW_CODES.baseboard)).toContain(`${baseboard.quantity} \u043f\u043e\u0433. \u043c`);
    expect(lineFor(ROW_CODES.baseboard)).not.toContain("\u043c\u00b2");
    expect(vm.visibleLines.map((line) => line.text).join("\n")).not.toMatch(
      /PRICE_MISSING|template_id|source_parameters|formula_id|norm_id|linear_m|raw_ai_json/i,
    );
  });
});
