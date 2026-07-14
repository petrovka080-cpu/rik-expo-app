import {
  GREEN_AI_MODEL_REPLACEMENT_EVAL_PROOF,
  runAiModelReplacementEvalProof,
} from "../../scripts/aiPlatform/runAiModelReplacementEvalProof";

jest.setTimeout(60_000);

describe("AI EvalOps model replacement proof", () => {
  it("uses the same eval corpus to prove provider replacement keeps runtime contracts stable", async () => {
    const { summary } = await runAiModelReplacementEvalProof({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_MODEL_REPLACEMENT_EVAL_PROOF);
    expect(summary.model_replacement_eval_proof_created).toBe(true);
    expect(summary.same_eval_corpus_used_for_two_providers).toBe(true);
    expect(summary.provider_swap_keeps_result_contract).toBe(true);
    expect(summary.provider_swap_keeps_policy_contract).toBe(true);
    expect(summary.provider_swap_keeps_redaction_contract).toBe(true);
    expect(summary.provider_swap_does_not_change_ui_contract).toBe(true);
    expect(summary.provider_swap_does_not_create_second_engine).toBe(true);
    expect(summary.blockers).toEqual([]);
  });
});
