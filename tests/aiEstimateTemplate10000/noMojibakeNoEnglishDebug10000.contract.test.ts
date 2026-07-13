import { runProductionTemplate10000RowQualityAudit } from "../../src/lib/ai/estimateTemplate10000";

describe("no mojibake and no English debug labels 10000", () => {
  it("keeps visible production names clean", () => {
    const audit = runProductionTemplate10000RowQualityAudit();

    expect(audit.mojibakeFound).toBe(0);
    expect(audit.englishDebugLabelsVisible).toBe(0);
  });
});
