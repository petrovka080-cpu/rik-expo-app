import {
  auditEstimatePdfReality,
  hasMojibakeText,
} from "../../scripts/estimate/auditEstimatePdfReality";
import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("PDF Cyrillic and trace detector", () => {
  it("requires readable text and calculation trace", () => {
    const testCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "masonry_400_gas_block");
    const audit = auditEstimatePdfReality(evaluateWorkSpecificityCase(testCase!));

    expect(hasMojibakeText("РџР»РѕС…Рѕ")).toBe(true);
    expect(audit.pdf_contains_calculation_trace).toBe(true);
    expect(audit.pdf_contains_missing_price_state).toBe(true);
  });
});
