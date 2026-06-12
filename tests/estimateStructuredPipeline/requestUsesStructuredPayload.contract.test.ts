import { buildConsumerRepairAiDraftFromGlobalEstimate } from "../../src/lib/consumerRequests";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { allPayloads, buildRequestBundleFromPayload, expectNoForbiddenVisibleText } from "./structuredPipelineTestHelpers";

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

  it("exposes source confidence, tax, and row names in the request visible estimate summary", () => {
    const payload = allPayloads()[0];
    const viewModel = buildRequestEstimateViewModel(buildRequestBundleFromPayload(payload));
    const visibleText = [
      viewModel?.sourceLabels.join("\n"),
      viewModel?.sourceConfidenceLabel,
      viewModel?.taxLabel,
      ...(viewModel?.visibleLines.map((line) => line.text) ?? []),
    ].join("\n");

    expect(viewModel?.visibleLines.length).toBeGreaterThan(4);
    expect(visibleText).toMatch(/\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a|Source/);
    expect(visibleText).toMatch(/\u0443\u0432\u0435\u0440\u0435\u043d\u043d\u043e\u0441\u0442\u044c/);
    expect(visibleText).toMatch(/\u041d\u0430\u043b\u043e\u0433|\u041d\u0414\u0421|VAT|GST|tax/i);
    expect(visibleText).toContain(payload.rows[0].visibleName);
  });
});
