import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  detectEstimateFakeRows,
  structuredRowsForDetector,
} from "../../src/lib/ai/estimateContinuousDetection";

const PROMPT = "Капитальный ремонт квартиры 54 кв метра";

describe("estimate pricing no fake default price contract", () => {
  it("does not emit fake 980/default price clusters for real apartment BOQ", () => {
    const payload = buildConsumerRepairAiDraft(PROMPT).structuredEstimatePayload;
    expect(payload).toBeTruthy();

    const detector = detectEstimateFakeRows({
      rows: structuredRowsForDetector(payload!.rows),
      promptArea: 54,
    });
    const price980Rows = payload!.rows.filter((row) => row.unitPrice === 980);

    expect(detector.failure_ids).not.toContain("fake_price_detector");
    expect(detector.failure_ids).not.toContain("same_price_for_unrelated_rows_detector");
    expect(price980Rows.length).toBeLessThan(Math.max(4, Math.ceil(payload!.rows.length * 0.12)));
  });
});
