import type { AiUserRole } from "../policy/aiRolePolicy";
import { planAiToolUse, type AiToolPlan } from "../tools/aiToolPlanPolicy";
import { AI_TOOL_REGISTRY } from "../tools/aiToolRegistry";
import type { AiToolDefinition } from "../tools/aiToolTypes";
import { getAiToolBudgetPolicy } from "../rateLimit/aiToolBudgetPolicy";
import { decideAiToolRateLimit, type AiToolRateLimitDecision } from "../rateLimit/aiToolRateLimitDecision";
import {
  AGENT_SCREEN_RUNTIME_BFF_CONTRACT,
  getAgentScreenRuntime,
  planAgentScreenRuntimeAction,
  previewAgentScreenRuntimeIntent,
  type AgentScreenRuntimeActionPlanRequest,
  type AgentScreenRuntimeIntentPreviewRequest,
  type AgentScreenRuntimeRequest,
} from "../screenRuntime/aiScreenRuntimeBff";
import {
  AGENT_SCREEN_ACTION_BFF_CONTRACT,
  getAgentScreenActions,
  planAgentScreenAction,
  previewAgentScreenActionIntent,
  type AgentScreenActionIntentPreviewRouteRequest,
  type AgentScreenActionPlanRouteRequest,
  type AgentScreenActionReadRouteRequest,
} from "./agentScreenActionRoutes";
import {
  AGENT_SCREEN_ASSISTANT_BFF_CONTRACT,
  askAgentScreenAssistant,
  getAgentScreenAssistantContext,
  planAgentScreenAssistantAction,
  previewAgentScreenAssistantDraft,
  previewAgentScreenAssistantSubmitForApproval,
  type AgentScreenAssistantActionPlanRouteRequest,
  type AgentScreenAssistantAskRouteRequest,
  type AgentScreenAssistantContextRouteRequest,
  type AgentScreenAssistantDraftPreviewRouteRequest,
  type AgentScreenAssistantEnvelope,
  type AgentScreenAssistantSubmitForApprovalPreviewRouteRequest,
} from "./agentScreenAssistantRoutes";
import {
  AGENT_WORKDAY_TASK_BFF_CONTRACT,
  getAgentWorkdayTasks,
  planAgentWorkdayTaskAction,
  previewAgentWorkdayTask,
  type AgentWorkdayTaskActionPlanRouteRequest,
  type AgentWorkdayTaskPreviewRouteRequest,
  type AgentWorkdayTaskReadRouteRequest,
} from "./agentWorkdayTaskRoutes";
import {
  AGENT_WORKDAY_LIVE_EVIDENCE_BFF_CONTRACT,
  getAgentWorkdayLiveEvidenceTasks,
  type AgentWorkdayLiveEvidenceRouteRequest,
} from "./agentWorkdayLiveEvidenceRoutes";
import {
  AGENT_DOCUMENT_KNOWLEDGE_BFF_CONTRACT,
  getAgentDocumentKnowledge,
  previewAgentDocumentSummary,
  searchAgentDocuments,
  type AgentDocumentKnowledgeEnvelope,
  type AgentDocumentKnowledgeReadRouteRequest,
  type AgentDocumentSearchRouteRequest,
  type AgentDocumentSummaryPreviewRouteRequest,
} from "./agentDocumentKnowledgeRoutes";
import {
  AGENT_CONSTRUCTION_KNOWHOW_BFF_CONTRACT,
  analyzeAgentConstructionKnowhow,
  createAgentConstructionDecisionCard,
  getAgentConstructionKnowhowDomains,
  getAgentConstructionKnowhowRoleProfile,
  planAgentConstructionKnowhowAction,
  previewAgentConstructionExternalIntel,
  type AgentConstructionKnowhowActionPlanRequest as AgentConstructionKnowhowActionPlanRouteRequest,
  type AgentConstructionKnowhowAnalyzeRequest as AgentConstructionKnowhowAnalyzeRouteRequest,
  type AgentConstructionKnowhowDecisionCardRequest as AgentConstructionKnowhowDecisionCardRouteRequest,
  type AgentConstructionKnowhowDomainsRequest as AgentConstructionKnowhowDomainsRouteRequest,
  type AgentConstructionKnowhowEnvelope,
  type AgentConstructionKnowhowExternalPreviewRequest as AgentConstructionKnowhowExternalPreviewRouteRequest,
  type AgentConstructionKnowhowRoleProfileRequest as AgentConstructionKnowhowRoleProfileRouteRequest,
} from "./agentConstructionKnowhowRoutes";
import {
  AGENT_FINANCE_COPILOT_BFF_CONTRACT,
  draftAgentFinanceSummary,
  getAgentFinanceDebts,
  getAgentFinanceSummary,
  previewAgentFinanceRisk,
  type AgentFinanceCopilotEnvelope,
  type AgentFinanceCopilotRouteRequest,
} from "./agentFinanceCopilotRoutes";
import {
  AGENT_WAREHOUSE_COPILOT_BFF_CONTRACT,
  draftAgentWarehouseAction,
  getAgentWarehouseMovements,
  getAgentWarehouseStatus,
  previewAgentWarehouseRisk,
  type AgentWarehouseCopilotEnvelope,
  type AgentWarehouseCopilotRouteRequest,
} from "./agentWarehouseCopilotRoutes";
import {
  AGENT_FIELD_WORK_COPILOT_BFF_CONTRACT,
  draftAgentFieldAct,
  draftAgentFieldReport,
  getAgentFieldContext,
  planAgentFieldAction,
  type AgentFieldWorkCopilotEnvelope,
  type AgentFieldWorkCopilotRouteRequest,
} from "./agentFieldWorkCopilotRoutes";
import {
  AI_ACTION_LEDGER_BFF_CONTRACT,
  approveActionLedgerBff,
  executeApprovedActionLedgerBff,
  getActionExecutionStatusBff,
  getActionLedgerStatusBff,
  rejectActionLedgerBff,
  submitActionForApprovalBff,
  type ActionLedgerBffEnvelope,
  type ActionLedgerDecisionBffRequest,
  type ActionLedgerStatusBffRequest,
  type SubmitForApprovalBffRequest,
} from "../actionLedger/aiActionLedgerBff";
import {
  AI_APPROVAL_INBOX_BFF_CONTRACT,
  approveApprovalInboxActionBff,
  executeApprovedApprovalInboxActionBff,
  getApprovalInboxActionBff,
  getApprovalInboxBff,
  previewApprovalInboxEditBff,
  rejectApprovalInboxActionBff,
} from "../approvalInbox/approvalInboxRuntime";
import type {
  ApprovalInboxActionRequest,
  ApprovalInboxBffEnvelope,
  ApprovalInboxDecisionRequest,
  ApprovalInboxListRequest,
} from "../approvalInbox/approvalInboxTypes";

