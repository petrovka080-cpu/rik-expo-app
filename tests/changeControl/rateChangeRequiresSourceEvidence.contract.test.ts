import { validatePayload, validRatePayload } from "./changeControlTestHelpers";

describe("change control - rate source evidence", () => {
  it("blocks priced ratebook rows without source evidence", () => {
    const { run } = validatePayload("RATEBOOK_ENTRY", "roof_primer_m2", validRatePayload({
      sourceId: undefined,
      sourceEvidence: undefined,
    }));
    expect(run.status).toBe("failed");
    expect(run.failures.map((failure) => failure.code)).toContain("RATE_SOURCE_EVIDENCE_MISSING");
  });
});
