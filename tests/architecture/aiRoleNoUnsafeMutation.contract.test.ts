import { buildAiRoleLiveTranscriptValueReport } from "../../scripts/e2e/aiRoleLiveTranscriptValue.shared";

describe("AI role live value unsafe-mutation guard", () => {
  it("keeps live role answers read-only or draft-only without fake final actions", () => {
    const report = buildAiRoleLiveTranscriptValueReport({
      fullJestPassed: true,
      releaseVerifyPassed: true,
    });

    expect(report.genericRate.unsafe_mutations_found).toBe(0);
    expect(report.dataAccess.service_role_used).toBe(false);
    expect(report.dataAccess.unsafe_cross_role_leak_found).toBe(false);
    expect(report.transcripts.every((item) => !item.unsafe_mutation)).toBe(true);
    expect(report.transcripts.every((item) => !item.fake_price_master_stock_eta)).toBe(true);
  });
});

