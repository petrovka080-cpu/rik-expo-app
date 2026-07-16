import { readFileSync } from "node:fs";

import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { __resetConsumerRepairRequestStoreForTests } from "../../src/lib/consumerRequests";

type PromptCase = {
  id: string;
  prompt: string;
};

function promptForCase(caseId: string): string {
  const cases = JSON.parse(
    readFileSync("tests/fixtures/aiPromptPacks/ai_5000_next_real_work_prompts.json", "utf8"),
  ) as PromptCase[];
  const testCase = cases.find((candidate) => candidate.id === caseId);
  if (!testCase) throw new Error(`PROMPT_CASE_NOT_FOUND:${caseId}`);
  return testCase.prompt;
}

describe("request autoPrepare source-backed structured estimate", () => {
  beforeEach(() => {
    __resetConsumerRepairRequestStoreForTests();
  });

  it("keeps the real Web route draft priced and professional without changing the structured payload contract", () => {
    const prompt = promptForCase("W159-04-01");
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "request-autoprepare-source-backed",
      problemText: prompt,
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });
    const viewModel = buildRequestEstimateViewModel(bundle);
    const primaryText = [
      viewModel?.title,
      viewModel?.summary,
      viewModel?.totalLabel,
      viewModel?.priceStatusLabel,
      ...(viewModel?.visibleLines.slice(0, 8).map((line) => line.text) ?? []),
    ].join("\n");

    expect(aiDraft.selectedWork?.selectedWorkKey).toBe("dynamic_foundation_estimate");
    expect(aiDraft.structuredEstimatePayload?.workKey).toBe("dynamic_foundation_estimate");
    expect(aiDraft.structuredEstimatePayload?.selectedWork).toBeUndefined();
    expect(aiDraft.structuredEstimatePayload?.boq.totals.missingPriceRowsCount).toBe(0);
    expect(aiDraft.items.length).toBeGreaterThan(20);
    expect(aiDraft.items.every((item) => item.unitPrice != null && item.priceSource !== "missing")).toBe(true);

    expect(bundle.draft.selectedWorkKey).toBe("dynamic_foundation_estimate");
    expect(bundle.structuredEstimatePayload?.workKey).toBe("dynamic_foundation_estimate");
    expect(bundle.structuredEstimatePayload?.selectedWork).toBeUndefined();
    expect(bundle.items).toHaveLength(aiDraft.items.length);
    expect(bundle.items.every((item) => item.unitPrice != null && item.totalPrice != null)).toBe(true);

    expect(viewModel?.title).not.toMatch(/Заявка на ремонт|dynamic_foundation_estimate|PRICE_MISSING/i);
    expect(viewModel?.priceStatusLabel).toContain(`${bundle.items.length}/${bundle.items.length}`);
    expect(viewModel?.sections.length).toBeGreaterThanOrEqual(3);
    expect(primaryText).not.toMatch(/Заявка на ремонт|READY_PROFESSIONAL|PRELIMINARY_REQUIRES_INPUT|PRICE_MISSING|dynamic_foundation_estimate/i);
  });

  it("keeps passport-backed volume-only earthworks BOQ instead of falling back to manual triage", () => {
    const prompt = "уплотнение песчаного основания в стандартной зоне (раздел: земляные работы) 12 м3, город Бишкек.";
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "request-autoprepare-passport-backed-volume-only",
      problemText: prompt,
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });

    expect(aiDraft.selectedWork?.selectedWorkKey).toBe("earthworks_interior_sand_base_compact_standard_professional_expanded_v1");
    expect(aiDraft.items).toHaveLength(200);
    expect(aiDraft.items.every((item) => item.sourceParameters?.passportBackedNaturalLanguageIngress === true)).toBe(true);
    expect(aiDraft.items.every((item) => item.priceSource === "missing")).toBe(true);

    expect(bundle.draft.selectedWorkKey).toBe("earthworks_interior_sand_base_compact_standard_professional_expanded_v1");
    expect(bundle.items).toHaveLength(200);
    expect(bundle.items.every((item) => item.sourceParameters?.passportBackedNaturalLanguageIngress === true)).toBe(true);
    expect(bundle.items.every((item) => item.priceSource === "missing")).toBe(true);
  });

  it("keeps passport-backed carpet BOQ without invoking legacy unit fallback", () => {
    const prompt = "укладка ковролина в стандартной зоне 100 м2, город Бишкек.";
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "request-autoprepare-passport-backed-carpet",
      problemText: prompt,
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });

    expect(aiDraft.selectedWork?.selectedWorkKey).toBe("flooring_interior_carpet_lay_standard_professional_expanded_v1");
    expect(aiDraft.items).toHaveLength(61);
    expect(aiDraft.items.every((item) => item.sourceParameters?.passportBackedNaturalLanguageIngress === true)).toBe(true);
    expect(aiDraft.items.every((item) => item.priceSource === "missing")).toBe(true);

    expect(bundle.draft.selectedWorkKey).toBe("flooring_interior_carpet_lay_standard_professional_expanded_v1");
    expect(bundle.items).toHaveLength(61);
    expect(bundle.items.every((item) => item.sourceParameters?.passportBackedNaturalLanguageIngress === true)).toBe(true);
    expect(bundle.items.every((item) => item.priceSource === "missing")).toBe(true);
  });
});
