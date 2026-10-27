export type AiModelEvalManifest = {
  model_key: string;
  provider_key: string;
  runtime_version: string;
  source_sha: string;
};

export function createAiModelEvalManifest(input: {
  sourceSha: string;
  runtimeVersion: string;
  providerKey?: string;
  modelKey?: string;
}): AiModelEvalManifest {
  return {
    model_key: input.modelKey ?? "eval-contract-model",
    provider_key: input.providerKey ?? "eval_in_memory_provider",
    runtime_version: input.runtimeVersion,
    source_sha: input.sourceSha,
  };
}
