import type { AiUserRole } from "../policy/aiRolePolicy";
import { buildAiFieldContext } from "../field/aiForemanReportDraftEngine";
import type {
  AiFieldContextResult,
  AiFieldContextSnapshot,
  AiFieldEvidenceRef,
  AiFieldWorkAuthContext,
  AiFieldWorkCopilotInput,
} from "../field/aiFieldWorkCopilotTypes";

export type AiForemanCloseoutScreenId =
  | "foreman.main"
  | "foreman.ai.quick_modal"
  | "foreman.subcontract";

export type AiForemanEvidenceResolverStatus = "loaded" | "empty" | "blocked";

export type AiForemanEvidenceSummary = {
  fieldContext: string;
  reportContext: string;
  subcontractContext: string;
  messageContext: string;
};

export type AiForemanEvidenceResolverResult = {
  status: AiForemanEvidenceResolverStatus;
  screenId: AiForemanCloseoutScreenId;
  role: AiUserRole;
  fieldContext: AiFieldContextSnapshot | null;
  fieldContextResult: AiFieldContextResult | null;
  evidenceSummary: AiForemanEvidenceSummary;
  evidenceRefs: readonly AiFieldEvidenceRef[];
  evidenceBacked: boolean;
  roleScoped: true;
  coversForemanMain: boolean;
  coversForemanAiQuickModal: boolean;
  coversForemanSubcontract: boolean;
  safeReadOnly: true;
  draftOnly: true;
  approvalCandidateOnly: true;
  finalSubmitAllowed: false;
  signingAllowed: false;
  directSubcontractMutationAllowed: false;
  reportPublished: false;
  actSigned: false;
  messageSent: false;
  subcontractMutated: false;
  contractorConfirmation: false;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  fakeFieldEvidence: false;
  exactReason: string | null;
};

export const AI_FOREMAN_EVIDENCE_RESOLVER_CONTRACT = Object.freeze({
  contractId: "ai_foreman_evidence_resolver_v1",
  screens: ["foreman.main", "foreman.ai.quick_modal", "foreman.subcontract"],
  source: "agent_field_work_copilot_bff_v1",
  safeReadOnly: true,
  draftOnly: true,
  approvalCandidateOnly: true,
  finalSubmitAllowed: false,
  signingAllowed: false,
  directSubcontractMutationAllowed: false,
  mutationCount: 0,
  dbWrites: 0,
  providerCalled: false,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  fakeFieldEvidence: false,
} as const);

const FOREMAN_CLOSEOUT_SCREENS: readonly AiForemanCloseoutScreenId[] = [
  "foreman.main",
  "foreman.ai.quick_modal",
  "foreman.subcontract",
];

function isForemanCloseoutScreenId(value: string): value is AiForemanCloseoutScreenId {
  return FOREMAN_CLOSEOUT_SCREENS.includes(value as AiForemanCloseoutScreenId);
}

function quantity(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return String(Math.round(value));
}

function summaryText(context: AiFieldContextSnapshot | null): AiForemanEvidenceSummary {
  if (!context) {
    return {
      fieldContext: "Foreman field context is not available.",
      reportContext: "Foreman report evidence is not available.",
      subcontractContext: "Foreman subcontract evidence is not available.",
      messageContext: "Foreman message evidence is not available.",
    };
  }

  const workItems = context.workItems ?? [];
  const documents = context.documents ?? [];
  const readyItems = workItems.filter((item) => item.status === "ready_for_act").length;

  return {
    fieldContext:
      `Object ${context.objectId ?? "redacted"} has ${quantity(workItems.length)} work item(s) in scope.`,
    reportContext:
      `${context.workSummary ?? "Redacted field summary"} Evidence refs stay redacted.`,
    subcontractContext:
      `Subcontract ${context.subcontractId ?? "not supplied"} has ${quantity(readyItems)} ready-for-act item(s).`,
    messageContext:
      `Closeout message can cite ${quantity(documents.length)} document ref(s) and ${quantity(workItems.length)} work item(s).`,
  };
}

function baseResult(params: {
  status: AiForemanEvidenceResolverStatus;
  screenId: AiForemanCloseoutScreenId;
  role: AiUserRole;
  fieldContextResult?: AiFieldContextResult | null;
  evidenceRefs?: readonly AiFieldEvidenceRef[];
  exactReason?: string | null;
}): AiForemanEvidenceResolverResult {
  const fieldContextResult = params.fieldContextResult ?? null;
  const fieldContext = fieldContextResult?.fieldContext ?? null;
  const evidenceRefs = params.evidenceRefs ?? fieldContextResult?.evidenceRefs ?? [];
  const evidenceBacked =
    fieldContextResult?.allContextHasEvidence === true &&
    evidenceRefs.length > 0 &&
    evidenceRefs.every((ref) => ref.redacted === true);

  return {
    status: params.status,
    screenId: params.screenId,
    role: params.role,
    fieldContext,
    fieldContextResult,
    evidenceSummary: summaryText(fieldContext),
    evidenceRefs,
    evidenceBacked,
    roleScoped: true,
    coversForemanMain: true,
    coversForemanAiQuickModal: true,
    coversForemanSubcontract: true,
    safeReadOnly: true,
    draftOnly: true,
    approvalCandidateOnly: true,
    finalSubmitAllowed: false,
    signingAllowed: false,
    directSubcontractMutationAllowed: false,
    reportPublished: false,
    actSigned: false,
    messageSent: false,
    subcontractMutated: false,
    contractorConfirmation: false,
    mutationCount: 0,
    dbWrites: 0,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    fakeFieldEvidence: false,
    exactReason: params.exactReason ?? fieldContextResult?.blockedReason ?? fieldContextResult?.emptyState?.reason ?? null,
  };
}

export async function resolveAiForemanEvidence(params: {
  auth: AiFieldWorkAuthContext | null;
  screenId: string;
  input?: AiFieldWorkCopilotInput;
}): Promise<AiForemanEvidenceResolverResult> {
  const screenId = isForemanCloseoutScreenId(params.screenId)
    ? params.screenId
    : "foreman.main";
  const role = params.auth?.role ?? "unknown";

  if (!isForemanCloseoutScreenId(params.screenId)) {
    return baseResult({
      status: "blocked",
      screenId,
      role,
      exactReason:
        "Foreman evidence resolver only covers foreman.main, foreman.ai.quick_modal, and foreman.subcontract.",
    });
  }

  const fieldContextResult = await buildAiFieldContext({
    auth: params.auth,
    input: params.input,
  });

  if (fieldContextResult.status === "blocked") {
    return baseResult({
      status: "blocked",
      screenId,
      role: fieldContextResult.role,
      fieldContextResult,
      exactReason: fieldContextResult.blockedReason ?? "Foreman field evidence route is blocked.",
    });
  }

  if (fieldContextResult.status === "empty") {
    return baseResult({
      status: "empty",
      screenId,
      role: fieldContextResult.role,
      fieldContextResult,
      exactReason: fieldContextResult.emptyState?.reason ?? "No redacted foreman evidence refs were returned.",
    });
  }

  return baseResult({
    status: "loaded",
    screenId,
    role: fieldContextResult.role,
    fieldContextResult,
  });
}
