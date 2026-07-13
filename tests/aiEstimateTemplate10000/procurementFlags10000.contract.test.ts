import { runProductionTemplate10000RowQualityAudit } from "../../src/lib/ai/estimateTemplate10000";

describe("procurement flags 10000", () => {
  it("has procurement-included rows for every production template", () => {
    const audit = runProductionTemplate10000RowQualityAudit();

    expect(audit.failures.filter((failure) => failure.blocker === "PROCUREMENT_FLAGS_MISSING")).toHaveLength(0);
  });
});
