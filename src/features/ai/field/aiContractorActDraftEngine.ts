import { runDraftActToolDraftOnly } from "../tools/draftActTool";
import {
  evidenceRefsForDraftTool,
  fieldEvidenceRequiredSatisfied,
} from "./aiFieldEvidencePolicy";
import { buildAiFieldContext } from "./aiForemanReportDraftEngine";
import {
  canDraftAiContractorAct,
  toolForAiFieldIntent,
  toolKnownForAiFieldCopilot,
} from "./aiFieldRoleScope";
import type {
  AiContractorActDraft,
  AiFieldActionPlan,
  AiFieldEvidenceRef,
  AiFieldWorkAuthContext,
  AiFieldWorkClassification,
  AiFieldWorkCopilotInput,
  AiFieldWorkIntent,
  AiFieldWorkMode,
  AiFieldWorkRiskLevel,
} from "./aiFieldWorkCopilotTypes";

export const AI_CONTRACTOR_ACT_DRAFT_ENGINE_CONTRACT = Object.freeze({
  contractId: "ai_contractor_act_draft_engine_v1",
  sourceTool: "draft_act",
  backendFirst: true,
  roleScoped: true,
  contractorOwnScopeEnforced: true,
  draftOnly: true,
  evidenceRequired: true,
  mutationCount: 0,
  dbWrites: 0,
  directSupabaseFromUi: false,
  mobileExternalFetch: false,
  externalLiveFetch: false,
  providerCalled: false,
  finalExecution: 0,
  actSigned: false,
  contractorConfirmation: false,
  paymentMutation: false,
  warehouseMutation: false,
  fakeFieldCards: false,
  hardcodedAiAnswer: false,
} as const);

function isAuthenticated(auth: AiFieldWorkAuthContext | null): auth is AiFieldWorkAuthContext {
  return Boolean(auth && auth.userId.trim().length > 0 && auth.role !== "unknown");
}

function blockedActDraft(params: {
  role: AiContractorActDraft["role"];
  reason: string;
  status?: "empty" | "blocked";
  evidenceRefs?: readonly AiFieldEvidenceRef[];
  contractorOwnScopeEnforced?: boolean;
}): AiContractorActDraft {
  return {
    status: params.status ?? "blocked",
    role: params.role,
    title: params.status === "empty" ? "Contractor act draft empty" : "Contractor act draft blocked",
    summary: params.reason,
    draft: null,
    evidenceRefs: params.evidenceRefs ?? [],
    suggestedToolId: params.status === "empty" ? "draft_act" : null,
    suggestedMode: params.status === "empty" ? "draft_only" : "forbidden",
    approvalRequired: false,
    deterministic: true,
    roleScoped: true,
    evidenceBacked: fieldEvidenceRequiredSatisfied(params.evidenceRefs ?? []),
    contractorOwnScopeEnforced: params.contractorOwnScopeEnforced ?? params.role === "contractor",
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    reportPublished: false,
    actSigned: false,
    contractorConfirmation: false,
    paymentMutation: false,
    warehouseMutation: false,
    fakeFieldCards: false,
    hardcodedAiAnswer: false,
  };
}

