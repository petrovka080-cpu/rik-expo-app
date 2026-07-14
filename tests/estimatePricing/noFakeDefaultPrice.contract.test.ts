import {
  capitalRenovationBundle,
  draftItemRowsForDetector,
} from "../estimateCalculator/capitalRenovationTestHelpers";
import { detectEstimateFakeRows } from "../../src/lib/ai/estimateContinuousDetection";

describe("estimate pricing no fake default price contract", () => {
  it("does not emit fake 980/default price clusters for real apartment calculator rows", () => {
    const bundle = capitalRenovationBundle();
    const detector = detectEstimateFakeRows({
      rows: draftItemRowsForDetector(bundle.items),
      promptArea: 54,
    });
    const price980Rows = bundle.items.filter((item) => item.unitPrice === 980);

    expect(detector.failure_ids).not.toContain("fake_price_detector");
    expect(detector.failure_ids).not.toContain("same_price_for_unrelated_rows_detector");
    expect(price980Rows).toHaveLength(0);
    expect(bundle.items.every((item) => item.unitPrice == null && item.totalPrice == null)).toBe(true);
  });
});
