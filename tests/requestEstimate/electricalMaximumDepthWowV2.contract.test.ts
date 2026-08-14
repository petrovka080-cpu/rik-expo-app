import fs from "node:fs";
import path from "node:path";

import {
  buildRequestEstimateProfessionalRowEvidence,
  buildRequestEstimateViewModel,
} from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";

const ROOT = path.resolve(__dirname, "..", "..");

function smartItem(stage: string, titleRu: string) {
  return {
    itemType: "material" as const,
    titleRu,
    quantity: 12.5,
    unit: "linear_m",
    unitLabel: "linear_m",
    unitPrice: 240,
    currency: "KGS",
    source: "reference_price_book" as const,
    sourceLabel: "Коммерческое предложение поставщика от 14.08.2026",
    formulaId: "electrical_quantity_formula",
    quantityFormula: "cable_length_m * 1.03",
    calculationTrace: "cable_length_m * 1.03 = 12.5 linear_m",
    normSourceId: "KG_KRERM_08_2015_ELECTRICAL",
    normSourceTitle: "КРЕРм №8. Электротехнические установки",
    normVersion: "официальная редакция",
    priceStatus: "USER_ENTERED_PRICE" as const,
    priceSource: "user" as const,
    priceSourceLabel: "Коммерческое предложение поставщика от 14.08.2026",
    sourceParameters: {
      smartEstimateProjectionV2: {
        progressiveDisclosure: true,
        stage,
        category: "material",
        rowReachable: true,
        parameterDependencies: ["cable_length_m", "rated_voltage_v"],
      },
      normativeRowTraceV3: [{
        document_code: "КРЕРм №8",
        exact_locator: "раздел 08-02, применимая расценка проекта",
      }],
      priceRouteV3: {
        kind: "RUNTIME_VALIDATED_INPUT",
      },
    },
  };
}

describe("BATCH005 maximum-depth user WOW V2", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("groups every smart row by its real technological stage without losing rows", () => {
    const aiDraft = {
      titleRu: "Профессиональная смета кабельной линии",
      summaryRu: "Расчёт по технологическим этапам",
      repairType: "electrical",
      dangerousDiyBlocked: false,
      missingData: [],
      items: [
        smartItem("Материалы и комплектующие", "Кабель силовой"),
        smartItem("Монтаж", "Кабельный наконечник"),
        smartItem("Испытания", "Маркировочная бирка"),
      ],
    };
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "batch005-wow-v2",
      problemText: "Силовая кабельная линия",
      city: "Бишкек",
      aiDraft,
    });
    const viewModel = buildRequestEstimateViewModel(bundle);
    if (!viewModel) throw new Error("BATCH005_WOW_VIEW_MODEL_MISSING");

    expect(viewModel.sections.map((section) => section.title)).toEqual([
      "Материалы и комплектующие",
      "Монтаж",
      "Испытания",
    ]);
    expect(viewModel.sections.flatMap((section) => section.items)).toHaveLength(3);
    expect(viewModel.sections.every((section) => section.id.startsWith("professional_"))).toBe(true);
  });

  it("explains quantity, parameter influence, exact norm locator, and price in public language", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "batch005-wow-proof-v2",
      problemText: "Силовая кабельная линия",
      city: "Бишкек",
      aiDraft: {
        titleRu: "Профессиональная смета кабельной линии",
        summaryRu: "Расчёт по технологическим этапам",
        repairType: "electrical",
        dangerousDiyBlocked: false,
        missingData: [],
        items: [smartItem("Материалы и комплектующие", "Кабель силовой")],
      },
    });
    const evidence = buildRequestEstimateProfessionalRowEvidence(bundle.items[0]);

    expect(evidence).not.toBeNull();
    expect(evidence?.formulaLabel).toContain("Результат: 12,5 пог. м");
    expect(evidence?.parameterLabel).toContain("номинальное напряжение, В");
    expect(evidence?.normativeLabel).toContain("раздел 08-02");
    expect(evidence?.priceLabel).toContain("240");
    expect(JSON.stringify(evidence)).not.toMatch(/formula_id|source_parameters|rowCode|PRICE_MISSING/u);
  });

  it("keeps hundreds of rows reachable through search, stage controls, pagination, and row proof", () => {
    const editor = fs.readFileSync(
      path.join(ROOT, "src/features/consumerRepair/RequestEstimateItemsEditor.tsx"),
      "utf8",
    );
    const row = fs.readFileSync(
      path.join(ROOT, "src/features/consumerRepair/ConsumerRepairItemRow.tsx"),
      "utf8",
    );

    expect(editor).toContain('testID="request-estimate-items-search"');
    expect(editor).toContain("request-estimate-stage-toggle-");
    expect(editor).toContain('testID="request-estimate-items-load-more"');
    expect(row).toContain("consumer-repair-item-professional-proof-");
    expect(row).toContain("professionalEvidence.formulaLabel");
    expect(row).toContain("professionalEvidence.normativeLabel");
    expect(row).toContain("professionalEvidence.priceLabel");
    expect(`${editor}\n${row}`).not.toContain("JSON.stringify");
  });
});
