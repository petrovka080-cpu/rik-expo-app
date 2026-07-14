import { classifyBenchmarkDeviation } from "../../scripts/estimate/goldenBenchmarkCore";

describe("golden benchmark deviation classifier", () => {
  it("treats zero-tolerance benchmark deviations as critical", () => {
    expect(classifyBenchmarkDeviation("MISSING_REQUIRED_ROW")).toBe("critical");
    expect(classifyBenchmarkDeviation("WRONG_UNIT")).toBe("critical");
    expect(classifyBenchmarkDeviation("MISSING_SOURCE")).toBe("critical");
    expect(classifyBenchmarkDeviation("PDF_SNAPSHOT_MISMATCH")).toBe("critical");
    expect(classifyBenchmarkDeviation("BUYER_HANDOFF_INVALID")).toBe("critical");
    expect(classifyBenchmarkDeviation("SILENT_TOLERANCE_WIDENING")).toBe("critical");
  });

  it("keeps ordinary quantity/formula drift as major adjudication work", () => {
    expect(classifyBenchmarkDeviation("WRONG_QUANTITY")).toBe("major");
    expect(classifyBenchmarkDeviation("WRONG_FORMULA")).toBe("major");
  });
});