export {
  AGENT_SCREEN_RUNTIME_BFF_CONTRACT,
  getAgentScreenRuntime,
  planAgentScreenRuntimeAction,
  previewAgentScreenRuntimeIntent,
  AGENT_SCREEN_ACTION_BFF_CONTRACT,
  getAgentScreenActions,
  planAgentScreenAction,
  previewAgentScreenActionIntent,
  AGENT_SCREEN_ASSISTANT_BFF_CONTRACT,
  askAgentScreenAssistant,
  getAgentScreenAssistantContext,
  planAgentScreenAssistantAction,
  previewAgentScreenAssistantDraft,
  previewAgentScreenAssistantSubmitForApproval,
  AGENT_WORKDAY_TASK_BFF_CONTRACT,
  getAgentWorkdayTasks,
  planAgentWorkdayTaskAction,
  previewAgentWorkdayTask,
  AGENT_WORKDAY_LIVE_EVIDENCE_BFF_CONTRACT,
  getAgentWorkdayLiveEvidenceTasks,
  AGENT_DOCUMENT_KNOWLEDGE_BFF_CONTRACT,
  getAgentDocumentKnowledge,
  previewAgentDocumentSummary,
  searchAgentDocuments,
  AGENT_CONSTRUCTION_KNOWHOW_BFF_CONTRACT,
  analyzeAgentConstructionKnowhow,
  createAgentConstructionDecisionCard,
  getAgentConstructionKnowhowDomains,
  getAgentConstructionKnowhowRoleProfile,
  planAgentConstructionKnowhowAction,
  previewAgentConstructionExternalIntel,
  AGENT_FINANCE_COPILOT_BFF_CONTRACT,
  draftAgentFinanceSummary,
  getAgentFinanceDebts,
  getAgentFinanceSummary,
  previewAgentFinanceRisk,
  AGENT_WAREHOUSE_COPILOT_BFF_CONTRACT,
  draftAgentWarehouseAction,
  getAgentWarehouseMovements,
  getAgentWarehouseStatus,
  previewAgentWarehouseRisk,
  AGENT_FIELD_WORK_COPILOT_BFF_CONTRACT,
  draftAgentFieldAct,
  draftAgentFieldReport,
  getAgentFieldContext,
  planAgentFieldAction,
  AI_ACTION_LEDGER_BFF_CONTRACT,
  approveActionLedgerBff,
  executeApprovedActionLedgerBff,
  getActionExecutionStatusBff,
  getActionLedgerStatusBff,
  rejectActionLedgerBff,
  submitActionForApprovalBff,
  AI_APPROVAL_INBOX_BFF_CONTRACT,
  approveApprovalInboxActionBff,
  executeApprovedApprovalInboxActionBff,
  getApprovalInboxActionBff,
  getApprovalInboxBff,
  previewApprovalInboxEditBff,
  rejectApprovalInboxActionBff,
};

export type { AgentDocumentKnowledgeEnvelope };
export type { AgentConstructionKnowhowEnvelope };
export type { AgentFinanceCopilotEnvelope };
export type { AgentWarehouseCopilotEnvelope };
export type { AgentFieldWorkCopilotEnvelope };
export type { AgentScreenAssistantEnvelope };

