import { hasDirectorFullAiAccess, type AiUserRole } from "../policy/aiRolePolicy";
import { runDraftReportToolDraftOnly } from "../tools/draftReportTool";
import {
  aiFieldContextHasEvidence,
  buildAiFieldEvidenceRefs,
  evidenceRefsForDraftTool,
  fieldEvidenceRequiredSatisfied,
} from "./aiFieldEvidencePolicy";
import {
  availableAiFieldIntents,
  availableAiFieldTools,
  canDraftAiForemanReport,
  resolveAiFieldRoleScope,
} from "./aiFieldRoleScope";
import type {
  AiFieldContextResult,
  AiFieldEmptyState,
  AiFieldEvidenceRef,
  AiFieldWorkAuthContext,
  AiFieldWorkCopilotInput,
  AiFieldWorkScope,
  AiForemanReportDraft,
} from "./aiFieldWorkCopilotTypes";

export const AI_FOREMAN_REPORT_DRAFT_ENGINE_CONTRACT = Object.freeze({
  contractId: "ai_foreman_report_draft_engine_v1",
  sourceTool: "draft_report",
  backendFirst: true,
  roleScoped: true,
  draftOnly: true,
  evidenceRequired: true,
  mutationCount: 0,
  dbWrites: 0,
  directSupabaseFromUi: false,
  mobileExternalFetch: false,
  externalLiveFetch: false,
  providerCalled: false,
  finalExecution: 0,
  reportPublished: false,
  fakeFieldCards: false,
  hardcodedAiAnswer: false,
} as const);

function isAuthenticated(auth: AiFieldWorkAuthContext | null): auth is AiFieldWorkAuthContext {
  return Boolean(auth && auth.userId.trim().length > 0 && auth.role !== "unknown");
}

function emptyState(reason: string): AiFieldEmptyState {
  return {
    reason,
    honestEmptyState: true,
    fakeFieldCards: false,
    mutationCount: 0,
  };
}

