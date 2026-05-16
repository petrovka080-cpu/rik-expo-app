import type { AgentBffRouteOperation } from "./agentBffRouteShell";

export type AgentRuntimeRouteClass =
  | "read"
  | "preview"
  | "draft"
  | "approval_ledger"
  | "approved_executor"
  | "tool_registry";

export type AgentRuntimeEvidencePolicy =
  | "required"
  | "optional_or_blocked_reason";

export type AgentRuntimeRoutePolicyRegistryEntry = {
  operation: AgentBffRouteOperation;
  routeClass: AgentRuntimeRouteClass;
  idempotencyRequired: boolean;
  auditRequired: boolean;
  evidencePolicy: AgentRuntimeEvidencePolicy;
  policySource: "explicit_route_policy_registry";
  mutationCount: 0;
  dbWrites: 0;
  providerCalls: false;
  directExecutionWithoutApproval: false;
};

function policy(
  operation: AgentBffRouteOperation,
  routeClass: AgentRuntimeRouteClass,
  idempotencyRequired: boolean,
  auditRequired: boolean,
  evidencePolicy: AgentRuntimeEvidencePolicy = "required",
): AgentRuntimeRoutePolicyRegistryEntry {
  return {
    operation,
    routeClass,
    idempotencyRequired,
    auditRequired,
    evidencePolicy,
    policySource: "explicit_route_policy_registry",
    mutationCount: 0,
    dbWrites: 0,
    providerCalls: false,
    directExecutionWithoutApproval: false,
  };
}

export const AGENT_RUNTIME_ROUTE_POLICY_REGISTRY = Object.freeze([
  policy("agent.approval_inbox.read", "approval_ledger", false, true),
  policy("agent.approval_inbox.detail", "approval_ledger", false, true),
  policy("agent.approval_inbox.approve", "approval_ledger", false, true),
  policy("agent.approval_inbox.reject", "approval_ledger", false, true),
  policy("agent.approval_inbox.edit_preview", "approval_ledger", false, true),
  policy("agent.approval_inbox.execute_approved", "approved_executor", true, true),
  policy("agent.action.submit_for_approval", "approval_ledger", true, true),
  policy("agent.action.status", "approval_ledger", false, true),
  policy("agent.action.approve", "approval_ledger", false, true),
  policy("agent.action.reject", "approval_ledger", false, true),
  policy("agent.action.execute_approved", "approved_executor", true, true),
  policy("agent.action.execution_status", "approval_ledger", false, true),
  policy("agent.screen_runtime.read", "read", false, false),
  policy("agent.screen_runtime.intent_preview", "preview", false, false),
  policy("agent.screen_runtime.action_plan", "preview", false, false),
  policy("agent.screen_actions.read", "read", false, false),
  policy("agent.screen_actions.intent_preview", "preview", false, false),
  policy("agent.screen_actions.action_plan", "preview", false, false),
  policy("agent.screen_assistant.context.read", "read", false, false),
  policy("agent.screen_assistant.ask.preview", "preview", false, false),
  policy("agent.screen_assistant.action_plan", "preview", false, false),
  policy("agent.screen_assistant.draft_preview", "draft", false, true),
  policy("agent.screen_assistant.submit_for_approval.preview", "preview", true, true),
  policy("agent.external_intel.sources.read", "read", false, false),
  policy("agent.external_intel.search.preview", "preview", false, false),
  policy("agent.external_intel.cited_search.preview", "preview", false, false),
  policy("agent.procurement.request_context.read", "read", false, false),
  policy("agent.procurement.request_understanding.read", "read", false, false),
  policy("agent.procurement.internal_supplier_rank.preview", "preview", false, false),
  policy("agent.procurement.decision_card.preview", "preview", false, false),
  policy("agent.procurement.supplier_match.preview", "preview", false, false),
  policy("agent.procurement.external_supplier_candidates.preview", "preview", false, false),
  policy("agent.procurement.external_supplier.preview", "preview", false, false),
  policy("agent.procurement.draft_request.preview", "draft", false, true),
  policy("agent.procurement.draft_request.internal_first_preview", "draft", false, true),
  policy("agent.procurement.submit_for_approval", "approval_ledger", true, true),
  policy("agent.procurement.live_supplier_chain.preview", "preview", false, false),
  policy("agent.procurement.live_supplier_chain.draft", "draft", false, true),
  policy("agent.procurement.live_supplier_chain.submit_for_approval", "approval_ledger", true, true),
  policy("agent.procurement.copilot.context.read", "read", false, false),
  policy("agent.procurement.copilot.plan.preview", "preview", false, false),
  policy("agent.procurement.copilot.draft_preview", "draft", false, true),
  policy("agent.procurement.copilot.submit_for_approval.preview", "preview", true, true),
  policy("agent.app_graph.screen.read", "read", false, false),
  policy("agent.app_graph.action.read", "read", false, false),
  policy("agent.app_graph.resolve", "read", false, false),
  policy("agent.intel.compare", "preview", false, false),
  policy("agent.task_stream.read", "read", false, false),
  policy("agent.workday.tasks.read", "read", false, false),
  policy("agent.workday.tasks.preview", "preview", false, false),
  policy("agent.workday.tasks.action_plan", "preview", false, false),
  policy("agent.workday.live_evidence.read", "read", false, false),
  policy("agent.documents.knowledge.read", "read", false, false),
  policy("agent.documents.search.preview", "preview", false, false),
  policy("agent.documents.summarize.preview", "preview", false, false),
  policy("agent.construction_knowhow.domains.read", "read", false, false),
  policy("agent.construction_knowhow.role_profile.read", "read", false, false),
  policy("agent.construction_knowhow.analyze.preview", "preview", false, false),
  policy("agent.construction_knowhow.decision_card.preview", "preview", false, false),
  policy("agent.construction_knowhow.action_plan.preview", "preview", false, false),
  policy("agent.construction_knowhow.external_preview", "preview", false, false),
  policy("agent.finance.summary.read", "read", false, false),
  policy("agent.finance.debts.read", "read", false, false),
  policy("agent.finance.risk_preview", "preview", false, false),
  policy("agent.finance.draft_summary", "draft", false, true),
  policy("agent.warehouse.status.read", "read", false, false),
  policy("agent.warehouse.movements.read", "read", false, false),
  policy("agent.warehouse.risk_preview", "preview", false, false),
  policy("agent.warehouse.draft_action", "draft", false, true),
  policy("agent.field.context.read", "read", false, false),
  policy("agent.field.draft_report", "draft", false, true),
  policy("agent.field.draft_act", "draft", false, true),
  policy("agent.field.action_plan", "preview", false, false),
  policy("agent.tools.list", "tool_registry", false, false, "optional_or_blocked_reason"),
  policy("agent.tools.validate", "tool_registry", false, false, "optional_or_blocked_reason"),
  policy("agent.tools.preview", "tool_registry", false, false, "optional_or_blocked_reason"),
] as const satisfies readonly AgentRuntimeRoutePolicyRegistryEntry[]);

export function listAgentRuntimeRoutePolicyRegistryEntries(): AgentRuntimeRoutePolicyRegistryEntry[] {
  return [...AGENT_RUNTIME_ROUTE_POLICY_REGISTRY];
}

export function getAgentRuntimeRoutePolicyRegistryEntry(
  operation: AgentBffRouteOperation,
): AgentRuntimeRoutePolicyRegistryEntry | null {
  return AGENT_RUNTIME_ROUTE_POLICY_REGISTRY.find((entry) => entry.operation === operation) ?? null;
}