export type AgentBffRouteShellContractId = "agent_bff_route_shell_v1";
export type AgentBffRouteShellDocumentType = "agent_bff_route_shell";

export type AgentBffRouteOperation =
  | "agent.tools.list"
  | "agent.tools.validate"
  | "agent.tools.preview"
  | "agent.action.status"
  | "agent.action.submit_for_approval"
  | "agent.action.approve"
  | "agent.action.reject"
  | "agent.action.execute_approved"
  | "agent.action.execution_status"
  | "agent.approval_inbox.read"
  | "agent.approval_inbox.detail"
  | "agent.approval_inbox.approve"
  | "agent.approval_inbox.reject"
  | "agent.approval_inbox.edit_preview"
  | "agent.approval_inbox.execute_approved"
  | "agent.task_stream.read"
  | "agent.workday.tasks.read"
  | "agent.workday.tasks.preview"
  | "agent.workday.tasks.action_plan"
  | "agent.workday.live_evidence.read"
  | "agent.documents.knowledge.read"
  | "agent.documents.search.preview"
  | "agent.documents.summarize.preview"
  | "agent.construction_knowhow.domains.read"
  | "agent.construction_knowhow.role_profile.read"
  | "agent.construction_knowhow.analyze.preview"
  | "agent.construction_knowhow.decision_card.preview"
  | "agent.construction_knowhow.action_plan.preview"
  | "agent.construction_knowhow.external_preview"
  | "agent.finance.summary.read"
  | "agent.finance.debts.read"
  | "agent.finance.risk_preview"
  | "agent.finance.draft_summary"
  | "agent.warehouse.status.read"
  | "agent.warehouse.movements.read"
  | "agent.warehouse.risk_preview"
  | "agent.warehouse.draft_action"
  | "agent.field.context.read"
  | "agent.field.draft_report"
  | "agent.field.draft_act"
  | "agent.field.action_plan"
  | "agent.app_graph.screen.read"
  | "agent.app_graph.action.read"
  | "agent.app_graph.resolve"
  | "agent.intel.compare"
  | "agent.external_intel.sources.read"
  | "agent.external_intel.search.preview"
  | "agent.external_intel.cited_search.preview"
  | "agent.procurement.request_context.read"
  | "agent.procurement.request_understanding.read"
  | "agent.procurement.internal_supplier_rank.preview"
  | "agent.procurement.decision_card.preview"
  | "agent.procurement.draft_request.internal_first_preview"
  | "agent.procurement.supplier_match.preview"
  | "agent.procurement.external_supplier_candidates.preview"
  | "agent.procurement.external_supplier.preview"
  | "agent.procurement.draft_request.preview"
  | "agent.procurement.submit_for_approval"
  | "agent.procurement.live_supplier_chain.preview"
  | "agent.procurement.live_supplier_chain.draft"
  | "agent.procurement.live_supplier_chain.submit_for_approval"
  | "agent.procurement.copilot.context.read"
  | "agent.procurement.copilot.plan.preview"
  | "agent.procurement.copilot.draft_preview"
  | "agent.procurement.copilot.submit_for_approval.preview"
  | "agent.screen_runtime.read"
  | "agent.screen_runtime.intent_preview"
  | "agent.screen_runtime.action_plan"
  | "agent.screen_actions.read"
  | "agent.screen_actions.intent_preview"
  | "agent.screen_actions.action_plan"
  | "agent.screen_assistant.context.read"
  | "agent.screen_assistant.ask.preview"
  | "agent.screen_assistant.action_plan"
  | "agent.screen_assistant.draft_preview"
  | "agent.screen_assistant.submit_for_approval.preview";

export type AgentBffHttpMethod = "GET" | "POST";

export type AgentBffRouteDefinition = {
  operation: AgentBffRouteOperation;
  method: AgentBffHttpMethod;
  endpoint: string;
  authRequired: true;
  roleFiltered: boolean;
  mutates: false;
  executesTool: false;
  callsModelProvider: false;
  callsDatabaseDirectly: false;
  exposesForbiddenTools: false;
  responseEnvelope:
    | "AgentBffRouteShellEnvelope"
    | "AgentTaskStreamEnvelope"
    | "AgentAppGraphEnvelope"
    | "AgentIntelCompareEnvelope"
    | "AgentExternalIntelEnvelope"
    | "AgentProcurementEnvelope"
    | "AgentScreenRuntimeEnvelope"
    | "AgentScreenActionEnvelope"
    | "AgentScreenAssistantEnvelope"
    | "AgentWorkdayTaskEnvelope"
    | "AgentWorkdayLiveEvidenceEnvelope"
    | "AgentDocumentKnowledgeEnvelope"
    | "AgentConstructionKnowhowEnvelope"
    | "AgentFinanceCopilotEnvelope"
    | "AgentWarehouseCopilotEnvelope"
    | "AgentFieldWorkCopilotEnvelope"
    | "AgentActionLedgerEnvelope"
    | "AgentApprovalInboxEnvelope";
};

