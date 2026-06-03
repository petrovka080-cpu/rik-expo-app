import { runEnterpriseVisible500RequestDraftRealPath } from "../../scripts/e2e/enterpriseVisible500RequestDraftRealPathCore";

describe("enterprise visible 500 request draft real path", () => {
  it("passes supplied fixture, exact pasted 500, live regressions, foreman route, and PDF table path", () => {
    const { matrix } = runEnterpriseVisible500RequestDraftRealPath();

    expect(matrix.visible_500_supplied_passed).toBe(500);
    expect(matrix.exact_pasted_500_passed).toBe(500);
    expect(matrix.live_regression_prompts_passed).toBe(true);
    expect(matrix.foreman_route_prompts_passed).toBe(true);
    expect(matrix.manual_triage_found).toBe(false);
    expect(matrix.template_gap_found).toBe(false);
    expect(matrix.object_confusion_found).toBe(false);
    expect(matrix.weak_generic_rows_found).toBe(false);
    expect(matrix.pdf_table_passed).toBe(true);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