export async function draftAiContractorAct(params: {
  auth: AiFieldWorkAuthContext | null;
  input?: AiFieldWorkCopilotInput;
}): Promise<AiContractorActDraft> {
  const role = params.auth?.role ?? "unknown";
  if (!isAuthenticated(params.auth)) {
    return blockedActDraft({
      role,
      reason: "AI contractor act draft requires authenticated role context.",
    });
  }
  if (!canDraftAiContractorAct(params.auth.role)) {
    return blockedActDraft({
      role: params.auth.role,
      reason: "AI contractor act draft is limited to director/control, foreman, and contractor roles.",
    });
  }

  const context = await buildAiFieldContext(params);
  if (context.status === "blocked") {
    return blockedActDraft({
      role: params.auth.role,
      reason: context.blockedReason ?? "Field context is blocked.",
      contractorOwnScopeEnforced: context.contractorOwnScopeEnforced,
    });
  }
  if (context.status === "empty" || !context.fieldContext) {
    return blockedActDraft({
      role: params.auth.role,
      status: "empty",
      reason: context.emptyState?.reason ?? "No redacted field context is available for act drafting.",
      evidenceRefs: context.evidenceRefs,
      contractorOwnScopeEnforced: context.contractorOwnScopeEnforced,
    });
  }

  const workItems = context.fieldContext.workItems ?? [];
  if (workItems.length === 0) {
    return blockedActDraft({
      role: params.auth.role,
      status: "empty",
      reason: "No redacted work item evidence is available for contractor act drafting.",
      evidenceRefs: context.evidenceRefs,
      contractorOwnScopeEnforced: context.contractorOwnScopeEnforced,
    });
  }

  const envelope = await runDraftActToolDraftOnly({
    auth: params.auth,
    input: {
      subcontract_id: context.fieldContext.subcontractId ?? "field_subcontract:redacted",
      act_kind: params.input?.actKind ?? "work_completion",
      work_summary: context.fieldContext.workSummary ?? "Redacted field work summary",
      work_items: workItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
      })),
      period_start: context.fieldContext.periodStart,
      period_end: context.fieldContext.periodEnd,
      source_evidence_refs: evidenceRefsForDraftTool(context.evidenceRefs),
      notes: params.input?.notes,
    },
  });

  if (!envelope.ok) {
    return blockedActDraft({
      role: params.auth.role,
      reason: envelope.error.code,
      evidenceRefs: context.evidenceRefs,
      contractorOwnScopeEnforced: context.contractorOwnScopeEnforced,
    });
  }

  return {
    status: "draft",
    role: params.auth.role,
    title: "Contractor act draft ready",
    summary: "Redacted subcontract evidence supports a draft-only act for human review.",
    draft: envelope.data,
    evidenceRefs: context.evidenceRefs,
    suggestedToolId: "draft_act",
    suggestedMode: "draft_only",
    approvalRequired: false,
    deterministic: true,
    roleScoped: true,
    evidenceBacked: true,
    contractorOwnScopeEnforced: context.contractorOwnScopeEnforced,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    reportPublished: false,
    actSigned: false,
    contractorConfirmation: false,
    paymentMutation: false,
    warehouseMutation: false,
    fakeFieldCards: false,
    hardcodedAiAnswer: false,
  };
}

