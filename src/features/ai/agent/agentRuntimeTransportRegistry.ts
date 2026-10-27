import type {
  AiRuntimeTransportContract,
  AiRuntimeTransportName,
} from "../tools/transport/aiToolTransportTypes";
import type { AgentBffRouteOperation } from "./agentBffRouteShell";

export type AgentRuntimeTransportRegistryEntry = {
  entryId:
    | "approved_executor"
    | "approval_inbox"
    | "external_intel"
    | "document_knowledge"
    | "construction_knowhow"
    | "finance_copilot"
    | "warehouse_copilot"
    | "field_work_copilot"
    | "tool_registry"
    | "procurement_copilot"
    | "screen_runtime"
    | "task_stream";
  runtimeName: AiRuntimeTransportName;
  expectedBoundary: AiRuntimeTransportContract["boundary"];
  operations: readonly AgentBffRouteOperation[];
  fallback: boolean;
};

export type AiExplicitDomainRuntimeTransportGroup = {
  domain: "documents" | "construction_knowhow" | "finance" | "warehouse" | "field";
  operationPrefix: string;
  expectedRuntimeName: AiRuntimeTransportName;
  expectedBoundary: AiRuntimeTransportContract["boundary"];
  minRouteCount: number;
};

export const AGENT_RUNTIME_TRANSPORT_REGISTRY = Object.freeze([
  {
    entryId: "approved_executor",
    runtimeName: "approved_executor",
    expectedBoundary: "approved_executor_transport",
    operations: [
      "agent.approval_inbox.execute_approved",
      "agent.action.execute_approved",
    ],
    fallback: false,
  },
  {
    entryId: "approval_inbox",
    runtimeName: "approval_inbox",
    expectedBoundary: "approval_ledger_transport",
    operations: [
      "agent.approval_inbox.read",
      "agent.approval_inbox.detail",
      "agent.approval_inbox.approve",
      "agent.approval_inbox.reject",
      "agent.approval_inbox.edit_preview",
      "agent.action.submit_for_approval",
      "agent.action.status",
      "agent.action.approve",
      "agent.action.reject",
      "agent.action.execution_status",
    ],
    fallback: false,
  },
  {
    entryId: "external_intel",
    runtimeName: "external_intel",
    expectedBoundary: "runtime_read_transport",
    operations: [
      "agent.external_intel.sources.read",
      "agent.external_intel.search.preview",
      "agent.external_intel.cited_search.preview",
      "agent.intel.compare",
    ],
    fallback: false,
  },
  {
    entryId: "document_knowledge",
    runtimeName: "document_knowledge",
    expectedBoundary: "runtime_preview_transport",
    operations: [
      "agent.documents.knowledge.read",
      "agent.documents.search.preview",
      "agent.documents.summarize.preview",
    ],
    fallback: false,
  },
  {
    entryId: "construction_knowhow",
    runtimeName: "construction_knowhow",
    expectedBoundary: "runtime_preview_transport",
    operations: [
      "agent.construction_knowhow.domains.read",
      "agent.construction_knowhow.role_profile.read",
      "agent.construction_knowhow.analyze.preview",
      "agent.construction_knowhow.decision_card.preview",
      "agent.construction_knowhow.action_plan.preview",
      "agent.construction_knowhow.external_preview",
    ],
    fallback: false,
  },
  {
    entryId: "finance_copilot",
    runtimeName: "finance_copilot",
    expectedBoundary: "runtime_preview_transport",
    operations: [
      "agent.finance.summary.read",
      "agent.finance.debts.read",
      "agent.finance.risk_preview",
      "agent.finance.draft_summary",
    ],
    fallback: false,
  },
  {
    entryId: "warehouse_copilot",
    runtimeName: "warehouse_copilot",
    expectedBoundary: "runtime_preview_transport",
    operations: [
      "agent.warehouse.status.read",
      "agent.warehouse.movements.read",
      "agent.warehouse.risk_preview",
      "agent.warehouse.draft_action",
    ],
    fallback: false,
  },
  {
    entryId: "field_work_copilot",
    runtimeName: "field_work_copilot",
    expectedBoundary: "runtime_preview_transport",
    operations: [
      "agent.field.context.read",
      "agent.field.draft_report",
      "agent.field.draft_act",
      "agent.field.action_plan",
    ],
    fallback: false,
  },
  {
    entryId: "tool_registry",
    runtimeName: "tool_registry",
    expectedBoundary: "runtime_read_transport",
    operations: [
      "agent.tools.list",
      "agent.tools.validate",
      "agent.tools.preview",
    ],
    fallback: false,
  },
  {
    entryId: "procurement_copilot",
    runtimeName: "procurement_copilot",
    expectedBoundary: "runtime_preview_transport",
    operations: [
      "agent.procurement.request_context.read",
      "agent.procurement.request_understanding.read",
      "agent.procurement.internal_supplier_rank.preview",
      "agent.procurement.decision_card.preview",
      "agent.procurement.supplier_match.preview",
      "agent.procurement.external_supplier_candidates.preview",
      "agent.procurement.external_supplier.preview",
      "agent.procurement.draft_request.preview",
      "agent.procurement.draft_request.internal_first_preview",
      "agent.procurement.submit_for_approval",
      "agent.procurement.live_supplier_chain.preview",
      "agent.procurement.live_supplier_chain.draft",
      "agent.procurement.live_supplier_chain.submit_for_approval",
      "agent.procurement.copilot.context.read",
      "agent.procurement.copilot.plan.preview",
      "agent.procurement.copilot.draft_preview",
      "agent.procurement.copilot.submit_for_approval.preview",
    ],
    fallback: false,
  },
  {
    entryId: "screen_runtime",
    runtimeName: "screen_runtime",
    expectedBoundary: "runtime_read_transport",
    operations: [
      "agent.screen_runtime.read",
      "agent.screen_runtime.intent_preview",
      "agent.screen_runtime.action_plan",
      "agent.screen_actions.read",
      "agent.screen_actions.intent_preview",
      "agent.screen_actions.action_plan",
      "agent.screen_assistant.context.read",
      "agent.screen_assistant.ask.preview",
      "agent.screen_assistant.action_plan",
      "agent.screen_assistant.draft_preview",
      "agent.screen_assistant.submit_for_approval.preview",
      "agent.app_graph.screen.read",
      "agent.app_graph.action.read",
      "agent.app_graph.resolve",
    ],
    fallback: false,
  },
  {
    entryId: "task_stream",
    runtimeName: "task_stream",
    expectedBoundary: "runtime_read_transport",
    operations: [
      "agent.task_stream.read",
      "agent.workday.tasks.read",
      "agent.workday.tasks.preview",
      "agent.workday.tasks.action_plan",
      "agent.workday.live_evidence.read",
    ],
    fallback: false,
  },
] as const satisfies readonly AgentRuntimeTransportRegistryEntry[]);

