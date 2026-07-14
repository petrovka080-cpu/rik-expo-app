import { runProductionTemplate10000RowQualityAudit } from "../../src/lib/ai/estimateTemplate10000";

describe("editable rows 10000", () => {
  it("marks every row as editable and included in the estimate by default", () => {
    const audit = runProductionTemplate10000RowQualityAudit();

    expect(audit.failures.filter((failure) => failure.blocker === "EDIT_FLAGS_MISSING")).toHaveLength(0);
  });
});
