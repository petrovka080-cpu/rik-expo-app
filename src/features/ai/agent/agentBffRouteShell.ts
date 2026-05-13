import {
  canUseAiCapability,
  type AiDomain,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import { planAiToolUse, type AiToolPlan } from "../tools/aiToolPlanPolicy";
import { AI_TOOL_REGISTRY } from "../tools/aiToolRegistry";
import type { AiToolDefinition } from "../tools/aiToolTypes";
import { getAiToolBudgetPolicy } from "../rateLimit/aiToolBudgetPolicy";
import { decideAiToolRateLimit, type AiToolRateLimitDecision } from "../rateLimit/aiToolRateLimitDecision";
import { loadAiTaskStreamRuntime } from "../taskStream/aiTaskStreamRuntime";
import type {
  AiTaskStreamRuntimeEvidenceInput,
  AiTaskStreamRuntimeResult,
} from "../taskStream/aiTaskStreamRuntimeTypes";
import {
  getAiAppGraphActionDto,
  getAiAppGraphScreenDto,
  resolveAiActionGraph,
} from "../appGraph/aiActionGraphResolver";
import type {
  AiActionGraphResolveResult,
  AiAppGraphActionDto,
  AiAppGraphScreenDto,
} from "../appGraph/aiAppActionTypes";
import { resolveInternalFirstDecision } from "../intelligence/internalFirstPolicy";
import { resolveExternalIntel } from "../externalIntel/externalIntelResolver";
import { createExternalIntelGateway, type ExternalIntelGateway } from "../externalIntel/ExternalIntelGateway";
import type {
  ExternalIntelCitation,
  ExternalIntelSearchPreviewInput,
  ExternalIntelSearchPreviewOutput,
  ExternalIntelSourcesResponse,
} from "../externalIntel/externalIntelTypes";
import { AI_PERSISTENT_APPROVAL_QUEUE_READINESS } from "../approval/aiApprovalTypes";
import {
  buildProcurementDraftPreview,
  type ProcurementDraftPlanBuilderRequest,
} from "../procurement/procurementDraftPlanBuilder";
import { resolveProcurementRequestContext } from "../procurement/procurementRequestContextResolver";
import {
  previewProcurementSupplierMatch,
  type ProcurementSupplierMatchEngineRequest,
} from "../procurement/procurementSupplierMatchEngine";
import { previewAiExternalSupplierCandidatesCanary } from "../externalIntel/aiExternalSupplierCandidatePreview";
import type {
  ExternalSupplierCandidatesInput,
  ExternalSupplierCandidatesOutput,
  ProcurementApprovalPreviewInput,
  ProcurementApprovalPreviewOutput,
  ProcurementDraftPreviewOutput,
  ProcurementRequestContext,
  ProcurementRequestContextResolverInput,
  ProcurementSafeRequestSnapshot,
  SupplierMatchPreviewInput,
  SupplierMatchPreviewOutput,
} from "../procurement/procurementContextTypes";
import {
  AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT,
  runAiProcurementLiveSupplierChain,
  type AiProcurementLiveSupplierChainInput,
  type AiProcurementLiveSupplierChainResult,
} from "../procurement/aiProcurementLiveChain";
import {
  buildProcurementCopilotPlan,
  resolveProcurementCopilotContext,
} from "../procurementCopilot/procurementCopilotPlanEngine";
import { buildProcurementCopilotDraftPreview } from "../procurementCopilot/procurementCopilotDraftBridge";
import { previewProcurementCopilotSubmitForApproval } from "../procurementCopilot/procurementCopilotActionPolicy";
import type {
  ProcurementCopilotContext,
  ProcurementCopilotDraftPreview,
  ProcurementCopilotDraftPreviewInput,
  ProcurementCopilotPlan,
  ProcurementCopilotPlanInput,
  ProcurementCopilotSubmitPreviewInput,
  ProcurementCopilotSubmitForApprovalPreview,
} from "../procurementCopilot/procurementCopilotTypes";
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
  AGENT_WORKDAY_TASK_BFF_CONTRACT,
  getAgentWorkdayTasks,
  planAgentWorkdayTaskAction,
  previewAgentWorkdayTask,
  AGENT_WORKDAY_LIVE_EVIDENCE_BFF_CONTRACT,
  getAgentWorkdayLiveEvidenceTasks,
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
  | "agent.app_graph.screen.read"
  | "agent.app_graph.action.read"
  | "agent.app_graph.resolve"
  | "agent.intel.compare"
  | "agent.external_intel.sources.read"
  | "agent.external_intel.search.preview"
  | "agent.procurement.request_context.read"
  | "agent.procurement.supplier_match.preview"
  | "agent.procurement.external_supplier_candidates.preview"
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
  | "agent.screen_actions.action_plan";

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
    | "AgentWorkdayTaskEnvelope"
    | "AgentWorkdayLiveEvidenceEnvelope"
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
export type AgentWorkdayTasksRequest = AgentWorkdayTaskReadRouteRequest;
export type AgentWorkdayTaskPreviewRequest = AgentWorkdayTaskPreviewRouteRequest;
export type AgentWorkdayTaskActionPlanRequest = AgentWorkdayTaskActionPlanRouteRequest;
export type AgentWorkdayLiveEvidenceRequest = AgentWorkdayLiveEvidenceRouteRequest;

export type AgentAppGraphScreenRequest = AgentBffShellRequest & {
  screenId: string;
};

export type AgentAppGraphActionRequest = AgentBffShellRequest & {
  screenId: string;
  buttonId: string;
};

export type AgentAppGraphResolveRequest = AgentBffShellRequest & {
  screenId: string;
  buttonId?: string;
  evidenceRefs?: readonly string[];
};

export type AgentIntelCompareInput = {
  domain: string;
  internalEvidenceRefs: string[];
  query: string;
  location?: string;
  sourcePolicyIds: string[];
};

export type AgentIntelCompareRequest = AgentBffShellRequest & {
  input: AgentIntelCompareInput;
};

export type AgentExternalIntelSourcesRequest = AgentBffShellRequest;

export type AgentExternalIntelSearchPreviewRequest = AgentBffShellRequest & {
  input: ExternalIntelSearchPreviewInput;
};

export type AgentProcurementRequestContextRequest = AgentBffShellRequest & {
  requestId: string;
  screenId: string;
  cursor?: string | null;
  organizationId?: string;
  requestSnapshot?: ProcurementSafeRequestSnapshot | null;
};

export type AgentProcurementSupplierMatchRequest = AgentBffShellRequest & {
  input: SupplierMatchPreviewInput;
  context?: ProcurementRequestContext | null;
  externalRequested?: boolean;
  externalSourcePolicyIds?: readonly string[];
  searchCatalogItems?: ProcurementSupplierMatchEngineRequest["searchCatalogItems"];
  listSuppliers?: ProcurementSupplierMatchEngineRequest["listSuppliers"];
};

export type AgentProcurementExternalSupplierCandidatesRequest = AgentBffShellRequest & {
  input: ExternalSupplierCandidatesInput;
  sourcePolicyIds?: readonly string[];
  externalGateway?: ExternalIntelGateway;
};

export type AgentProcurementDraftRequestPreviewRequest = AgentBffShellRequest & {
  input: ProcurementDraftPlanBuilderRequest["input"];
};

export type AgentProcurementSubmitForApprovalRequest = AgentBffShellRequest & {
  input: ProcurementApprovalPreviewInput;
};

export type AgentProcurementLiveSupplierChainRequest = AgentBffShellRequest &
  Omit<AiProcurementLiveSupplierChainInput, "auth">;

export type AgentProcurementCopilotContextRequest = AgentBffShellRequest & {
  requestId: string;
  screenId: string;
  cursor?: string | null;
  organizationId?: string;
  requestSnapshot?: ProcurementSafeRequestSnapshot | null;
};

export type AgentProcurementCopilotPlanRequest = AgentBffShellRequest & {
  input: ProcurementCopilotPlanInput;
};

export type AgentProcurementCopilotDraftPreviewRequest = AgentBffShellRequest & {
  input: ProcurementCopilotDraftPreviewInput;
};

export type AgentProcurementCopilotSubmitForApprovalPreviewRequest = AgentBffShellRequest & {
  input: ProcurementCopilotSubmitPreviewInput;
};

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

export type AgentAppGraphScreenDto = {
  contractId: "agent_app_graph_bff_v1";
  documentType: "agent_app_graph_screen";
  endpoint: "GET /agent/app-graph/screen/:screenId";
  result: AiAppGraphScreenDto;
  roleScoped: true;
  evidenceBacked: true;
  mutationCount: 0;
  readOnly: true;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentAppGraphActionDto = {
  contractId: "agent_app_graph_bff_v1";
  documentType: "agent_app_graph_action";
  endpoint: "GET /agent/app-graph/action/:buttonId";
  result: AiAppGraphActionDto;
  roleScoped: true;
  evidenceBacked: true;
  mutationCount: 0;
  readOnly: true;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentAppGraphResolveDto = {
  contractId: "agent_app_graph_bff_v1";
  documentType: "agent_app_graph_resolve";
  endpoint: "POST /agent/app-graph/resolve";
  result: AiActionGraphResolveResult;
  roleScoped: true;
  evidenceBacked: true;
  mutationCount: 0;
  readOnly: true;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentIntelCompareOutput = {
  internalFirstSummary: string;
  externalComparisonSummary?: string;
  evidenceRefs: string[];
  citations: {
    sourceId: string;
    title: string;
    urlHash: string;
    checkedAt: string;
  }[];
  confidence: "low" | "medium" | "high";
  nextAction: "explain" | "draft" | "submit_for_approval";
  mutationCount: 0;
  providerCalled: false;
  externalLiveFetchEnabled: false;
};

export type AgentIntelCompareDto = {
  contractId: "agent_intel_compare_bff_v1";
  documentType: "agent_intel_compare";
  endpoint: "POST /agent/intel/compare";
  result: AgentIntelCompareOutput;
  roleScoped: true;
  readOnly: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentExternalIntelSourcesDto = {
  contractId: "agent_external_intel_bff_v1";
  documentType: "agent_external_intel_sources";
  endpoint: "GET /agent/external-intel/sources";
  result: ExternalIntelSourcesResponse;
  roleScoped: true;
  readOnly: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentExternalIntelSearchPreviewDto = {
  contractId: "agent_external_intel_bff_v1";
  documentType: "agent_external_intel_search_preview";
  endpoint: "POST /agent/external-intel/search/preview";
  result: ExternalIntelSearchPreviewOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: boolean;
  dbAccessedDirectly: false;
};

export type AgentExternalIntelDto =
  | AgentExternalIntelSourcesDto
  | AgentExternalIntelSearchPreviewDto;

export type AgentProcurementRequestContextDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_request_context";
  endpoint: "GET /agent/procurement/request-context/:requestId";
  result: ProcurementRequestContext;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementSupplierMatchDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_supplier_match_preview";
  endpoint: "POST /agent/procurement/supplier-match/preview";
  result: SupplierMatchPreviewOutput;
  toolBoundary: "search_catalog_and_compare_suppliers_only";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementExternalSupplierCandidatesDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_external_supplier_candidates_preview";
  endpoint: "POST /agent/procurement/external-supplier-candidates/preview";
  result: ExternalSupplierCandidatesOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementDraftRequestPreviewDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_draft_request_preview";
  endpoint: "POST /agent/procurement/draft-request/preview";
  result: ProcurementDraftPreviewOutput;
  toolBoundary: "draft_request_only";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementSubmitForApprovalDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_submit_for_approval";
  endpoint: "POST /agent/procurement/submit-for-approval";
  result: ProcurementApprovalPreviewOutput;
  approvalRequired: true;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementCopilotContextDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_copilot_context";
  endpoint: "GET /agent/procurement/copilot/context";
  result: ProcurementCopilotContext;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementCopilotPlanDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_copilot_plan";
  endpoint: "POST /agent/procurement/copilot/plan";
  result: ProcurementCopilotPlan;
  runtimeBoundary: "internal_context_marketplace_compare_external_status_draft_approval";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementCopilotDraftPreviewDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_copilot_draft_preview";
  endpoint: "POST /agent/procurement/copilot/draft-preview";
  result: ProcurementCopilotDraftPreview;
  toolBoundary: "draft_request_only";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementCopilotSubmitForApprovalPreviewDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_copilot_submit_for_approval_preview";
  endpoint: "POST /agent/procurement/copilot/submit-for-approval-preview";
  result: ProcurementCopilotSubmitForApprovalPreview;
  approvalRequired: true;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementLiveSupplierChainDto = {
  contractId: "agent_procurement_bff_v1";
  documentType:
    | "agent_procurement_live_supplier_chain_preview"
    | "agent_procurement_live_supplier_chain_draft"
    | "agent_procurement_live_supplier_chain_submit_for_approval";
  endpoint:
    | "POST /agent/procurement/live-supplier-chain/preview"
    | "POST /agent/procurement/live-supplier-chain/draft"
    | "POST /agent/procurement/live-supplier-chain/submit-for-approval";
  result: AiProcurementLiveSupplierChainResult;
  runtimeBoundary: "internal_context_marketplace_compare_draft_approval";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  approvalRequired: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementDto =
  | AgentProcurementRequestContextDto
  | AgentProcurementSupplierMatchDto
  | AgentProcurementExternalSupplierCandidatesDto
  | AgentProcurementDraftRequestPreviewDto
  | AgentProcurementSubmitForApprovalDto
  | AgentProcurementLiveSupplierChainDto
  | AgentProcurementCopilotContextDto
  | AgentProcurementCopilotPlanDto
  | AgentProcurementCopilotDraftPreviewDto
  | AgentProcurementCopilotSubmitForApprovalPreviewDto;

export type AgentAppGraphEnvelope =
  | {
      ok: true;
      data: AgentAppGraphScreenDto | AgentAppGraphActionDto | AgentAppGraphResolveDto;
    }
  | {
      ok: false;
      error: {
        code:
          | "AGENT_APP_GRAPH_AUTH_REQUIRED"
          | "AGENT_APP_GRAPH_SCREEN_BLOCKED"
          | "AGENT_APP_GRAPH_ACTION_BLOCKED";
        message: string;
      };
    };

export type AgentIntelCompareEnvelope =
  | {
      ok: true;
      data: AgentIntelCompareDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_INTEL_COMPARE_AUTH_REQUIRED" | "AGENT_INTEL_COMPARE_INVALID_INPUT";
        message: string;
      };
    };

export type AgentExternalIntelEnvelope =
  | {
      ok: true;
      data: AgentExternalIntelDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_EXTERNAL_INTEL_AUTH_REQUIRED" | "AGENT_EXTERNAL_INTEL_INVALID_INPUT";
        message: string;
      };
    };

export type AgentProcurementEnvelope =
  | {
      ok: true;
      data: AgentProcurementDto;
    }
  | {
      ok: false;
      error: {
        code:
          | "AGENT_PROCUREMENT_AUTH_REQUIRED"
          | "AGENT_PROCUREMENT_INVALID_INPUT";
        message: string;
      };
    };

export type AgentActionLedgerEnvelope = ActionLedgerBffEnvelope;
export type AgentApprovalInboxEnvelope = ApprovalInboxBffEnvelope;

export type AgentTaskStreamCardType =
  | "approval_pending"
  | "supplier_price_change"
  | "warehouse_low_stock"
  | "draft_ready"
  | "report_ready"
  | "finance_risk"
  | "missing_document"
  | "recommended_next_action";

export type AgentTaskStreamPriority = "low" | "normal" | "high" | "critical";

export type AgentTaskStreamScope =
  | {
      kind: "cross_domain";
    }
  | {
      kind: "role_domain";
      allowedRoles: readonly AiUserRole[];
    }
  | {
      kind: "own_record";
      ownerUserIdHash: string;
    };

export type AgentTaskStreamCard = {
  id: string;
  type: AgentTaskStreamCardType;
  title: string;
  summary: string;
  domain: AiDomain;
  priority: AgentTaskStreamPriority;
  createdAt: string;
  evidenceRefs: readonly string[];
  scope: AgentTaskStreamScope;
  recommendedToolName?: AiToolDefinition["name"];
  nextActionLabel?: string;
};

export type AgentTaskStreamPageInput = {
  limit?: number;
  cursor?: string | null;
};

export type AgentTaskStreamRequest = AgentBffShellRequest & {
  screenId?: string;
  page?: AgentTaskStreamPageInput;
  sourceCards?: readonly AgentTaskStreamCard[];
  runtimeEvidence?: AiTaskStreamRuntimeEvidenceInput;
};

export type AgentTaskStreamDto = {
  contractId: "agent_task_stream_bff_v1";
  documentType: "agent_task_stream";
  endpoint: "GET /agent/task-stream";
  cards: readonly AgentTaskStreamCard[];
  page: {
    limit: number;
    cursor: string | null;
    nextCursor: string | null;
  };
  paginated: true;
  roleScoped: true;
  evidenceBacked: true;
  mutationCount: 0;
  readOnly: true;
  executed: false;
  providerCalled: false;
  dbAccessedDirectly: false;
  source: "bff:agent_task_stream_v1";
  runtimeStatus: AiTaskStreamRuntimeResult["status"];
  blockedReason: string | null;
  countsByType: Record<string, number>;
};

export type AgentTaskStreamEnvelope =
  | {
      ok: true;
      data: AgentTaskStreamDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_TASK_STREAM_AUTH_REQUIRED" | "AGENT_TASK_STREAM_INVALID_PAGE";
        message: string;
      };
    };

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

export const AGENT_TASK_STREAM_BFF_CONTRACT = Object.freeze({
  contractId: "agent_task_stream_bff_v1",
  documentType: "agent_task_stream",
  endpoint: "GET /agent/task-stream",
  readOnly: true,
  paginated: true,
  roleScoped: true,
  evidenceBacked: true,
  mutationCount: 0,
  directDatabaseAccess: 0,
  modelProviderImports: 0,
  executionEnabled: false,
  trafficEnabledByDefault: false,
  productionTrafficEnabled: false,
  supportedCardTypes: [
    "approval_pending",
    "supplier_price_change",
    "warehouse_low_stock",
    "draft_ready",
    "report_ready",
    "finance_risk",
    "missing_document",
    "recommended_next_action",
  ],
  runtimeAdapter: "runtime:ai_task_stream_v1",
} as const);

export const AGENT_APP_GRAPH_BFF_CONTRACT = Object.freeze({
  contractId: "agent_app_graph_bff_v1",
  documentType: "agent_app_graph",
  endpoints: [
    "GET /agent/app-graph/screen/:screenId",
    "GET /agent/app-graph/action/:buttonId",
    "POST /agent/app-graph/resolve",
    "POST /agent/intel/compare",
  ],
  readOnly: true,
  roleScoped: true,
  evidenceBacked: true,
  mutationCount: 0,
  directDatabaseAccess: 0,
  modelProviderImports: 0,
  externalLiveFetchEnabled: false,
  executionEnabled: false,
} as const);

export const AGENT_EXTERNAL_INTEL_BFF_CONTRACT = Object.freeze({
  contractId: "agent_external_intel_bff_v1",
  documentType: "agent_external_intel",
  endpoints: [
    "GET /agent/external-intel/sources",
    "POST /agent/external-intel/search/preview",
  ],
  liveEnabled: false,
  provider: "disabled",
  readOnly: true,
  roleScoped: true,
  citationsRequired: true,
  checkedAtRequired: true,
  rawHtmlReturned: false,
  mutationCount: 0,
  directDatabaseAccess: 0,
  modelProviderImports: 0,
  finalActionAllowed: false,
  supplierConfirmationAllowed: false,
  orderCreationAllowed: false,
} as const);

export const AGENT_PROCUREMENT_BFF_CONTRACT = Object.freeze({
  contractId: "agent_procurement_bff_v1",
  documentType: "agent_procurement",
  endpoints: [
    "GET /agent/procurement/request-context/:requestId",
    "POST /agent/procurement/supplier-match/preview",
    "POST /agent/procurement/external-supplier-candidates/preview",
    "POST /agent/procurement/draft-request/preview",
    "POST /agent/procurement/submit-for-approval",
    "POST /agent/procurement/live-supplier-chain/preview",
    "POST /agent/procurement/live-supplier-chain/draft",
    "POST /agent/procurement/live-supplier-chain/submit-for-approval",
    "GET /agent/procurement/copilot/context",
    "POST /agent/procurement/copilot/plan",
    "POST /agent/procurement/copilot/draft-preview",
    "POST /agent/procurement/copilot/submit-for-approval-preview",
  ],
  readOnly: true,
  roleScoped: true,
  evidenceBacked: true,
  mutationCount: 0,
  directDatabaseAccess: 0,
  modelProviderImports: 0,
  externalLiveFetchEnabled: false,
  finalActionExecutionEnabled: false,
  supplierSelectionFinalized: false,
  liveSupplierChainContract: AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT.contractId,
} as const);

export const AGENT_APPROVAL_INBOX_BFF_CONTRACT = AI_APPROVAL_INBOX_BFF_CONTRACT;

export const AGENT_BFF_ROUTE_DEFINITIONS = Object.freeze([
  {
    operation: "agent.approval_inbox.read",
    method: "GET",
    endpoint: "GET /agent/approval-inbox",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentApprovalInboxEnvelope",
  },
  {
    operation: "agent.approval_inbox.detail",
    method: "GET",
    endpoint: "GET /agent/approval-inbox/:actionId",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentApprovalInboxEnvelope",
  },
  {
    operation: "agent.approval_inbox.approve",
    method: "POST",
    endpoint: "POST /agent/approval-inbox/:actionId/approve",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentApprovalInboxEnvelope",
  },
  {
    operation: "agent.approval_inbox.reject",
    method: "POST",
    endpoint: "POST /agent/approval-inbox/:actionId/reject",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentApprovalInboxEnvelope",
  },
  {
    operation: "agent.approval_inbox.edit_preview",
    method: "POST",
    endpoint: "POST /agent/approval-inbox/:actionId/edit-preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentApprovalInboxEnvelope",
  },
  {
    operation: "agent.approval_inbox.execute_approved",
    method: "POST",
    endpoint: "POST /agent/approval-inbox/:actionId/execute-approved",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentApprovalInboxEnvelope",
  },
  {
    operation: "agent.action.submit_for_approval",
    method: "POST",
    endpoint: "POST /agent/action/submit-for-approval",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentActionLedgerEnvelope",
  },
  {
    operation: "agent.action.status",
    method: "GET",
    endpoint: "GET /agent/action/:actionId/status",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentActionLedgerEnvelope",
  },
  {
    operation: "agent.action.approve",
    method: "POST",
    endpoint: "POST /agent/action/:actionId/approve",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentActionLedgerEnvelope",
  },
  {
    operation: "agent.action.reject",
    method: "POST",
    endpoint: "POST /agent/action/:actionId/reject",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentActionLedgerEnvelope",
  },
  {
    operation: "agent.action.execute_approved",
    method: "POST",
    endpoint: "POST /agent/action/:actionId/execute-approved",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentActionLedgerEnvelope",
  },
  {
    operation: "agent.action.execution_status",
    method: "GET",
    endpoint: "GET /agent/action/:actionId/execution-status",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentActionLedgerEnvelope",
  },
  {
    operation: "agent.screen_runtime.read",
    method: "GET",
    endpoint: "GET /agent/screen-runtime/:screenId",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentScreenRuntimeEnvelope",
  },
  {
    operation: "agent.screen_runtime.intent_preview",
    method: "POST",
    endpoint: "POST /agent/screen-runtime/:screenId/intent-preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentScreenRuntimeEnvelope",
  },
  {
    operation: "agent.screen_runtime.action_plan",
    method: "POST",
    endpoint: "POST /agent/screen-runtime/:screenId/action-plan",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentScreenRuntimeEnvelope",
  },
  {
    operation: "agent.screen_actions.read",
    method: "GET",
    endpoint: "GET /agent/screen-actions/:screenId",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentScreenActionEnvelope",
  },
  {
    operation: "agent.screen_actions.intent_preview",
    method: "POST",
    endpoint: "POST /agent/screen-actions/:screenId/intent-preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentScreenActionEnvelope",
  },
  {
    operation: "agent.screen_actions.action_plan",
    method: "POST",
    endpoint: "POST /agent/screen-actions/:screenId/action-plan",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentScreenActionEnvelope",
  },
  {
    operation: "agent.external_intel.sources.read",
    method: "GET",
    endpoint: "GET /agent/external-intel/sources",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentExternalIntelEnvelope",
  },
  {
    operation: "agent.external_intel.search.preview",
    method: "POST",
    endpoint: "POST /agent/external-intel/search/preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentExternalIntelEnvelope",
  },
  {
    operation: "agent.procurement.request_context.read",
    method: "GET",
    endpoint: "GET /agent/procurement/request-context/:requestId",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentProcurementEnvelope",
  },
  {
    operation: "agent.procurement.supplier_match.preview",
    method: "POST",
    endpoint: "POST /agent/procurement/supplier-match/preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentProcurementEnvelope",
  },
  {
    operation: "agent.procurement.external_supplier_candidates.preview",
    method: "POST",
    endpoint: "POST /agent/procurement/external-supplier-candidates/preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentProcurementEnvelope",
  },
  {
    operation: "agent.procurement.draft_request.preview",
    method: "POST",
    endpoint: "POST /agent/procurement/draft-request/preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentProcurementEnvelope",
  },
  {
    operation: "agent.procurement.submit_for_approval",
    method: "POST",
    endpoint: "POST /agent/procurement/submit-for-approval",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentProcurementEnvelope",
  },
  {
    operation: "agent.procurement.live_supplier_chain.preview",
    method: "POST",
    endpoint: "POST /agent/procurement/live-supplier-chain/preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentProcurementEnvelope",
  },
  {
    operation: "agent.procurement.live_supplier_chain.draft",
    method: "POST",
    endpoint: "POST /agent/procurement/live-supplier-chain/draft",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentProcurementEnvelope",
  },
  {
    operation: "agent.procurement.live_supplier_chain.submit_for_approval",
    method: "POST",
    endpoint: "POST /agent/procurement/live-supplier-chain/submit-for-approval",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentProcurementEnvelope",
  },
  {
    operation: "agent.procurement.copilot.context.read",
    method: "GET",
    endpoint: "GET /agent/procurement/copilot/context",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentProcurementEnvelope",
  },
  {
    operation: "agent.procurement.copilot.plan.preview",
    method: "POST",
    endpoint: "POST /agent/procurement/copilot/plan",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentProcurementEnvelope",
  },
  {
    operation: "agent.procurement.copilot.draft_preview",
    method: "POST",
    endpoint: "POST /agent/procurement/copilot/draft-preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentProcurementEnvelope",
  },
  {
    operation: "agent.procurement.copilot.submit_for_approval.preview",
    method: "POST",
    endpoint: "POST /agent/procurement/copilot/submit-for-approval-preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentProcurementEnvelope",
  },
  {
    operation: "agent.app_graph.screen.read",
    method: "GET",
    endpoint: "GET /agent/app-graph/screen/:screenId",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentAppGraphEnvelope",
  },
  {
    operation: "agent.app_graph.action.read",
    method: "GET",
    endpoint: "GET /agent/app-graph/action/:buttonId",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentAppGraphEnvelope",
  },
  {
    operation: "agent.app_graph.resolve",
    method: "POST",
    endpoint: "POST /agent/app-graph/resolve",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentAppGraphEnvelope",
  },
  {
    operation: "agent.intel.compare",
    method: "POST",
    endpoint: "POST /agent/intel/compare",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentIntelCompareEnvelope",
  },
  {
    operation: "agent.task_stream.read",
    method: "GET",
    endpoint: "GET /agent/task-stream",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentTaskStreamEnvelope",
  },
  {
    operation: "agent.workday.tasks.read",
    method: "GET",
    endpoint: "GET /agent/workday/tasks",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentWorkdayTaskEnvelope",
  },
  {
    operation: "agent.workday.tasks.preview",
    method: "POST",
    endpoint: "POST /agent/workday/tasks/:taskId/preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentWorkdayTaskEnvelope",
  },
  {
    operation: "agent.workday.tasks.action_plan",
    method: "POST",
    endpoint: "POST /agent/workday/tasks/:taskId/action-plan",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentWorkdayTaskEnvelope",
  },
  {
    operation: "agent.workday.live_evidence.read",
    method: "GET",
    endpoint: "GET /agent/workday/live-evidence-tasks",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentWorkdayLiveEvidenceEnvelope",
  },
  {
    operation: "agent.tools.list",
    method: "GET",
    endpoint: "GET /agent/tools",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentBffRouteShellEnvelope",
  },
  {
    operation: "agent.tools.validate",
    method: "POST",
    endpoint: "POST /agent/tools/:name/validate",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentBffRouteShellEnvelope",
  },
  {
    operation: "agent.tools.preview",
    method: "POST",
    endpoint: "POST /agent/tools/:name/preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentBffRouteShellEnvelope",
  },
] as const satisfies readonly AgentBffRouteDefinition[]);

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

function normalizePageLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 20;
  const whole = Math.trunc(value ?? 20);
  if (whole < 1) return 1;
  if (whole > 50) return 50;
  return whole;
}

function normalizeCursor(value: string | null | undefined): number | null {
  if (value === undefined || value === null || value.trim().length === 0) return 0;
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

function hasEvidence(card: AgentTaskStreamCard): boolean {
  return card.evidenceRefs.some((ref) => ref.trim().length > 0);
}

function canSeeTaskStreamCard(card: AgentTaskStreamCard, auth: AgentBffAuthContext): boolean {
  if (!hasEvidence(card)) return false;
  if (auth.role === "director" || auth.role === "control") return true;
  if (!canUseAiCapability({ role: auth.role, domain: card.domain, capability: "read_context" })) {
    return false;
  }
  if (card.scope.kind === "cross_domain") return false;
  if (card.scope.kind === "role_domain") return card.scope.allowedRoles.includes(auth.role);
  return card.scope.ownerUserIdHash === auth.userId;
}

function sortTaskStreamCards(cards: readonly AgentTaskStreamCard[]): AgentTaskStreamCard[] {
  return [...cards].sort((left, right) => {
    const dateDelta = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    if (dateDelta !== 0 && Number.isFinite(dateDelta)) return dateDelta;
    return left.id.localeCompare(right.id);
  });
}

function countTaskStreamCardsByType(cards: readonly AgentTaskStreamCard[]): Record<string, number> {
  return cards.reduce<Record<string, number>>((acc, card) => {
    acc[card.type] = (acc[card.type] ?? 0) + 1;
    return acc;
  }, {});
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

function appGraphAuthRequiredError(): AgentAppGraphEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_APP_GRAPH_AUTH_REQUIRED",
      message: "Agent app graph route requires authenticated role context",
    },
  };
}

function intelCompareAuthRequiredError(): AgentIntelCompareEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_INTEL_COMPARE_AUTH_REQUIRED",
      message: "Agent intelligence compare route requires authenticated role context",
    },
  };
}