export type AgentBffAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentBffShellRequest = {
  auth: AgentBffAuthContext | null;
};

export type AgentBffToolRouteRequest = AgentBffShellRequest & {
  toolName: string;
  input?: unknown;
};

export type AgentBffActionStatusRequest = AgentBffShellRequest & {
  actionId: string;
};

export type AgentActionLedgerSubmitRequest = SubmitForApprovalBffRequest;
export type AgentActionLedgerStatusRequest = ActionLedgerStatusBffRequest;
export type AgentActionLedgerDecisionRequest = ActionLedgerDecisionBffRequest;
export type AgentApprovalInboxRequest = ApprovalInboxListRequest;
export type AgentApprovalInboxActionRequest = ApprovalInboxActionRequest;
export type AgentApprovalInboxDecisionRequest = ApprovalInboxDecisionRequest;
export type AgentScreenActionsRequest = AgentScreenActionReadRouteRequest;
export type AgentScreenActionIntentPreviewRequest = AgentScreenActionIntentPreviewRouteRequest;
export type AgentScreenActionPlanRequest = AgentScreenActionPlanRouteRequest;
export type AgentScreenAssistantContextRequest = AgentScreenAssistantContextRouteRequest;
export type AgentScreenAssistantAskRequest = AgentScreenAssistantAskRouteRequest;
export type AgentScreenAssistantActionPlanRequest = AgentScreenAssistantActionPlanRouteRequest;
export type AgentScreenAssistantDraftPreviewRequest = AgentScreenAssistantDraftPreviewRouteRequest;
export type AgentScreenAssistantSubmitForApprovalPreviewRequest =
  AgentScreenAssistantSubmitForApprovalPreviewRouteRequest;
export type AgentWorkdayTasksRequest = AgentWorkdayTaskReadRouteRequest;
export type AgentWorkdayTaskPreviewRequest = AgentWorkdayTaskPreviewRouteRequest;
export type AgentWorkdayTaskActionPlanRequest = AgentWorkdayTaskActionPlanRouteRequest;
export type AgentWorkdayLiveEvidenceRequest = AgentWorkdayLiveEvidenceRouteRequest;
export type AgentDocumentKnowledgeRequest = AgentDocumentKnowledgeReadRouteRequest;
export type AgentDocumentSearchRequest = AgentDocumentSearchRouteRequest;
export type AgentDocumentSummaryPreviewRequest = AgentDocumentSummaryPreviewRouteRequest;
export type AgentConstructionKnowhowDomainsRequest = AgentConstructionKnowhowDomainsRouteRequest;
export type AgentConstructionKnowhowRoleProfileRequest = AgentConstructionKnowhowRoleProfileRouteRequest;
export type AgentConstructionKnowhowAnalyzeRequest = AgentConstructionKnowhowAnalyzeRouteRequest;
export type AgentConstructionKnowhowDecisionCardRequest = AgentConstructionKnowhowDecisionCardRouteRequest;
export type AgentConstructionKnowhowActionPlanRequest = AgentConstructionKnowhowActionPlanRouteRequest;
export type AgentConstructionKnowhowExternalPreviewRequest = AgentConstructionKnowhowExternalPreviewRouteRequest;
export type AgentFinanceCopilotRequest = AgentFinanceCopilotRouteRequest;
export type AgentWarehouseCopilotRequest = AgentWarehouseCopilotRouteRequest;
export type AgentFieldWorkCopilotRequest = AgentFieldWorkCopilotRouteRequest;

export type AgentCrossScreenRuntimeRequest = AgentBffShellRequest & AgentScreenRuntimeRequest;

export type AgentCrossScreenRuntimeIntentPreviewRequest = AgentBffShellRequest &
  AgentScreenRuntimeIntentPreviewRequest;

export type AgentCrossScreenRuntimeActionPlanRequest = AgentBffShellRequest &
  AgentScreenRuntimeActionPlanRequest;

export type AgentBffVisibleTool = {
  name: AiToolDefinition["name"];
  description: string;
  domain: AiToolDefinition["domain"];
  riskLevel: AiToolDefinition["riskLevel"];
  approvalRequired: boolean;
  rateLimitScope: string;
  maxRequestsPerMinute: number;
  maxPayloadBytes: number;
  maxResultLimit: number;
  cooldownMs: number;
  cacheAllowed: boolean;
  evidenceRequired: boolean;
  routeMode: AiToolPlan["mode"];
};

export type AgentBffToolValidationDto = {
  toolName: string;
  valid: boolean;
  plan: AiToolPlan;
  rateLimitDecision: AiToolRateLimitDecision;
  mutationCount: 0;
  executed: false;
};

export type AgentBffToolPreviewDto = {
  toolName: string;
  previewAvailable: boolean;
  plan: AiToolPlan;
  rateLimitDecision: AiToolRateLimitDecision;
  mutationCount: 0;
  executed: false;
  persisted: false;
  providerCalled: false;
  dbAccessed: false;
  previewKind: "schema_only" | "blocked";
};

