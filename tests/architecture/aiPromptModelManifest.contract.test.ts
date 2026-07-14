import { AI_RUNTIME_KERNEL_VERSION } from "../../src/lib/aiPlatform/kernel/AiRuntimeKernelContract";
import { createAiModelEvalManifest } from "../../src/lib/aiPlatform/eval/AiModelEvalManifest";
import { createAiPromptVersionManifest } from "../../src/lib/aiPlatform/eval/AiPromptVersionManifest";
import { validateAiPromptModelManifest } from "../../src/lib/aiPlatform/eval/validateAiPromptModelManifest";

describe("AI EvalOps prompt and model manifest", () => {
  it("binds eval quality to prompt, model, runtime and source sha", () => {
    const prompt = createAiPromptVersionManifest("source-sha-for-test");
    const model = createAiModelEvalManifest({
      sourceSha: "source-sha-for-test",
      runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
      providerKey: "eval-provider",
      modelKey: "eval-model",
    });
    const validation = validateAiPromptModelManifest({ prompt, model });

    expect(validation.ok).toBe(true);
    expect(validation.prompt_changes_require_eval).toBe(true);
    expect(validation.model_changes_require_eval).toBe(true);
    expect(validation.provider_changes_require_eval).toBe(true);
    expect(validation.tool_policy_changes_require_eval).toBe(true);
    expect(validation.redaction_policy_changes_require_eval).toBe(true);
    expect(validation.manifest_source_sha_recorded).toBe(true);
    expect(validation.blockers).toEqual([]);
  });

  it("fails closed when prompt and model manifests drift", () => {
    const validation = validateAiPromptModelManifest({
      prompt: createAiPromptVersionManifest("source-sha-a"),
      model: createAiModelEvalManifest({
        sourceSha: "source-sha-b",
        runtimeVersion: "other-runtime",
      }),
    });

    expect(validation.ok).toBe(false);
    expect(validation.blockers).toEqual([
      "manifest_source_sha_mismatch",
      "manifest_runtime_mismatch",
    ]);
  });
});
