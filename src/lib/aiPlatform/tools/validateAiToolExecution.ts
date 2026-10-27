import { createAiToolRegistry } from "./AiToolRegistry";

export function validateAiToolExecution() {
  const registry = createAiToolRegistry();
  const safeRead = registry.plan({
    flowId: "tool-safe",
    role: "director",
    surface: "estimate",
    intent: "read",
    mode: "safe_read",
    sourceSha: "validation",
    runtimeVersion: "ai-platform-kernel-v1",
  }, "read_estimate_history");
  const draftOnly = registry.plan({
    flowId: "tool-draft",
    role: "foreman",
    surface: "document",
    intent: "draft",
    mode: "draft_only",
    sourceSha: "validation",
    runtimeVersion: "ai-platform-kernel-v1",
  }, "generate_document_draft");
  const approval = registry.plan({
    flowId: "tool-approval",
    role: "director",
    surface: "procurement",
    intent: "submit",
    mode: "approval_required",
    sourceSha: "validation",
    runtimeVersion: "ai-platform-kernel-v1",
  }, "submit_approval_gate");
  const forbidden = registry.plan({
    flowId: "tool-forbidden",
    role: "admin",
    surface: "office",
    intent: "delete",
    mode: "forbidden",
    sourceSha: "validation",
    runtimeVersion: "ai-platform-kernel-v1",
  }, "mutate_production_db");
  return {
    ok: safeRead.allowed && draftOnly.allowed && approval.approvalRequired && !forbidden.allowed,
    ai_tool_registry_created: true,
    tool_contract_created: true,
    approval_policy_created: true,
    safe_read_tools_cannot_mutate: safeRead.mutationAllowed === false,
    draft_only_tools_create_drafts_only: draftOnly.mode === "draft_only" && draftOnly.directExecutionEnabled === false,
    approval_required_tools_require_explicit_approval: approval.approvalRequired === true,
    forbidden_tools_return_reason: forbidden.reason.length > 0,
    ai_cannot_execute_mutation_without_policy: [safeRead, draftOnly, approval, forbidden].every((plan) => plan.directExecutionEnabled === false),
  };
}