export type AgentBffActionStatusDto = {
  actionId: string;
  status: "not_found";
  lookupPerformed: false;
  mutationCount: 0;
  executed: false;
  providerCalled: false;
  dbAccessed: false;
};

export type AgentActionLedgerEnvelope = ActionLedgerBffEnvelope;
export type AgentApprovalInboxEnvelope = ApprovalInboxBffEnvelope;

export {
  AGENT_APP_GRAPH_BFF_CONTRACT,
  AGENT_EXTERNAL_INTEL_BFF_CONTRACT,
  compareAgentIntel,
  getAgentAppGraphAction,
  getAgentAppGraphScreen,
  getAgentExternalIntelSources,
  previewAgentExternalIntelCitedSearch,
  previewAgentExternalIntelSearch,
  resolveAgentAppGraph,
} from "./agentIntelGraphRoutes";
export type {
  AgentAppGraphActionDto,
  AgentAppGraphActionRequest,
  AgentAppGraphEnvelope,
  AgentAppGraphResolveDto,
  AgentAppGraphResolveRequest,
  AgentAppGraphScreenDto,
  AgentAppGraphScreenRequest,
  AgentExternalIntelCitedSearchPreviewDto,
  AgentExternalIntelCitedSearchPreviewRequest,
  AgentExternalIntelDto,
  AgentExternalIntelEnvelope,
  AgentExternalIntelSearchPreviewDto,
  AgentExternalIntelSearchPreviewRequest,
  AgentExternalIntelSourcesDto,
  AgentExternalIntelSourcesRequest,
  AgentIntelCompareDto,
  AgentIntelCompareEnvelope,
  AgentIntelCompareInput,
  AgentIntelCompareOutput,
  AgentIntelCompareRequest,
} from "./agentIntelGraphRoutes";

export {
  AGENT_PROCUREMENT_BFF_CONTRACT,
  draftAgentProcurementLiveSupplierChain,
  getAgentProcurementCopilotContext,
  getAgentProcurementRequestContext,
  getAgentProcurementRequestUnderstanding,
  previewAgentProcurementCopilotDraft,
  previewAgentProcurementCopilotPlan,
  previewAgentProcurementCopilotSubmitForApproval,
  previewAgentProcurementDecisionCard,
  previewAgentProcurementDraftRequest,
  previewAgentProcurementExternalSupplierCandidates,
  previewAgentProcurementExternalSupplierPreview,
  previewAgentProcurementInternalFirstDraftRequest,
  previewAgentProcurementInternalSupplierRank,
  previewAgentProcurementLiveSupplierChain,
  previewAgentProcurementSupplierMatch,
  submitAgentProcurementForApproval,
  submitAgentProcurementLiveSupplierChainForApproval,
} from "./agentProcurementRoutes";
export type {
  AgentProcurementCopilotContextDto,
  AgentProcurementCopilotContextRequest,
  AgentProcurementCopilotDraftPreviewDto,
  AgentProcurementCopilotDraftPreviewRequest,
  AgentProcurementCopilotPlanDto,
  AgentProcurementCopilotPlanRequest,
  AgentProcurementCopilotSubmitForApprovalPreviewDto,
  AgentProcurementCopilotSubmitForApprovalPreviewRequest,
  AgentProcurementDecisionCardDto,
  AgentProcurementDecisionCardRequest,
  AgentProcurementDraftRequestPreviewDto,
  AgentProcurementDraftRequestPreviewRequest,
  AgentProcurementDto,
  AgentProcurementEnvelope,
  AgentProcurementExternalSupplierCandidatesDto,
  AgentProcurementExternalSupplierCandidatesRequest,
  AgentProcurementExternalSupplierPreviewDto,
  AgentProcurementExternalSupplierPreviewRequest,
  AgentProcurementInternalFirstDraftRequestPreviewDto,
  AgentProcurementInternalFirstDraftRequestPreviewRequest,
  AgentProcurementInternalSupplierRankDto,
  AgentProcurementInternalSupplierRankRequest,
  AgentProcurementLiveSupplierChainDto,
  AgentProcurementLiveSupplierChainRequest,
  AgentProcurementRequestContextDto,
  AgentProcurementRequestContextRequest,
  AgentProcurementRequestUnderstandingDto,
  AgentProcurementRequestUnderstandingRequest,
  AgentProcurementSubmitForApprovalDto,
  AgentProcurementSubmitForApprovalRequest,
  AgentProcurementSupplierMatchDto,
  AgentProcurementSupplierMatchRequest,
} from "./agentProcurementRoutes";

export {
  AGENT_TASK_STREAM_BFF_CONTRACT,
  getAgentTaskStream,
} from "./agentTaskStreamRoutes";
export type {
  AgentTaskStreamCard,
  AgentTaskStreamCardType,
  AgentTaskStreamDto,
  AgentTaskStreamEnvelope,
  AgentTaskStreamPageInput,
  AgentTaskStreamPriority,
  AgentTaskStreamRequest,
  AgentTaskStreamScope,
} from "./agentTaskStreamRoutes";

