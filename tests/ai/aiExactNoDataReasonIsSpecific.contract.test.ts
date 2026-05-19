import { groundedButtonTrace, groundedFreeTextTrace, groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("AI exact no-data reasons", () => {
  it("uses specific no-data reasons when full business context is missing", () => {
    expect(groundedQaMatrix().exact_no_data_reasons_specific).toBe(true);
    for (const entry of [...groundedButtonTrace(), ...groundedFreeTextTrace()]) {
      const reason = entry.groundedAnswer.exactNoDataReasonRu;
      if (reason) {
        expect(reason.length).toBeGreaterThanOrEqual(30);
        expect(reason).not.toMatch(/нет контекста|неизвестно|unknown/i);
      }
    }
  });
});
