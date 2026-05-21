import {
  AI_ROLE_MIXED_150_REAL_ANSWERS_GREEN_STATUS,
  runAiRoleMixed150Evaluation,
} from "../../src/lib/ai/evaluation/goldenBusinessDataset";

describe("S_AI_ROLE_MIXED_150: green matrix", () => {
  it("records enterprise-ready real-answer gates", () => {
    const { matrix } = runAiRoleMixed150Evaluation();

    expect(matrix.final_status).toBe(AI_ROLE_MIXED_150_REAL_ANSWERS_GREEN_STATUS);
    expect(matrix.golden_business_dataset_ready).toBe(true);
    expect(matrix.golden_dataset_presented_as_production_data).toBe(false);
    expect(matrix.real_answer_guard_enabled).toBe(true);
    expect(matrix.hardcoded_eval_answers_found).toBe(0);
    expect(matrix.dangerous_mutations_found).toBe(0);
    expect(matrix.approval_bypass_found).toBe(0);
    expect(matrix.blockers).toEqual([]);
  });
});
