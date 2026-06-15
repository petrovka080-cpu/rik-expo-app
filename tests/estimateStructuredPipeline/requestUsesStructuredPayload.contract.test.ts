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

  it("keeps the request summary clean while retaining source and tax details off the primary surface", () => {
    const payload = allPayloads()[0];
    const viewModel = buildRequestEstimateViewModel(buildRequestBundleFromPayload(payload));
    const primaryVisibleText = [
      viewModel?.summary,
      viewModel?.priceStatusLabel,
      ...(viewModel?.visibleLines.map((line) => line.text) ?? []),
    ].join("\n");
    const detailsText = [
      viewModel?.sourceLabels.join("\n"),
      viewModel?.taxLabel,
      viewModel?.taxWarning,
    ].join("\n");

    expect(viewModel?.visibleLines.length).toBeGreaterThan(4);
    expect(primaryVisibleText).not.toMatch(/confidence|sourceConfidence|\u0443\u0432\u0435\u0440\u0435\u043d\u043d\u043e\u0441\u0442\u044c|\u0422\u043e\u0447\u043d\u043e\u0441\u0442\u044c/i);
    expect(viewModel?.sourceLabels.length).toBeGreaterThan(0);
    expect(detailsText).toMatch(/\u041d\u0430\u043b\u043e\u0433|\u041d\u0414\u0421|NDS|VAT|GST|tax/i);
    expect(primaryVisibleText).toContain(payload.rows[0].visibleName);
  });
});