export type AgentBffRouteShellDto =
  | {
      contractId: AgentBffRouteShellContractId;
      documentType: AgentBffRouteShellDocumentType;
      operation: "agent.tools.list";
      tools: readonly AgentBffVisibleTool[];
      mutationCount: 0;
      source: "bff:agent_route_shell_v1";
    }
  | {
      contractId: AgentBffRouteShellContractId;
      documentType: AgentBffRouteShellDocumentType;
      operation: "agent.tools.validate";
      result: AgentBffToolValidationDto;
      source: "bff:agent_route_shell_v1";
    }
  | {
      contractId: AgentBffRouteShellContractId;
      documentType: AgentBffRouteShellDocumentType;
      operation: "agent.tools.preview";
      result: AgentBffToolPreviewDto;
      source: "bff:agent_route_shell_v1";
    }
  | {
      contractId: AgentBffRouteShellContractId;
      documentType: AgentBffRouteShellDocumentType;
      operation: "agent.action.status";
      result: AgentBffActionStatusDto;
      source: "bff:agent_route_shell_v1";
    };

export type AgentBffRouteShellErrorCode =
  | "AGENT_BFF_AUTH_REQUIRED"
  | "AGENT_BFF_TOOL_NOT_VISIBLE"
  | "AGENT_BFF_INVALID_ACTION_ID";

export type AgentBffRouteShellEnvelope =
  | {
      ok: true;
      data: AgentBffRouteShellDto;
    }
  | {
      ok: false;
      error: {
        code: AgentBffRouteShellErrorCode;
        message: string;
      };
    };

export const AGENT_BFF_ROUTE_SHELL_CONTRACT = Object.freeze({
  contractId: "agent_bff_route_shell_v1",
  documentType: "agent_bff_route_shell",
  source: "bff:agent_route_shell_v1",
  readOnly: true,
  trafficEnabledByDefault: false,
  productionTrafficEnabled: false,
  authRequired: true,
  roleFilteredTools: true,
  previewMutates: false,
  mutationCount: 0,
  directDatabaseAccess: 0,
  modelProviderImports: 0,
  executionEnabled: false,
  forbiddenToolsHidden: true,
} as const);

export const AGENT_APPROVAL_INBOX_BFF_CONTRACT = AI_APPROVAL_INBOX_BFF_CONTRACT;

