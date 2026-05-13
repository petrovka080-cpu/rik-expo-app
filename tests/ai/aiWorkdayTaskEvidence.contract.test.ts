import {
  hasAiWorkdayEvidenceRefs,
  toAiWorkdayEvidenceRefs,
} from "../../src/features/ai/workday/aiWorkdayTaskEvidence";

describe("AI proactive workday task evidence", () => {
  it("normalizes only non-empty redacted evidence references", () => {
    const refs = toAiWorkdayEvidenceRefs({
      domain: "warehouse",
      type: "warehouse_low_stock",
      evidenceRefs: ["warehouse:low:redacted", " ", "warehouse:low:redacted"],
    });

    expect(hasAiWorkdayEvidenceRefs(["warehouse:low:redacted"])).toBe(true);
    expect(hasAiWorkdayEvidenceRefs([" "])).toBe(false);
    expect(refs).toEqual([
      {
        type: "warehouse",
        ref: "warehouse:low:redacted",
        source: "warehouse_status",
        redacted: true,
        rawPayloadStored: false,
        rawRowsReturned: false,
        rawPromptStored: false,
      },
    ]);
  });
});
