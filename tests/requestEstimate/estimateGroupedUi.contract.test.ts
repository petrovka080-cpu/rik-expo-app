import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { createConsumerRepairRequestDraft, __resetConsumerRepairRequestStoreForTests } from "../../src/lib/consumerRequests";

const PROMPT = "\u041a\u0430\u043f\u0438\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u0440\u0435\u043c\u043e\u043d\u0442 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b 54 \u043a\u0432 \u043c\u0435\u0442\u0440\u0430";

describe("request estimate grouped UI", () => {
  it("separates materials, works, equipment and logistics/services for expanded estimates", () => {
    __resetConsumerRepairRequestStoreForTests();
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "grouped-ui-test-user",
      problemText: PROMPT,
      repairType: "apartment_capital_renovation",
      city: "Р‘РёС€РєРµРє",
      aiDraft: buildConsumerRepairAiDraft(PROMPT),
    });
    const vm = buildRequestEstimateViewModel(bundle);
    if (!vm) throw new Error("view model missing");

    expect(vm.sections.map((section) => section.title)).toEqual(expect.arrayContaining([
      "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
      "\u0420\u0430\u0431\u043e\u0442\u044b",
      "\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435",
      "\u0423\u0441\u043b\u0443\u0433\u0438 / \u043b\u043e\u0433\u0438\u0441\u0442\u0438\u043a\u0430",
    ]));
    expect(vm.sections.flatMap((section) => section.items).every((item) => item.formulaId && item.calculationTrace)).toBe(true);
  });
});