function decisionForIntent(params: {
  intent: AiFieldWorkIntent;
  role: AiFieldActionPlan["role"];
  evidenceBacked: boolean;
  contextBlocked: boolean;
  contextEmpty: boolean;
}): {
  status: AiFieldActionPlan["status"];
  classification: AiFieldWorkClassification;
  mode: AiFieldWorkMode;
  riskLevel: AiFieldWorkRiskLevel;
  approvalRequired: boolean;
  exactReason: string | null;
} {
  if (params.contextBlocked) {
    return {
      status: "blocked",
      classification: "FIELD_ROLE_FORBIDDEN_BLOCKED",
      mode: "forbidden",
      riskLevel: "low",
      approvalRequired: false,
      exactReason: "Field context is blocked for this role.",
    };
  }

  if (!params.evidenceBacked || params.contextEmpty) {
    return {
      status: "empty",
      classification: "FIELD_INSUFFICIENT_EVIDENCE_BLOCKED",
      mode: params.intent === "read_context" ? "safe_read" : "draft_only",
      riskLevel: "low",
      approvalRequired: false,
      exactReason: "No redacted field evidence is available for this action plan.",
    };
  }

  if (params.intent === "read_context") {
    return {
      status: "preview",
      classification: "FIELD_SAFE_READ_RECOMMENDATION",
      mode: "safe_read",
      riskLevel: "low",
      approvalRequired: false,
      exactReason: null,
    };
  }

  if (params.intent === "draft_report") {
    return {
      status: canDraftAiForemanReportForPlan(params.role) ? "preview" : "blocked",
      classification: canDraftAiForemanReportForPlan(params.role)
        ? "FIELD_DRAFT_REPORT_RECOMMENDATION"
        : "FIELD_ROLE_FORBIDDEN_BLOCKED",
      mode: canDraftAiForemanReportForPlan(params.role) ? "draft_only" : "forbidden",
      riskLevel: "medium",
      approvalRequired: false,
      exactReason: canDraftAiForemanReportForPlan(params.role)
        ? null
        : "Draft report is not visible for this role.",
    };
  }

  if (params.intent === "draft_act") {
    return {
      status: canDraftAiContractorAct(params.role) ? "preview" : "blocked",
      classification: canDraftAiContractorAct(params.role)
        ? "FIELD_DRAFT_ACT_RECOMMENDATION"
        : "FIELD_ROLE_FORBIDDEN_BLOCKED",
      mode: canDraftAiContractorAct(params.role) ? "draft_only" : "forbidden",
      riskLevel: "medium",
      approvalRequired: false,
      exactReason: canDraftAiContractorAct(params.role)
        ? null
        : "Draft act is not visible for this role.",
    };
  }

  if (params.intent === "submit_for_approval") {
    return {
      status: "preview",
      classification: "FIELD_APPROVAL_REQUIRED_RECOMMENDATION",
      mode: "approval_required",
      riskLevel: "high",
      approvalRequired: true,
      exactReason: "Field drafts can only be submitted through approval ledger preview in this wave.",
    };
  }

  return {
    status: "blocked",
    classification: "FIELD_FORBIDDEN_RECOMMENDATION_BLOCKED",
    mode: "approval_required",
    riskLevel: "high",
    approvalRequired: true,
    exactReason: "Field publication, act signing, and contractor confirmation require approved execution gateway.",
  };
}

function canDraftAiForemanReportForPlan(role: AiFieldActionPlan["role"]): boolean {
  return role === "director" || role === "control" || role === "foreman";
}

export async function planAiFieldAction(params: {
  auth: AiFieldWorkAuthContext | null;
  input?: AiFieldWorkCopilotInput;
}): Promise<AiFieldActionPlan> {
  const role = params.auth?.role ?? "unknown";
  const intent = params.input?.intent ?? "read_context";
  const context = await buildAiFieldContext(params);
  const tool = toolForAiFieldIntent(intent);
  const toolKnown = tool === null || toolKnownForAiFieldCopilot(tool);
  const decision = toolKnown
    ? decisionForIntent({
        intent,
        role,
        evidenceBacked: fieldEvidenceRequiredSatisfied(context.evidenceRefs),
        contextBlocked: context.status === "blocked",
        contextEmpty: context.status === "empty",
      })
    : {
        status: "blocked" as const,
        classification: "FIELD_UNKNOWN_TOOL_BLOCKED" as const,
        mode: "forbidden" as const,
        riskLevel: "low" as const,
        approvalRequired: false,
        exactReason: "Field action plan references an unknown AI tool.",
      };

  return {
    status: decision.status,
    intent,
    classification: decision.classification,
    role,
    riskLevel: decision.riskLevel,
    suggestedToolId: toolKnown ? tool : null,
    suggestedMode: decision.mode,
    approvalRequired: decision.approvalRequired,
    evidenceRefs: context.evidenceRefs,
    exactReason: decision.exactReason ?? context.blockedReason ?? context.emptyState?.reason ?? null,
    roleScoped: true,
    evidenceBacked: fieldEvidenceRequiredSatisfied(context.evidenceRefs),
    contractorOwnScopeEnforced: context.contractorOwnScopeEnforced,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    providerCalled: false,
    rawRowsReturned: false,
    reportPublished: false,
    actSigned: false,
    contractorConfirmation: false,
    paymentMutation: false,
    warehouseMutation: false,
    fakeFieldCards: false,
  };
}
