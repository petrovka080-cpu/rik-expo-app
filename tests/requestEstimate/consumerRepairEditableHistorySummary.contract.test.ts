import { buildConsumerRepairEditableHistorySummary } from "../../src/features/consumerRepair/consumerRepairEditableHistorySummary";

describe("consumer repair editable history summary", () => {
  it("exposes the restored 4-revision / 3-diff history without relabeling canonical R1", () => {
    expect(buildConsumerRepairEditableHistorySummary({
      revisions: [{}, {}, {}, {}],
      diffs: [{}, {}, {}],
    })).toEqual({
      revisions: 4,
      diffs: 3,
      labelRu: "Версий сметы: 4 · изменений: 3",
    });
  });

  it("does not add UI noise for a draft with only its initial revision", () => {
    expect(buildConsumerRepairEditableHistorySummary({
      revisions: [{}],
      diffs: [],
    })).toBeNull();
  });
});