/*
 * Agent BFF route source hints remain here for source-based guardrails; runtime table is re-exported below.
 * safety flags: authRequired: true | roleFiltered: true | mutates: false | executesTool: false | callsModelProvider: false | callsDatabaseDirectly: false | exposesForbiddenTools: false
 * owner modules: AGENT_APP_GRAPH_BFF_CONTRACT and AGENT_EXTERNAL_INTEL_BFF_CONTRACT are re-exported from ./agentIntelGraphRoutes; AGENT_PROCUREMENT_BFF_CONTRACT is re-exported from ./agentProcurementRoutes; externalLiveFetchEnabled: false | liveEnabled: false | provider: "disabled"
 * endpoints: GET /agent/approval-inbox | GET /agent/approval-inbox/:actionId | POST /agent/approval-inbox/:actionId/approve | POST /agent/approval-inbox/:actionId/reject | POST /agent/approval-inbox/:actionId/edit-preview | POST /agent/approval-inbox/:actionId/execute-approved | POST /agent/action/submit-for-approval | GET /agent/action/:actionId/status | POST /agent/action/:actionId/approve | POST /agent/action/:actionId/reject | POST /agent/action/:actionId/execute-approved | GET /agent/action/:actionId/execution-status
 * endpoints: GET /agent/screen-runtime/:screenId | POST /agent/screen-runtime/:screenId/intent-preview | POST /agent/screen-runtime/:screenId/action-plan | GET /agent/screen-actions/:screenId | POST /agent/screen-actions/:screenId/intent-preview | POST /agent/screen-actions/:screenId/action-plan | GET /agent/screen-assistant/:screenId/context | POST /agent/screen-assistant/:screenId/ask | POST /agent/screen-assistant/:screenId/action-plan | POST /agent/screen-assistant/:screenId/draft-preview | POST /agent/screen-assistant/:screenId/submit-for-approval-preview | GET /agent/external-intel/sources
 * endpoints: POST /agent/external-intel/search/preview | POST /agent/external-intel/cited-search-preview | GET /agent/procurement/request-context/:requestId | GET /agent/procurement/request-understanding/:requestId | POST /agent/procurement/internal-supplier-rank | POST /agent/procurement/decision-card | POST /agent/procurement/supplier-match/preview | POST /agent/procurement/external-supplier-candidates/preview | POST /agent/procurement/external-supplier-preview | POST /agent/procurement/draft-request/preview | POST /agent/procurement/draft-request-preview | POST /agent/procurement/submit-for-approval
 * endpoints: POST /agent/procurement/live-supplier-chain/preview | POST /agent/procurement/live-supplier-chain/draft | POST /agent/procurement/live-supplier-chain/submit-for-approval | GET /agent/procurement/copilot/context | POST /agent/procurement/copilot/plan | POST /agent/procurement/copilot/draft-preview | POST /agent/procurement/copilot/submit-for-approval-preview | GET /agent/app-graph/screen/:screenId | GET /agent/app-graph/action/:buttonId | POST /agent/app-graph/resolve | POST /agent/intel/compare | GET /agent/task-stream
 * endpoints: GET /agent/workday/tasks | POST /agent/workday/tasks/:taskId/preview | POST /agent/workday/tasks/:taskId/action-plan | GET /agent/workday/live-evidence-tasks | GET /agent/documents/knowledge | POST /agent/documents/search | POST /agent/documents/summarize-preview | GET /agent/construction-knowhow/domains | GET /agent/construction-knowhow/role-profile/:roleId | POST /agent/construction-knowhow/analyze | POST /agent/construction-knowhow/decision-card | POST /agent/construction-knowhow/action-plan
 * endpoints: POST /agent/construction-knowhow/external-preview | GET /agent/finance/summary | GET /agent/finance/debts | POST /agent/finance/risk-preview | POST /agent/finance/draft-summary | GET /agent/warehouse/status | GET /agent/warehouse/movements | POST /agent/warehouse/risk-preview | POST /agent/warehouse/draft-action | GET /agent/field/context | POST /agent/field/draft-report | POST /agent/field/draft-act
 * endpoints: POST /agent/field/action-plan | GET /agent/tools | POST /agent/tools/:name/validate | POST /agent/tools/:name/preview
 * operations: agent.approval_inbox.read | agent.approval_inbox.detail | agent.approval_inbox.approve | agent.approval_inbox.reject | agent.approval_inbox.edit_preview | agent.approval_inbox.execute_approved | agent.action.submit_for_approval | agent.action.status | agent.action.approve | agent.action.reject | agent.action.execute_approved | agent.action.execution_status
 * operations: agent.screen_runtime.read | agent.screen_runtime.intent_preview | agent.screen_runtime.action_plan | agent.screen_actions.read | agent.screen_actions.intent_preview | agent.screen_actions.action_plan | agent.screen_assistant.context.read | agent.screen_assistant.ask.preview | agent.screen_assistant.action_plan | agent.screen_assistant.draft_preview | agent.screen_assistant.submit_for_approval.preview | agent.external_intel.sources.read
 * operations: agent.external_intel.search.preview | agent.external_intel.cited_search.preview | agent.procurement.request_context.read | agent.procurement.request_understanding.read | agent.procurement.internal_supplier_rank.preview | agent.procurement.decision_card.preview | agent.procurement.supplier_match.preview | agent.procurement.external_supplier_candidates.preview | agent.procurement.external_supplier.preview | agent.procurement.draft_request.preview | agent.procurement.draft_request.internal_first_preview | agent.procurement.submit_for_approval
 * operations: agent.procurement.live_supplier_chain.preview | agent.procurement.live_supplier_chain.draft | agent.procurement.live_supplier_chain.submit_for_approval | agent.procurement.copilot.context.read | agent.procurement.copilot.plan.preview | agent.procurement.copilot.draft_preview | agent.procurement.copilot.submit_for_approval.preview | agent.app_graph.screen.read | agent.app_graph.action.read | agent.app_graph.resolve | agent.intel.compare | agent.task_stream.read
 * operations: agent.workday.tasks.read | agent.workday.tasks.preview | agent.workday.tasks.action_plan | agent.workday.live_evidence.read | agent.documents.knowledge.read | agent.documents.search.preview | agent.documents.summarize.preview | agent.construction_knowhow.domains.read | agent.construction_knowhow.role_profile.read | agent.construction_knowhow.analyze.preview | agent.construction_knowhow.decision_card.preview | agent.construction_knowhow.action_plan.preview
 * operations: agent.construction_knowhow.external_preview | agent.finance.summary.read | agent.finance.debts.read | agent.finance.risk_preview | agent.finance.draft_summary | agent.warehouse.status.read | agent.warehouse.movements.read | agent.warehouse.risk_preview | agent.warehouse.draft_action | agent.field.context.read | agent.field.draft_report | agent.field.draft_act
 * operations: agent.field.action_plan | agent.tools.list | agent.tools.validate | agent.tools.preview
 */
export { AGENT_BFF_ROUTE_DEFINITIONS } from "./agentRuntimeRoutePolicyRegistry";

function authRequiredError(): AgentBffRouteShellEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_BFF_AUTH_REQUIRED",
      message: "Agent BFF route shell requires authenticated role context",
    },
  };
}

function toolNotVisibleError(): AgentBffRouteShellEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_BFF_TOOL_NOT_VISIBLE",
      message: "Agent tool is not visible for this role",
    },
  };
}

