import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";

describe("expanded complex request UI", () => {
  it("keeps expanded request entry clean without category or quick prompt chip noise", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairMediaButtons.tsx"),
      "utf8",
    );

    expect(source).not.toContain("REQUEST_WORK_CATEGORIES");
    expect(source).not.toContain("REQUEST_WORK_EXAMPLES");
    expect(source).not.toContain("request-work-category-chips");
    expect(source).not.toContain("consumer-repair-work-example-chips");
    expect(source).not.toContain("Водоснабжение села 5 км ПЭ100 d110");
    expect(source).toContain("consumer-repair-problem-input");
  });

  it("opens expanded calculators from prompts and renders grouped preview without raw debug text", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "Водоснабжение сёл и наружные сети воды: вода башня";
    const aiDraft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "expanded-complex-request-ui",
      problemText: prompt,
      repairType: aiDraft.repairType,
      city: "Бишкек",
      addressText: "Бишкек, тестовый адрес",
      contactPhone: "+996700000000",
      aiDraft,
    });
    const viewModel = buildRequestEstimateViewModel(bundle);
    if (!viewModel) throw new Error("Request estimate view model was not created.");
    const publicText = [
      viewModel.summary,
      viewModel.totalLabel,
      ...viewModel.previewSections.flatMap((section) => [
        section.title,
        ...section.rows.flatMap((row) => [row.name, row.quantityLabel, row.unitPriceLabel, row.totalLabel, row.sourceLabel]),
      ]),
    ].join("\n");

    expect(aiDraft.repairType).toBe("village_water_supply");
    expect(bundle.items.length).toBeGreaterThan(0);
    expect(bundle.items.some((item) => item.sourceParameters?.rowCode === "water_tower_pcs")).toBe(true);
    expect(viewModel.professionalPreview).toBe(true);
    expect(viewModel.previewSections.map((section) => section.title)).toEqual(expect.arrayContaining([
      "Материалы",
      "Работы",
      "Оборудование",
      "Услуги / логистика",
    ]));
    expect(publicText).toContain("Цена не заполнена");
    expect(publicText).not.toMatch(/PRICE_MISSING|source_parameters|template_id|formula_id|raw_ai_json|expandedComplexCalculator/i);
  });
});
