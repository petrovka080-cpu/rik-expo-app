import {
  getEnterpriseVisible1000Artifacts,
  readEnterpriseVisible1000StructuredCases,
} from "./enterpriseVisible1000TestHelpers";

describe("enterprise visible 1000 structured estimate visible policy", () => {
  it("does not expose internal keys, generic labels, warning labels, or control rows", () => {
    const { matrix, visiblePolicy } = getEnterpriseVisible1000Artifacts();
    const structuredCases = readEnterpriseVisible1000StructuredCases();

    expect(visiblePolicy.estimate_cases_checked).toBe(971);
    expect(visiblePolicy.forbidden_visible_matches).toBe(0);
    expect(visiblePolicy.visible_label_violations).toBe(0);
    expect(visiblePolicy.generic_rows_visible).toBe(0);
    expect(visiblePolicy.control_rows_as_paid_line_items).toBe(0);
    expect(visiblePolicy.catalog_internal_keys_visible).toBe(0);
    expect(matrix.internal_keys_visible_in_ui).toBe(0);
    expect(matrix.catalog_modal_internal_keys_visible).toBe(0);
    expect(matrix.generic_rows_visible).toBe(0);
    expect(matrix.control_rows_as_paid_line_items).toBe(0);
    expect(structuredCases.every((testCase) => testCase.accepted === true)).toBe(true);
    expect(structuredCases.every((testCase) => Number(testCase.rowCount) > 0)).toBe(true);
  });
});
