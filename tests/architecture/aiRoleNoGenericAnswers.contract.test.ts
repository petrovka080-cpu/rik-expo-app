import { buildAiRoleLiveTranscriptValueReport } from "../../scripts/e2e/aiRoleLiveTranscriptValue.shared";

describe("AI role live value generic-answer guard", () => {
  it("finds no generic role answers in the 80-question transcript pack", () => {
    const report = buildAiRoleLiveTranscriptValueReport({
      fullJestPassed: true,
      releaseVerifyPassed: true,
    });

    expect(report.transcripts).toHaveLength(80);
    expect(report.genericRate.generic_answers_found).toBe(0);
    expect(report.genericRate.generic_answer_rate).toBe(0);
    expect(report.genericRate.debug_text_visible).toBe(false);
    expect(report.genericRate.fake_price_master_stock_eta_found).toBe(0);
  });
});

