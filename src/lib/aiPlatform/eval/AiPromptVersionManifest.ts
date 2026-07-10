import { AI_RUNTIME_KERNEL_VERSION } from "../kernel/AiRuntimeKernelContract";

export type AiPromptVersionManifest = {
  prompt_version: string;
  runtime_version: string;
  tool_policy_version: string;
  redaction_policy_version: string;
  context_budget_version: string;
  source_sha: string;
};

export function createAiPromptVersionManifest(sourceSha: string): AiPromptVersionManifest {
  return {
    prompt_version: "ai-platform-evalops-prompt-v1",
    runtime_version: AI_RUNTIME_KERNEL_VERSION,
    tool_policy_version: "ai-platform-tool-policy-v1",
    redaction_policy_version: "ai-platform-context-redaction-v1",
    context_budget_version: "ai-platform-context-budget-v1",
    source_sha: sourceSha,
  };
}
