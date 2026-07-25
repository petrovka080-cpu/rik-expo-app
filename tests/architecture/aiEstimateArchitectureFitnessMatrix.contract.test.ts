import {
  GREEN_AI_ESTIMATE_ARCHITECTURE_FITNESS_MATRIX,
  runAiEstimateArchitectureFitnessMatrix,
} from "../../scripts/architecture/runAiEstimateArchitectureFitnessMatrix";

jest.setTimeout(180_000);

describe("AI estimate architecture fitness matrix", () => {
  it("runs runtime, passport, revision, artifact, and history checks across the scaled corpus", () => {
    const result = runAiEstimateArchitectureFitnessMatrix();

    if (result.final_status !== GREEN_AI_ESTIMATE_ARCHITECTURE_FITNESS_MATRIX) {
      throw new Error(`architecture_fitness_matrix_failed:${JSON.stringify(result)}`);
    }
    expect(result.final_status).toBe(GREEN_AI_ESTIMATE_ARCHITECTURE_FITNESS_MATRIX);
    expect(result.random_cases_passed).toBe("1000/1000");
    expect(result.critical_cases_passed).toBe("200/200");
    expect(result.infrastructure_cases_passed).toBe("100/100");
    expect(result.repair_cases_passed).toBe("100/100");
    expect(result.foreman_cases_passed).toBe("100/100");
  });
});
