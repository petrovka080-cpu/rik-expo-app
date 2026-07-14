import { runProductionTemplate10000RowQualityAudit } from "../../src/lib/ai/estimateTemplate10000";

describe("no generic rows 10000", () => {
  it("rejects fallback or generic template rows for known work", () => {
    const audit = runProductionTemplate10000RowQualityAudit();

    expect(audit.genericRowsFound).toBe(0);
    expect(audit.failures.filter((failure) => failure.blocker === "FAIL_GENERIC_TEMPLATE_ROW_FOR_KNOWN_WORK")).toHaveLength(0);
  });
});