export const AI_EXPLICIT_DOMAIN_RUNTIME_TRANSPORT_GROUPS = Object.freeze([
  {
    domain: "documents",
    operationPrefix: "agent.documents.",
    expectedRuntimeName: "document_knowledge",
    expectedBoundary: "runtime_preview_transport",
    minRouteCount: 3,
  },
  {
    domain: "construction_knowhow",
    operationPrefix: "agent.construction_knowhow.",
    expectedRuntimeName: "construction_knowhow",
    expectedBoundary: "runtime_preview_transport",
    minRouteCount: 6,
  },
  {
    domain: "finance",
    operationPrefix: "agent.finance.",
    expectedRuntimeName: "finance_copilot",
    expectedBoundary: "runtime_preview_transport",
    minRouteCount: 4,
  },
  {
    domain: "warehouse",
    operationPrefix: "agent.warehouse.",
    expectedRuntimeName: "warehouse_copilot",
    expectedBoundary: "runtime_preview_transport",
    minRouteCount: 4,
  },
  {
    domain: "field",
    operationPrefix: "agent.field.",
    expectedRuntimeName: "field_work_copilot",
    expectedBoundary: "runtime_preview_transport",
    minRouteCount: 4,
  },
] as const satisfies readonly AiExplicitDomainRuntimeTransportGroup[]);

export function listAgentRuntimeTransportRegistryEntries(): AgentRuntimeTransportRegistryEntry[] {
  return [...AGENT_RUNTIME_TRANSPORT_REGISTRY];
}

export function getAgentRuntimeTransportRegistryEntry(
  operation: string,
): AgentRuntimeTransportRegistryEntry {
  const explicitEntry = AGENT_RUNTIME_TRANSPORT_REGISTRY.find(
    (entry) =>
      !entry.fallback &&
      entry.operations.some((registeredOperation) => registeredOperation === operation),
  );
  if (explicitEntry) return explicitEntry;

  throw new Error(`Agent runtime transport is not registered: ${operation}`);
}

export function resolveAgentRuntimeTransportName(operation: string): AiRuntimeTransportName {
  return getAgentRuntimeTransportRegistryEntry(operation).runtimeName;
}