function baseContextResult(params: {
  status: AiFieldContextResult["status"];
  role: AiUserRole;
  roleScope?: AiFieldWorkScope | null;
  input?: AiFieldWorkCopilotInput;
  evidenceRefs?: readonly AiFieldEvidenceRef[];
  blockedReason?: string | null;
  emptyReason?: string | null;
  contractorOwnScopeEnforced?: boolean;
}): AiFieldContextResult {
  const fieldContext = params.input?.fieldContext ?? null;
  const evidenceRefs = params.evidenceRefs ?? [];

  return {
    status: params.status,
    role: params.role,
    roleScope: params.roleScope ?? null,
    fieldContext,
    emptyState:
      params.status === "empty"
        ? emptyState(params.emptyReason ?? "No eligible redacted field work evidence is available.")
        : null,
    blockedReason: params.blockedReason ?? null,
    evidenceRefs,
    availableTools: availableAiFieldTools(params.role),
    availableIntents: availableAiFieldIntents(params.role),
    roleScoped: true,
    developerControlFullAccess: hasDirectorFullAiAccess(params.role),
    roleIsolationE2eClaimed: false,
    contractorOwnScopeEnforced: params.contractorOwnScopeEnforced ?? params.role === "contractor",
    roleLeakageObserved: false,
    evidenceRequired: true,
    allContextHasEvidence: aiFieldContextHasEvidence(fieldContext, evidenceRefs),
    allToolsKnown: availableAiFieldTools(params.role).length === availableAiFieldIntents(params.role).length ||
      availableAiFieldTools(params.role).length > 0,
    readOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    directSupabaseFromUi: false,
    mobileExternalFetch: false,
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

export async function buildAiFieldContext(params: {
  auth: AiFieldWorkAuthContext | null;
  input?: AiFieldWorkCopilotInput;
}): Promise<AiFieldContextResult> {
  const role = params.auth?.role ?? "unknown";
  if (!isAuthenticated(params.auth)) {
    return baseContextResult({
      status: "blocked",
      role,
      input: params.input,
      blockedReason: "AI field work copilot requires authenticated role context.",
    });
  }

  const scopeDecision = resolveAiFieldRoleScope({
    role: params.auth.role,
    context: params.input?.fieldContext ?? null,
  });
  if (!scopeDecision.allowed) {
    return baseContextResult({
      status: "blocked",
      role: params.auth.role,
      roleScope: scopeDecision.roleScope,
      input: params.input,
      blockedReason: scopeDecision.exactReason,
      contractorOwnScopeEnforced: scopeDecision.contractorOwnScopeEnforced,
    });
  }

  const evidenceRefs = buildAiFieldEvidenceRefs(params.input?.fieldContext ?? null);
  if (!fieldEvidenceRequiredSatisfied(evidenceRefs)) {
    return baseContextResult({
      status: "empty",
      role: params.auth.role,
      roleScope: scopeDecision.roleScope,
      input: params.input,
      evidenceRefs,
      emptyReason: "No redacted field evidence refs were supplied by the field context source.",
      contractorOwnScopeEnforced: scopeDecision.contractorOwnScopeEnforced,
    });
  }

  return baseContextResult({
    status: "loaded",
    role: params.auth.role,
    roleScope: scopeDecision.roleScope,
    input: params.input,
    evidenceRefs,
    contractorOwnScopeEnforced: scopeDecision.contractorOwnScopeEnforced,
  });
}

function blockedReportDraft(params: {
  role: AiUserRole;
  reason: string;
  status?: "empty" | "blocked";
  evidenceRefs?: readonly AiFieldEvidenceRef[];
  contractorOwnScopeEnforced?: boolean;
}): AiForemanReportDraft {
  return {
    status: params.status ?? "blocked",
    role: params.role,
    title: params.status === "empty" ? "Foreman report draft empty" : "Foreman report draft blocked",
    summary: params.reason,
    draft: null,
    evidenceRefs: params.evidenceRefs ?? [],
    suggestedToolId: params.status === "empty" ? "draft_report" : null,
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

export async function draftAiForemanReport(params: {
  auth: AiFieldWorkAuthContext | null;
  input?: AiFieldWorkCopilotInput;
}): Promise<AiForemanReportDraft> {
  const role = params.auth?.role ?? "unknown";
  if (!isAuthenticated(params.auth)) {
    return blockedReportDraft({
      role,
      reason: "AI foreman report draft requires authenticated role context.",
    });
  }
  if (!canDraftAiForemanReport(params.auth.role)) {
    return blockedReportDraft({
      role: params.auth.role,
      reason: "AI foreman report draft is limited to director/control and foreman roles.",
    });
  }

  const context = await buildAiFieldContext(params);
  if (context.status === "blocked") {
    return blockedReportDraft({
      role: params.auth.role,
      reason: context.blockedReason ?? "Field context is blocked.",
      contractorOwnScopeEnforced: context.contractorOwnScopeEnforced,
    });
  }
  if (context.status === "empty" || !context.fieldContext) {
    return blockedReportDraft({
      role: params.auth.role,
      status: "empty",
      reason: context.emptyState?.reason ?? "No redacted field context is available for report drafting.",
      evidenceRefs: context.evidenceRefs,
      contractorOwnScopeEnforced: context.contractorOwnScopeEnforced,
    });
  }

  const evidenceRefs = evidenceRefsForDraftTool(context.evidenceRefs);
  const envelope = await runDraftReportToolDraftOnly({
    auth: params.auth,
    input: {
      object_id: context.fieldContext.objectId ?? "field_object:redacted",
      report_kind: params.input?.reportKind ?? "daily",
      period_start: context.fieldContext.periodStart,
      period_end: context.fieldContext.periodEnd,
      notes: params.input?.notes ?? context.fieldContext.workSummary,
      source_evidence_refs: evidenceRefs,
    },
  });

  if (!envelope.ok) {
    return blockedReportDraft({
      role: params.auth.role,
      reason: envelope.error.code,
      evidenceRefs: context.evidenceRefs,
      contractorOwnScopeEnforced: context.contractorOwnScopeEnforced,
    });
  }

  return {
    status: "draft",
    role: params.auth.role,
    title: "Foreman report draft ready",
    summary: "Redacted field evidence supports a draft-only report for human review.",
    draft: envelope.data,
    evidenceRefs: context.evidenceRefs,
    suggestedToolId: "draft_report",
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
