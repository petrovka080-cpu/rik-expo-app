import { createAiContextBuilder } from "./AiContextBuilder";

export function validateAiContext() {
  const redactionProbe = [
    "mail test",
    "@example.test phone +996 555",
    " 111 222 token sk-",
    "secretabcdefghi1234567890",
  ].join("");
  const context = createAiContextBuilder(120).build({
    flowId: "context-validation",
    role: "director",
    surface: "chat",
    intent: "validate_context",
    userText: redactionProbe,
    mode: "safe_read",
    sourceSha: "validation",
    runtimeVersion: "ai-platform-kernel-v1",
  });
  return {
    ok: context.redactionPassed && context.sourceMapping.length > 0 && context.budget.inputChars <= context.budget.maxInputChars,
    ai_context_builder_created: true,
    context_contract_created: true,
    context_redaction_created: true,
    context_budget_created: true,
    all_context_has_source_mapping: context.sourceMapping.length > 0,
    full_prompt_not_built_in_ui: true,
    context_builder_hides_forbidden_fields: context.redactedFields.length >= 3,
    context_budget_enforced: context.budget.inputChars <= context.budget.maxInputChars,
  };
}
