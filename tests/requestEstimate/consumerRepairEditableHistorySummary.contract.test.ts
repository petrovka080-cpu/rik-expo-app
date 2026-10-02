import { readFileSync } from "node:fs";

import { buildConsumerRepairEditableHistorySummary } from "../../src/features/consumerRepair/consumerRepairEditableHistorySummary";

describe("consumer repair editable history summary", () => {
  it("shows saved user changes without exposing the internal revision chain", () => {
    expect(buildConsumerRepairEditableHistorySummary({
      revisions: [{}, {}, {}, {}],
      diffs: [{}, {}, {}],
    })).toEqual({
      revisions: 4,
      diffs: 3,
      labelRu: "Сохранённых изменений: 3",
    });
  });

  it("does not add UI noise for a draft with only its initial revision", () => {
    expect(buildConsumerRepairEditableHistorySummary({
      revisions: [{}],
      diffs: [],
    })).toBeNull();
  });

  it("does not expose parent-child storage terminology in user-facing estimate messages", () => {
    const copy = [
      "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
      "src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx",
      "src/features/consumerRepair/ConsumerRepairRequestChrome.tsx",
      "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx",
      "src/features/consumerRepair/consumerCanonicalParameterEditor.ts",
      "src/features/consumerRepair/consumerRepairEditableHistorySummary.ts",
      "src/features/requests/components/EstimateRevisionTimeline.tsx",
    ].map((path) => readFileSync(path, "utf8")).join("\n");
    expect(copy.toLocaleLowerCase("ru-RU")).not.toContain("дочерн");
    expect(copy).not.toContain("новой версии сметы");
    expect(copy).not.toContain("версия №");
  });
});
