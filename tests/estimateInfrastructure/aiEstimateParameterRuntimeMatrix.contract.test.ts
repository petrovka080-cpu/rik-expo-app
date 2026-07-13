import {
  GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY,
  runAiEstimateParameterRuntimeMatrix,
} from "../../scripts/estimate/runAiEstimateParameterRuntimeMatrix";

describe("AI estimate parameter runtime matrix", () => {
  it("recalculates editable parameters across random, critical, infrastructure, repair and foreman cases", () => {
    const { summary } = runAiEstimateParameterRuntimeMatrix();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY);
    expect(summary.random_parameter_cases_passed).toBe("500/500");
    expect(summary.critical_parameter_cases_passed).toBe("100/100");
    expect(summary.infrastructure_parameter_cases_passed).toBe("50/50");
    expect(summary.repair_parameter_cases_passed).toBe("50/50");
    expect(summary.foreman_parameter_cases_passed).toBe("50/50");
    expect(summary.affected_rows_change_after_parameter_edit).toBe(true);
    expect(summary.failures).toEqual([]);
  }, 300_000);
});
