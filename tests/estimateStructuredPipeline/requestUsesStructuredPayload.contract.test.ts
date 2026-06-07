import { buildConsumerRepairAiDraftFromGlobalEstimate } from "../../src/lib/consumerRequests";
import { allPayloads, expectNoForbiddenVisibleText } from "./structuredPipelineTestHelpers";

describe("request structured estimate binding", () => {
  it("uses structured payload presentation rows for request draft items", () => {
    for (const payload of allPayloads()) {
      const draft = buildConsumerRepairAiDraftFromGlobalEstimate(payload.sourceEstimate);
      expect(draft.estimatePresentation).toBeTruthy();
      expect(draft.estimatePresentation?.estimateId).toBe(payload.estimateId);
      expect(draft.items).toHaveLength(payload.rows.length);
      expect(draft.items.map((item) => item.titleRu.replace(/^\d+(?:\.\d+)?\s+/, ""))).toEqual(
        payload.rows.map((row) => row.visibleName),
      );
      expectNoForbiddenVisibleText(draft.items.map((item) => `${item.titleRu}\n${item.sourceLabel ?? ""}`).join("\n"));
    }
  });
});
