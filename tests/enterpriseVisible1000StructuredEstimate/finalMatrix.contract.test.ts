import { getEnterpriseVisible1000Artifacts } from "./enterpriseVisible1000TestHelpers";

describe("enterprise visible 1000 structured estimate acceptance matrix", () => {
  it("closes the 1000 real-input gate only after the structured pipeline green", () => {
    const { matrix, previous, failures } = getEnterpriseVisible1000Artifacts();

    expect(matrix.final_status).toBe("GREEN_ENTERPRISE_VISIBLE_1000_STRUCTURED_ESTIMATE_REAL_INPUT_ACCEPTANCE_READY");
    expect(previous.previous_structured_pipeline_green).toBe(true);
    expect(previous.previous_built_in_ai_1000_green).toBe(true);
    expect(matrix.cases_total).toBe(1000);
    expect(matrix.estimate_cases_total).toBe(971);
    expect(matrix.estimate_cases_accepted).toBe(971);
    expect(matrix.product_cases_total).toBe(28);
    expect(matrix.product_cases_accepted).toBe(28);
    expect(matrix.pdf_action_cases_total).toBe(1);
    expect(matrix.pdf_action_cases_accepted).toBe(1);
    expect(matrix.failures_count).toBe(0);
    expect(failures).toEqual([]);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