export function getAgentAppGraphScreen(
  request: AgentAppGraphScreenRequest,
): AgentAppGraphEnvelope {
  if (!isAuthenticated(request.auth)) return appGraphAuthRequiredError();

  const result = getAiAppGraphScreenDto({
    role: request.auth.role,
    screenId: request.screenId,
  });
  if (!result) {
    return {
      ok: false,
      error: {
        code: "AGENT_APP_GRAPH_SCREEN_BLOCKED",
        message: "Agent app graph screen is blocked or unknown for this role",
      },
    };
  }

  return {
    ok: true,
    data: {
      contractId: AGENT_APP_GRAPH_BFF_CONTRACT.contractId,
      documentType: "agent_app_graph_screen",
      endpoint: "GET /agent/app-graph/screen/:screenId",
      result,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      readOnly: true,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export function getAgentAppGraphAction(
  request: AgentAppGraphActionRequest,
): AgentAppGraphEnvelope {
  if (!isAuthenticated(request.auth)) return appGraphAuthRequiredError();

  const result = getAiAppGraphActionDto({
    role: request.auth.role,
    screenId: request.screenId,
    buttonId: request.buttonId,
  });
  if (!result) {
    return {
      ok: false,
      error: {
        code: "AGENT_APP_GRAPH_ACTION_BLOCKED",
        message: "Agent app graph action is blocked or unknown for this role",
      },
    };
  }

  return {
    ok: true,
    data: {
      contractId: AGENT_APP_GRAPH_BFF_CONTRACT.contractId,
      documentType: "agent_app_graph_action",
      endpoint: "GET /agent/app-graph/action/:buttonId",
      result,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      readOnly: true,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export function resolveAgentAppGraph(
  request: AgentAppGraphResolveRequest,
): AgentAppGraphEnvelope {
  if (!isAuthenticated(request.auth)) return appGraphAuthRequiredError();

  const result = resolveAiActionGraph({
    role: request.auth.role,
    screenId: request.screenId,
    buttonId: request.buttonId,
    evidenceRefs: request.evidenceRefs,
  });
  if (result.status === "blocked") {
    return {
      ok: false,
      error: {
        code: "AGENT_APP_GRAPH_ACTION_BLOCKED",
        message: result.reason,
      },
    };
  }

  return {
    ok: true,
    data: {
      contractId: AGENT_APP_GRAPH_BFF_CONTRACT.contractId,
      documentType: "agent_app_graph_resolve",
      endpoint: "POST /agent/app-graph/resolve",
      result,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      readOnly: true,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

function normalizeIntelCompareCitations(
  citations: readonly ExternalIntelCitation[],
): AgentIntelCompareOutput["citations"] {
  return citations.map((citation) => ({
    sourceId: citation.sourceId,
    title: citation.title,
    urlHash: citation.urlHash,
    checkedAt: citation.checkedAt,
  }));
}

export function compareAgentIntel(
  request: AgentIntelCompareRequest,
): AgentIntelCompareEnvelope {
  if (!isAuthenticated(request.auth)) return intelCompareAuthRequiredError();

  if (!request.input.query.trim() || !request.input.domain.trim()) {
    return {
      ok: false,
      error: {
        code: "AGENT_INTEL_COMPARE_INVALID_INPUT",
        message: "Agent intelligence compare requires a domain and query",
      },
    };
  }

  const internalFirst = resolveInternalFirstDecision({
    internalEvidenceRefs: request.input.internalEvidenceRefs,
    externalPolicyAllowed: request.input.sourcePolicyIds.length > 0,
    externalRequested: request.input.sourcePolicyIds.length > 0,
    externalLiveFetchEnabled: false,
  });
  const externalIntel = resolveExternalIntel({
    query: request.input.query,
    domain: request.input.domain,
    sourcePolicyIds: request.input.sourcePolicyIds,
    internalEvidenceRefs: internalFirst.evidenceRefs,
  });
  const citations = normalizeIntelCompareCitations(externalIntel.citations);
  const evidenceRefs = [...new Set([...internalFirst.evidenceRefs, ...externalIntel.evidenceRefs])];
  const hasEvidence = evidenceRefs.length > 0;

  return {
    ok: true,
    data: {
      contractId: "agent_intel_compare_bff_v1",
      documentType: "agent_intel_compare",
      endpoint: "POST /agent/intel/compare",
      result: {
        internalFirstSummary: internalFirst.reason,
        externalComparisonSummary: externalIntel.reason,
        evidenceRefs,
        citations,
        confidence: hasEvidence ? "medium" : "low",
        nextAction: hasEvidence ? "draft" : "explain",
        mutationCount: 0,
        providerCalled: false,
        externalLiveFetchEnabled: false,
      },
      roleScoped: true,
      readOnly: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

function externalIntelAuthRequiredError(): AgentExternalIntelEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_EXTERNAL_INTEL_AUTH_REQUIRED",
      message: "Agent external intelligence route requires authenticated role context",
    },
  };
}

export function getAgentExternalIntelSources(
  request: AgentExternalIntelSourcesRequest,
): AgentExternalIntelEnvelope {
  if (!isAuthenticated(request.auth)) return externalIntelAuthRequiredError();

  const gateway = createExternalIntelGateway();
  return {
    ok: true,
    data: {
      contractId: AGENT_EXTERNAL_INTEL_BFF_CONTRACT.contractId,
      documentType: "agent_external_intel_sources",
      endpoint: "GET /agent/external-intel/sources",
      result: gateway.listSources(),
      roleScoped: true,
      readOnly: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentExternalIntelSearch(
  request: AgentExternalIntelSearchPreviewRequest,
): Promise<AgentExternalIntelEnvelope> {
  if (!isAuthenticated(request.auth)) return externalIntelAuthRequiredError();

  const gateway = createExternalIntelGateway();
  const result = await gateway.searchPreview(request.input);
  return {
    ok: true,
    data: {
      contractId: AGENT_EXTERNAL_INTEL_BFF_CONTRACT.contractId,
      documentType: "agent_external_intel_search_preview",
      endpoint: "POST /agent/external-intel/search/preview",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: result.providerCalled,
      dbAccessedDirectly: false,
    },
  };
}

function procurementAuthRequiredError(): AgentProcurementEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_PROCUREMENT_AUTH_REQUIRED",
      message: "Agent procurement route requires authenticated role context",
    },
  };
}

export function getAgentProcurementRequestContext(
  request: AgentProcurementRequestContextRequest,
): AgentProcurementEnvelope {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const resolverInput: ProcurementRequestContextResolverInput = {
    auth: request.auth,
    requestId: request.requestId,
    screenId: request.screenId,
    cursor: request.cursor,
    organizationId: request.organizationId,
    requestSnapshot: request.requestSnapshot,
  };
  const result = resolveProcurementRequestContext(resolverInput);

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_request_context",
      endpoint: "GET /agent/procurement/request-context/:requestId",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementSupplierMatch(
  request: AgentProcurementSupplierMatchRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await previewProcurementSupplierMatch({
    auth: request.auth,
    context: request.context,
    input: request.input,
    externalRequested: request.externalRequested,
    externalSourcePolicyIds: request.externalSourcePolicyIds,
    searchCatalogItems: request.searchCatalogItems,
    listSuppliers: request.listSuppliers,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_supplier_match_preview",
      endpoint: "POST /agent/procurement/supplier-match/preview",
      result: result.output,
      toolBoundary: "search_catalog_and_compare_suppliers_only",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementExternalSupplierCandidates(
  request: AgentProcurementExternalSupplierCandidatesRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await previewAiExternalSupplierCandidatesCanary({
    auth: request.auth,
    input: request.input,
    sourcePolicyIds: request.sourcePolicyIds,
    gateway: request.externalGateway,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_external_supplier_candidates_preview",
      endpoint: "POST /agent/procurement/external-supplier-candidates/preview",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementDraftRequest(
  request: AgentProcurementDraftRequestPreviewRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await buildProcurementDraftPreview({
    auth: request.auth,
    input: request.input,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_draft_request_preview",
      endpoint: "POST /agent/procurement/draft-request/preview",
      result: result.output,
      toolBoundary: "draft_request_only",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

function blockedProcurementApproval(
  input: ProcurementApprovalPreviewInput,
): ProcurementApprovalPreviewOutput {
  return {
    status: "blocked",
    blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY",
    approvalRequired: true,
    idempotencyRequired: true,
    auditRequired: true,
    redactedPayloadOnly: true,
    persisted: false,
    mutationCount: 0,
    finalExecution: 0,
    evidenceRefs: input.evidenceRefs.filter((ref) => ref.trim().length > 0),
  };
}

export function submitAgentProcurementForApproval(
  request: AgentProcurementSubmitForApprovalRequest,
): AgentProcurementEnvelope {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = AI_PERSISTENT_APPROVAL_QUEUE_READINESS.persistentBackendFound
    ? blockedProcurementApproval(request.input)
    : blockedProcurementApproval(request.input);

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_submit_for_approval",
      endpoint: "POST /agent/procurement/submit-for-approval",
      result,
      approvalRequired: true,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

async function runAgentProcurementLiveSupplierChain(
  request: AgentProcurementLiveSupplierChainRequest,
  documentType: AgentProcurementLiveSupplierChainDto["documentType"],
  endpoint: AgentProcurementLiveSupplierChainDto["endpoint"],
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await runAiProcurementLiveSupplierChain({
    auth: request.auth,
    requestId: request.requestId,
    screenId: request.screenId,
    organizationId: request.organizationId,
    cursor: request.cursor,
    requestSnapshot: request.requestSnapshot,
    externalRequested: request.externalRequested,
    externalSourcePolicyIds: request.externalSourcePolicyIds,
    searchCatalogItems: request.searchCatalogItems,
    listSuppliers: request.listSuppliers,
    externalGateway: request.externalGateway,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType,
      endpoint,
      result,
      runtimeBoundary: "internal_context_marketplace_compare_draft_approval",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      approvalRequired: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementLiveSupplierChain(
  request: AgentProcurementLiveSupplierChainRequest,
): Promise<AgentProcurementEnvelope> {
  return runAgentProcurementLiveSupplierChain(
    request,
    "agent_procurement_live_supplier_chain_preview",
    "POST /agent/procurement/live-supplier-chain/preview",
  );
}

export async function draftAgentProcurementLiveSupplierChain(
  request: AgentProcurementLiveSupplierChainRequest,
): Promise<AgentProcurementEnvelope> {
  return runAgentProcurementLiveSupplierChain(
    request,
    "agent_procurement_live_supplier_chain_draft",
    "POST /agent/procurement/live-supplier-chain/draft",
  );
}

export async function submitAgentProcurementLiveSupplierChainForApproval(
  request: AgentProcurementLiveSupplierChainRequest,
): Promise<AgentProcurementEnvelope> {
  return runAgentProcurementLiveSupplierChain(
    request,
    "agent_procurement_live_supplier_chain_submit_for_approval",
    "POST /agent/procurement/live-supplier-chain/submit-for-approval",
  );
}

export function getAgentProcurementCopilotContext(
  request: AgentProcurementCopilotContextRequest,
): AgentProcurementEnvelope {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = resolveProcurementCopilotContext({
    auth: request.auth,
    input: {
      requestId: request.requestId,
      screenId: request.screenId,
      cursor: request.cursor,
      organizationId: request.organizationId,
      requestSnapshot: request.requestSnapshot,
    },
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_copilot_context",
      endpoint: "GET /agent/procurement/copilot/context",
      result: result.context,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementCopilotPlan(
  request: AgentProcurementCopilotPlanRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await buildProcurementCopilotPlan({
    auth: request.auth,
    input: request.input,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_copilot_plan",
      endpoint: "POST /agent/procurement/copilot/plan",
      result: result.plan,
      runtimeBoundary: "internal_context_marketplace_compare_external_status_draft_approval",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementCopilotDraft(
  request: AgentProcurementCopilotDraftPreviewRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await buildProcurementCopilotDraftPreview({
    auth: request.auth,
    input: request.input,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_copilot_draft_preview",
      endpoint: "POST /agent/procurement/copilot/draft-preview",
      result,
      toolBoundary: "draft_request_only",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export function previewAgentProcurementCopilotSubmitForApproval(
  request: AgentProcurementCopilotSubmitForApprovalPreviewRequest,
): AgentProcurementEnvelope {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = previewProcurementCopilotSubmitForApproval(request.input);

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_copilot_submit_for_approval_preview",
      endpoint: "POST /agent/procurement/copilot/submit-for-approval-preview",
      result,
      approvalRequired: true,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export function getAgentTaskStream(request: AgentTaskStreamRequest): AgentTaskStreamEnvelope {
  if (!isAuthenticated(request.auth)) {
    return {
      ok: false,
      error: {
        code: "AGENT_TASK_STREAM_AUTH_REQUIRED",
        message: "Agent task stream requires authenticated role context",
      },
    };
  }

  const offset = normalizeCursor(request.page?.cursor);
  if (offset === null) {
    return {
      ok: false,
      error: {
        code: "AGENT_TASK_STREAM_INVALID_PAGE",
        message: "Agent task stream cursor must be a non-negative integer string",
      },
    };
  }

  const auth = request.auth;
  const limit = normalizePageLimit(request.page?.limit);
  const runtime =
    request.sourceCards === undefined
      ? loadAiTaskStreamRuntime({
          auth,
          screenId: request.screenId ?? "ai.command.center",
          cursor: null,
          limit: 50,
          evidence: request.runtimeEvidence,
        })
      : null;
  const sourceCards = request.sourceCards ?? runtime?.cards ?? [];
  const visibleCards = sortTaskStreamCards(sourceCards).filter((card) =>
    canSeeTaskStreamCard(card, auth),
  );
  const pageCards = visibleCards.slice(offset, offset + limit);
  const nextOffset = offset + pageCards.length;
  const nextCursor = nextOffset < visibleCards.length ? String(nextOffset) : null;

  return {
    ok: true,
    data: {
      contractId: AGENT_TASK_STREAM_BFF_CONTRACT.contractId,
      documentType: AGENT_TASK_STREAM_BFF_CONTRACT.documentType,
      endpoint: AGENT_TASK_STREAM_BFF_CONTRACT.endpoint,
      cards: pageCards,
      page: {
        limit,
        cursor: request.page?.cursor ?? null,
        nextCursor,
      },
      paginated: true,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      readOnly: true,
      executed: false,
      providerCalled: false,
      dbAccessedDirectly: false,
      source: "bff:agent_task_stream_v1",
      runtimeStatus:
        runtime?.status ?? (pageCards.length > 0 ? "loaded" : "empty"),
      blockedReason: runtime?.blockedReason ?? null,
      countsByType: runtime?.countsByType ?? countTaskStreamCardsByType(pageCards),
    },
  };
}
