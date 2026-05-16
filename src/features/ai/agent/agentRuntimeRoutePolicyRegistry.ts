import type {
  AgentBffRouteDefinition,
  AgentBffRouteOperation,
} from "./agentBffRouteShell";

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
  approvedGatewayRequired: boolean;
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
    approvedGatewayRequired: routeClass === "approved_executor",
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

function readOnlyAgentBffRoute(
  operation: AgentBffRouteOperation,
  method: AgentBffRouteDefinition["method"],
  endpoint: AgentBffRouteDefinition["endpoint"],
  responseEnvelope: AgentBffRouteDefinition["responseEnvelope"],
): AgentBffRouteDefinition {
  return {
    operation,
    method,
    endpoint,
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope,
  };
}

export const AGENT_BFF_ROUTE_DEFINITIONS = Object.freeze([
  readOnlyAgentBffRoute("agent.approval_inbox.read", "GET", "GET /agent/approval-inbox", "AgentApprovalInboxEnvelope"),
  readOnlyAgentBffRoute("agent.approval_inbox.detail", "GET", "GET /agent/approval-inbox/:actionId", "AgentApprovalInboxEnvelope"),
  readOnlyAgentBffRoute("agent.approval_inbox.approve", "POST", "POST /agent/approval-inbox/:actionId/approve", "AgentApprovalInboxEnvelope"),
  readOnlyAgentBffRoute("agent.approval_inbox.reject", "POST", "POST /agent/approval-inbox/:actionId/reject", "AgentApprovalInboxEnvelope"),
  readOnlyAgentBffRoute("agent.approval_inbox.edit_preview", "POST", "POST /agent/approval-inbox/:actionId/edit-preview", "AgentApprovalInboxEnvelope"),
  readOnlyAgentBffRoute("agent.approval_inbox.execute_approved", "POST", "POST /agent/approval-inbox/:actionId/execute-approved", "AgentApprovalInboxEnvelope"),
  readOnlyAgentBffRoute("agent.action.submit_for_approval", "POST", "POST /agent/action/submit-for-approval", "AgentActionLedgerEnvelope"),
  readOnlyAgentBffRoute("agent.action.status", "GET", "GET /agent/action/:actionId/status", "AgentActionLedgerEnvelope"),
  readOnlyAgentBffRoute("agent.action.approve", "POST", "POST /agent/action/:actionId/approve", "AgentActionLedgerEnvelope"),
  readOnlyAgentBffRoute("agent.action.reject", "POST", "POST /agent/action/:actionId/reject", "AgentActionLedgerEnvelope"),
  readOnlyAgentBffRoute("agent.action.execute_approved", "POST", "POST /agent/action/:actionId/execute-approved", "AgentActionLedgerEnvelope"),
  readOnlyAgentBffRoute("agent.action.execution_status", "GET", "GET /agent/action/:actionId/execution-status", "AgentActionLedgerEnvelope"),
  readOnlyAgentBffRoute("agent.screen_runtime.read", "GET", "GET /agent/screen-runtime/:screenId", "AgentScreenRuntimeEnvelope"),
  readOnlyAgentBffRoute("agent.screen_runtime.intent_preview", "POST", "POST /agent/screen-runtime/:screenId/intent-preview", "AgentScreenRuntimeEnvelope"),
  readOnlyAgentBffRoute("agent.screen_runtime.action_plan", "POST", "POST /agent/screen-runtime/:screenId/action-plan", "AgentScreenRuntimeEnvelope"),
  readOnlyAgentBffRoute("agent.screen_actions.read", "GET", "GET /agent/screen-actions/:screenId", "AgentScreenActionEnvelope"),
  readOnlyAgentBffRoute("agent.screen_actions.intent_preview", "POST", "POST /agent/screen-actions/:screenId/intent-preview", "AgentScreenActionEnvelope"),
  readOnlyAgentBffRoute("agent.screen_actions.action_plan", "POST", "POST /agent/screen-actions/:screenId/action-plan", "AgentScreenActionEnvelope"),
  readOnlyAgentBffRoute("agent.screen_assistant.context.read", "GET", "GET /agent/screen-assistant/:screenId/context", "AgentScreenAssistantEnvelope"),
  readOnlyAgentBffRoute("agent.screen_assistant.ask.preview", "POST", "POST /agent/screen-assistant/:screenId/ask", "AgentScreenAssistantEnvelope"),
  readOnlyAgentBffRoute("agent.screen_assistant.action_plan", "POST", "POST /agent/screen-assistant/:screenId/action-plan", "AgentScreenAssistantEnvelope"),
  readOnlyAgentBffRoute("agent.screen_assistant.draft_preview", "POST", "POST /agent/screen-assistant/:screenId/draft-preview", "AgentScreenAssistantEnvelope"),
  readOnlyAgentBffRoute("agent.screen_assistant.submit_for_approval.preview", "POST", "POST /agent/screen-assistant/:screenId/submit-for-approval-preview", "AgentScreenAssistantEnvelope"),
  readOnlyAgentBffRoute("agent.external_intel.sources.read", "GET", "GET /agent/external-intel/sources", "AgentExternalIntelEnvelope"),
  readOnlyAgentBffRoute("agent.external_intel.search.preview", "POST", "POST /agent/external-intel/search/preview", "AgentExternalIntelEnvelope"),
  readOnlyAgentBffRoute("agent.external_intel.cited_search.preview", "POST", "POST /agent/external-intel/cited-search-preview", "AgentExternalIntelEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.request_context.read", "GET", "GET /agent/procurement/request-context/:requestId", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.request_understanding.read", "GET", "GET /agent/procurement/request-understanding/:requestId", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.internal_supplier_rank.preview", "POST", "POST /agent/procurement/internal-supplier-rank", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.decision_card.preview", "POST", "POST /agent/procurement/decision-card", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.supplier_match.preview", "POST", "POST /agent/procurement/supplier-match/preview", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.external_supplier_candidates.preview", "POST", "POST /agent/procurement/external-supplier-candidates/preview", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.external_supplier.preview", "POST", "POST /agent/procurement/external-supplier-preview", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.draft_request.preview", "POST", "POST /agent/procurement/draft-request/preview", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.draft_request.internal_first_preview", "POST", "POST /agent/procurement/draft-request-preview", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.submit_for_approval", "POST", "POST /agent/procurement/submit-for-approval", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.live_supplier_chain.preview", "POST", "POST /agent/procurement/live-supplier-chain/preview", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.live_supplier_chain.draft", "POST", "POST /agent/procurement/live-supplier-chain/draft", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.live_supplier_chain.submit_for_approval", "POST", "POST /agent/procurement/live-supplier-chain/submit-for-approval", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.copilot.context.read", "GET", "GET /agent/procurement/copilot/context", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.copilot.plan.preview", "POST", "POST /agent/procurement/copilot/plan", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.copilot.draft_preview", "POST", "POST /agent/procurement/copilot/draft-preview", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.procurement.copilot.submit_for_approval.preview", "POST", "POST /agent/procurement/copilot/submit-for-approval-preview", "AgentProcurementEnvelope"),
  readOnlyAgentBffRoute("agent.app_graph.screen.read", "GET", "GET /agent/app-graph/screen/:screenId", "AgentAppGraphEnvelope"),
  readOnlyAgentBffRoute("agent.app_graph.action.read", "GET", "GET /agent/app-graph/action/:buttonId", "AgentAppGraphEnvelope"),
  readOnlyAgentBffRoute("agent.app_graph.resolve", "POST", "POST /agent/app-graph/resolve", "AgentAppGraphEnvelope"),
  readOnlyAgentBffRoute("agent.intel.compare", "POST", "POST /agent/intel/compare", "AgentIntelCompareEnvelope"),
  readOnlyAgentBffRoute("agent.task_stream.read", "GET", "GET /agent/task-stream", "AgentTaskStreamEnvelope"),
  readOnlyAgentBffRoute("agent.workday.tasks.read", "GET", "GET /agent/workday/tasks", "AgentWorkdayTaskEnvelope"),
  readOnlyAgentBffRoute("agent.workday.tasks.preview", "POST", "POST /agent/workday/tasks/:taskId/preview", "AgentWorkdayTaskEnvelope"),
  readOnlyAgentBffRoute("agent.workday.tasks.action_plan", "POST", "POST /agent/workday/tasks/:taskId/action-plan", "AgentWorkdayTaskEnvelope"),
  readOnlyAgentBffRoute("agent.workday.live_evidence.read", "GET", "GET /agent/workday/live-evidence-tasks", "AgentWorkdayLiveEvidenceEnvelope"),
  readOnlyAgentBffRoute("agent.documents.knowledge.read", "GET", "GET /agent/documents/knowledge", "AgentDocumentKnowledgeEnvelope"),
  readOnlyAgentBffRoute("agent.documents.search.preview", "POST", "POST /agent/documents/search", "AgentDocumentKnowledgeEnvelope"),
  readOnlyAgentBffRoute("agent.documents.summarize.preview", "POST", "POST /agent/documents/summarize-preview", "AgentDocumentKnowledgeEnvelope"),
  readOnlyAgentBffRoute("agent.construction_knowhow.domains.read", "GET", "GET /agent/construction-knowhow/domains", "AgentConstructionKnowhowEnvelope"),
  readOnlyAgentBffRoute("agent.construction_knowhow.role_profile.read", "GET", "GET /agent/construction-knowhow/role-profile/:roleId", "AgentConstructionKnowhowEnvelope"),
  readOnlyAgentBffRoute("agent.construction_knowhow.analyze.preview", "POST", "POST /agent/construction-knowhow/analyze", "AgentConstructionKnowhowEnvelope"),
  readOnlyAgentBffRoute("agent.construction_knowhow.decision_card.preview", "POST", "POST /agent/construction-knowhow/decision-card", "AgentConstructionKnowhowEnvelope"),
  readOnlyAgentBffRoute("agent.construction_knowhow.action_plan.preview", "POST", "POST /agent/construction-knowhow/action-plan", "AgentConstructionKnowhowEnvelope"),
  readOnlyAgentBffRoute("agent.construction_knowhow.external_preview", "POST", "POST /agent/construction-knowhow/external-preview", "AgentConstructionKnowhowEnvelope"),
  readOnlyAgentBffRoute("agent.finance.summary.read", "GET", "GET /agent/finance/summary", "AgentFinanceCopilotEnvelope"),
  readOnlyAgentBffRoute("agent.finance.debts.read", "GET", "GET /agent/finance/debts", "AgentFinanceCopilotEnvelope"),
  readOnlyAgentBffRoute("agent.finance.risk_preview", "POST", "POST /agent/finance/risk-preview", "AgentFinanceCopilotEnvelope"),
  readOnlyAgentBffRoute("agent.finance.draft_summary", "POST", "POST /agent/finance/draft-summary", "AgentFinanceCopilotEnvelope"),
  readOnlyAgentBffRoute("agent.warehouse.status.read", "GET", "GET /agent/warehouse/status", "AgentWarehouseCopilotEnvelope"),
  readOnlyAgentBffRoute("agent.warehouse.movements.read", "GET", "GET /agent/warehouse/movements", "AgentWarehouseCopilotEnvelope"),
  readOnlyAgentBffRoute("agent.warehouse.risk_preview", "POST", "POST /agent/warehouse/risk-preview", "AgentWarehouseCopilotEnvelope"),
  readOnlyAgentBffRoute("agent.warehouse.draft_action", "POST", "POST /agent/warehouse/draft-action", "AgentWarehouseCopilotEnvelope"),
  readOnlyAgentBffRoute("agent.field.context.read", "GET", "GET /agent/field/context", "AgentFieldWorkCopilotEnvelope"),
  readOnlyAgentBffRoute("agent.field.draft_report", "POST", "POST /agent/field/draft-report", "AgentFieldWorkCopilotEnvelope"),
  readOnlyAgentBffRoute("agent.field.draft_act", "POST", "POST /agent/field/draft-act", "AgentFieldWorkCopilotEnvelope"),
  readOnlyAgentBffRoute("agent.field.action_plan", "POST", "POST /agent/field/action-plan", "AgentFieldWorkCopilotEnvelope"),
  readOnlyAgentBffRoute("agent.tools.list", "GET", "GET /agent/tools", "AgentBffRouteShellEnvelope"),
  readOnlyAgentBffRoute("agent.tools.validate", "POST", "POST /agent/tools/:name/validate", "AgentBffRouteShellEnvelope"),
  readOnlyAgentBffRoute("agent.tools.preview", "POST", "POST /agent/tools/:name/preview", "AgentBffRouteShellEnvelope"),
] as const satisfies readonly AgentBffRouteDefinition[]);