function isAuthenticated(auth: AgentBffAuthContext | null): auth is AgentBffAuthContext {
  return auth !== null && auth.userId.length > 0 && auth.role !== "unknown";
}

function isToolVisibleForRole(toolName: string, role: AiUserRole): boolean {
  return planAiToolUse({ toolName, role }).allowed;
}

function toVisibleTool(tool: AiToolDefinition, role: AiUserRole): AgentBffVisibleTool | null {
  const plan = planAiToolUse({ toolName: tool.name, role });
  const budget = getAiToolBudgetPolicy(tool.name);
  if (!plan.allowed) return null;

  return {
    name: tool.name,
    description: tool.description,
    domain: tool.domain,
    riskLevel: tool.riskLevel,
    approvalRequired: tool.approvalRequired,
    rateLimitScope: plan.rateLimitDecision.rateLimitScope ?? tool.rateLimitScope,
    maxRequestsPerMinute: plan.rateLimitDecision.maxRequestsPerMinute ?? 0,
    maxPayloadBytes: budget?.maxPayloadBytes ?? 0,
    maxResultLimit: budget?.maxResultLimit ?? 0,
    cooldownMs: plan.rateLimitDecision.cooldownMs ?? 0,
    cacheAllowed: tool.cacheAllowed,
    evidenceRequired: tool.evidenceRequired,
    routeMode: plan.mode,
  };
}

export function listAgentBffTools(request: AgentBffShellRequest): AgentBffRouteShellEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();

  const { auth } = request;
  const tools = AI_TOOL_REGISTRY
    .map((tool) => toVisibleTool(tool, auth.role))
    .filter((tool): tool is AgentBffVisibleTool => tool !== null);

  return {
    ok: true,
    data: {
      contractId: AGENT_BFF_ROUTE_SHELL_CONTRACT.contractId,
      documentType: AGENT_BFF_ROUTE_SHELL_CONTRACT.documentType,
      operation: "agent.tools.list",
      tools,
      mutationCount: 0,
      source: AGENT_BFF_ROUTE_SHELL_CONTRACT.source,
    },
  };
}

export function validateAgentBffTool(request: AgentBffToolRouteRequest): AgentBffRouteShellEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();
  const { auth } = request;
  if (!isToolVisibleForRole(request.toolName, auth.role)) return toolNotVisibleError();

  const plan = planAiToolUse({ toolName: request.toolName, role: auth.role });
  const rateLimitDecision = decideAiToolRateLimit({
    toolName: request.toolName,
    role: auth.role,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_BFF_ROUTE_SHELL_CONTRACT.contractId,
      documentType: AGENT_BFF_ROUTE_SHELL_CONTRACT.documentType,
      operation: "agent.tools.validate",
      result: {
        toolName: request.toolName,
        valid: plan.allowed,
        plan,
        rateLimitDecision,
        mutationCount: 0,
        executed: false,
      },
      source: AGENT_BFF_ROUTE_SHELL_CONTRACT.source,
    },
  };
}

export function previewAgentBffTool(request: AgentBffToolRouteRequest): AgentBffRouteShellEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();
  const { auth } = request;
  if (!isToolVisibleForRole(request.toolName, auth.role)) return toolNotVisibleError();

  const plan = planAiToolUse({ toolName: request.toolName, role: auth.role });
  const rateLimitDecision = decideAiToolRateLimit({
    toolName: request.toolName,
    role: auth.role,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_BFF_ROUTE_SHELL_CONTRACT.contractId,
      documentType: AGENT_BFF_ROUTE_SHELL_CONTRACT.documentType,
      operation: "agent.tools.preview",
      result: {
        toolName: request.toolName,
        previewAvailable: plan.allowed,
        plan,
        rateLimitDecision,
        mutationCount: 0,
        executed: false,
        persisted: false,
        providerCalled: false,
        dbAccessed: false,
        previewKind: plan.allowed ? "schema_only" : "blocked",
      },
      source: AGENT_BFF_ROUTE_SHELL_CONTRACT.source,
    },
  };
}

export function getAgentBffActionStatus(
  request: AgentBffActionStatusRequest,
): AgentBffRouteShellEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();
  if (!request.actionId.trim()) {
    return {
      ok: false,
      error: {
        code: "AGENT_BFF_INVALID_ACTION_ID",
        message: "Agent action id is required",
      },
    };
  }

  return {
    ok: true,
    data: {
      contractId: AGENT_BFF_ROUTE_SHELL_CONTRACT.contractId,
      documentType: AGENT_BFF_ROUTE_SHELL_CONTRACT.documentType,
      operation: "agent.action.status",
      result: {
        actionId: request.actionId,
        status: "not_found",
        lookupPerformed: false,
        mutationCount: 0,
        executed: false,
        providerCalled: false,
        dbAccessed: false,
      },
      source: AGENT_BFF_ROUTE_SHELL_CONTRACT.source,
    },
  };
}
