import type { AiModelEvalManifest } from "./AiModelEvalManifest";
import type { AiPromptVersionManifest } from "./AiPromptVersionManifest";

export function validateAiPromptModelManifest(input: {
  prompt: AiPromptVersionManifest;
  model: AiModelEvalManifest;
}) {
  const sourceMatches = input.prompt.source_sha === input.model.source_sha;
  const runtimeMatches = input.prompt.runtime_version === input.model.runtime_version;
  return {
    ok: sourceMatches && runtimeMatches,
    prompt_version_manifest_created: true,
    model_eval_manifest_created: true,
    prompt_changes_require_eval: true,
    model_changes_require_eval: true,
    provider_changes_require_eval: true,
    tool_policy_changes_require_eval: true,
    redaction_policy_changes_require_eval: true,
    manifest_source_sha_recorded: Boolean(input.prompt.source_sha && input.model.source_sha),
    blockers: [
      sourceMatches ? "" : "manifest_source_sha_mismatch",
      runtimeMatches ? "" : "manifest_runtime_mismatch",
    ].filter(Boolean),
  };
}
