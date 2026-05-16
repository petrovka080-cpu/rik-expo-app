import type {
  AiRuntimeTransportContract,
  AiRuntimeTransportName,
} from "../tools/transport/aiToolTransportTypes";

export type AgentRuntimeTransportMatcher =
  | {
      kind: "prefix";
      value: string;
    }
  | {
      kind: "includes";
      value: string;
    };

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
    | "procurement_copilot"
    | "screen_runtime"
    | "task_stream"
    | "command_center_fallback";
  runtimeName: AiRuntimeTransportName;
  expectedBoundary: AiRuntimeTransportContract["boundary"];
  matchers: readonly AgentRuntimeTransportMatcher[];
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
    matchers: [{ kind: "includes", value: "execute_approved" }],
    fallback: false,
  },
  {
    entryId: "approval_inbox",
    runtimeName: "approval_inbox",
    expectedBoundary: "approval_ledger_transport",
    matchers: [
      { kind: "prefix", value: "agent.approval_inbox." },
      { kind: "prefix", value: "agent.action." },
    ],
    fallback: false,
  },
  {
    entryId: "external_intel",
    runtimeName: "external_intel",
    expectedBoundary: "runtime_read_transport",
    matchers: [
      { kind: "prefix", value: "agent.external_intel." },
      { kind: "prefix", value: "agent.intel." },
    ],
    fallback: false,
  },
  {
    entryId: "document_knowledge",
    runtimeName: "document_knowledge",
    expectedBoundary: "runtime_preview_transport",
    matchers: [{ kind: "prefix", value: "agent.documents." }],
    fallback: false,
  },
  {
    entryId: "construction_knowhow",
    runtimeName: "construction_knowhow",
    expectedBoundary: "runtime_preview_transport",
    matchers: [{ kind: "prefix", value: "agent.construction_knowhow." }],
    fallback: false,
  },
  {
    entryId: "finance_copilot",
    runtimeName: "finance_copilot",
    expectedBoundary: "runtime_preview_transport",
    matchers: [{ kind: "prefix", value: "agent.finance." }],
    fallback: false,
  },
  {
    entryId: "warehouse_copilot",
    runtimeName: "warehouse_copilot",
    expectedBoundary: "runtime_preview_transport",
    matchers: [{ kind: "prefix", value: "agent.warehouse." }],
    fallback: false,
  },
  {
    entryId: "field_work_copilot",
    runtimeName: "field_work_copilot",
    expectedBoundary: "runtime_preview_transport",
    matchers: [{ kind: "prefix", value: "agent.field." }],
    fallback: false,
  },
  {
    entryId: "procurement_copilot",
    runtimeName: "procurement_copilot",
    expectedBoundary: "runtime_preview_transport",
    matchers: [{ kind: "prefix", value: "agent.procurement." }],
    fallback: false,
  },
  {
    entryId: "screen_runtime",
    runtimeName: "screen_runtime",
    expectedBoundary: "runtime_read_transport",
    matchers: [
      { kind: "prefix", value: "agent.screen_runtime." },
      { kind: "prefix", value: "agent.screen_actions." },
      { kind: "prefix", value: "agent.screen_assistant." },
      { kind: "prefix", value: "agent.app_graph." },
    ],
    fallback: false,
  },
  {
    entryId: "task_stream",
    runtimeName: "task_stream",
    expectedBoundary: "runtime_read_transport",
    matchers: [
      { kind: "prefix", value: "agent.task_stream." },
      { kind: "prefix", value: "agent.workday." },
    ],
    fallback: false,
  },
  {
    entryId: "command_center_fallback",
    runtimeName: "command_center",
    expectedBoundary: "runtime_read_transport",
    matchers: [],
    fallback: true,
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

function matcherApplies(operation: string, matcher: AgentRuntimeTransportMatcher): boolean {
  if (matcher.kind === "prefix") return operation.startsWith(matcher.value);
  return operation.includes(matcher.value);
}

export function listAgentRuntimeTransportRegistryEntries(): AgentRuntimeTransportRegistryEntry[] {
  return [...AGENT_RUNTIME_TRANSPORT_REGISTRY];
}

export function getAgentRuntimeTransportRegistryEntry(
  operation: string,
): AgentRuntimeTransportRegistryEntry {
  const explicitEntry = AGENT_RUNTIME_TRANSPORT_REGISTRY.find(
    (entry) => !entry.fallback && entry.matchers.some((matcher) => matcherApplies(operation, matcher)),
  );
  if (explicitEntry) return explicitEntry;

  const fallbackEntry = AGENT_RUNTIME_TRANSPORT_REGISTRY.find((entry) => entry.fallback);
  if (!fallbackEntry) {
    throw new Error("Agent runtime transport fallback is not registered");
  }
  return fallbackEntry;
}

export function resolveAgentRuntimeTransportName(operation: string): AiRuntimeTransportName {
  return getAgentRuntimeTransportRegistryEntry(operation).runtimeName;
}
