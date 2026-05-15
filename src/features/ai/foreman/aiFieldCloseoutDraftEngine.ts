import {
  draftAiContractorAct,
} from "../field/aiContractorActDraftEngine";
import {
  draftAiForemanReport,
} from "../field/aiForemanReportDraftEngine";
import type {
  AiContractorActDraft,
  AiFieldWorkAuthContext,
  AiFieldWorkCopilotInput,
  AiForemanReportDraft,
} from "../field/aiFieldWorkCopilotTypes";
import type {
  AiForemanEvidenceResolverResult,
} from "./aiForemanEvidenceResolver";
import type {
  AiForemanMissingEvidenceChecklist,
} from "./aiForemanMissingEvidenceChecklist";

export type AiFieldCloseoutDraftKind =
  | "draft_report"
  | "draft_act"
  | "draft_message";

export type AiFieldCloseoutMessageDraft = {
  title: string;
  bodyPreview: string;
  evidenceRefs: readonly string[];
  persisted: false;
  sent: false;
  draftOnly: true;
};

export type AiFieldCloseoutDraftItem = {
  kind: AiFieldCloseoutDraftKind;
  title: string;
  summary: string;
  evidenceRefs: readonly string[];
  approvalCandidateExpected: boolean;
  draftOnly: true;
  directExecutionAllowed: false;
  finalSubmitAllowed: false;
  signingAllowed: false;
  directSubcontractMutationAllowed: false;
};

export type AiFieldCloseoutDraftEngineResult = {
  status: "drafted" | "empty" | "blocked";
  reportDraft: AiForemanReportDraft | null;
  actDraft: AiContractorActDraft | null;
  messageDraft: AiFieldCloseoutMessageDraft | null;
  draftItems: readonly AiFieldCloseoutDraftItem[];
  evidenceBacked: boolean;
  draftOnly: true;
  approvalCandidateExpected: boolean;
  directExecutionAllowed: false;
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
  fakeDraftCreated: false;
  exactReason: string | null;
};

export const AI_FIELD_CLOSEOUT_DRAFT_ENGINE_CONTRACT = Object.freeze({
  contractId: "ai_field_closeout_draft_engine_v1",
  draftOnly: true,
  approvalCandidateExpected: true,
  directExecutionAllowed: false,
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
  fakeDraftCreated: false,
} as const);

function evidenceIds(result: AiForemanEvidenceResolverResult): string[] {
  return result.evidenceRefs.map((ref) => `${ref.type}:${ref.ref}`);
}

function item(params: {
  kind: AiFieldCloseoutDraftKind;
  title: string;
  summary: string;
  evidenceRefs: readonly string[];
  approvalCandidateExpected?: boolean;
}): AiFieldCloseoutDraftItem {
  return {
    kind: params.kind,
    title: params.title,
    summary: params.summary,
    evidenceRefs: [...params.evidenceRefs],
    approvalCandidateExpected: params.approvalCandidateExpected ?? true,
    draftOnly: true,
    directExecutionAllowed: false,
    finalSubmitAllowed: false,
    signingAllowed: false,
    directSubcontractMutationAllowed: false,
  };
}

function blockedResult(reason: string): AiFieldCloseoutDraftEngineResult {
  return {
    status: "blocked",
    reportDraft: null,
    actDraft: null,
    messageDraft: null,
    draftItems: [],
    evidenceBacked: false,
    draftOnly: true,
    approvalCandidateExpected: true,
    directExecutionAllowed: false,
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
    fakeDraftCreated: false,
    exactReason: reason,
  };
}

function buildMessageDraft(result: AiForemanEvidenceResolverResult): AiFieldCloseoutMessageDraft | null {
  const refs = evidenceIds(result);
  if (!result.fieldContext || refs.length === 0) return null;

  return {
    title: "Field closeout message draft",
    bodyPreview:
      `${result.evidenceSummary.messageContext} Review required before any submit, send, or signing action.`,
    evidenceRefs: refs,
    persisted: false,
    sent: false,
    draftOnly: true,
  };
}

function draftItemsFor(params: {
  evidence: AiForemanEvidenceResolverResult;
  reportDraft: AiForemanReportDraft | null;
  actDraft: AiContractorActDraft | null;
  messageDraft: AiFieldCloseoutMessageDraft | null;
}): AiFieldCloseoutDraftItem[] {
  const refs = evidenceIds(params.evidence);
  const items: AiFieldCloseoutDraftItem[] = [];
  if (params.reportDraft?.status === "draft") {
    items.push(item({
      kind: "draft_report",
      title: "Draft report",
      summary: params.evidence.evidenceSummary.reportContext,
      evidenceRefs: refs,
    }));
  }
  if (params.actDraft?.status === "draft") {
    items.push(item({
      kind: "draft_act",
      title: "Draft act",
      summary: params.evidence.evidenceSummary.subcontractContext,
      evidenceRefs: refs,
    }));
  }
  if (params.messageDraft) {
    items.push(item({
      kind: "draft_message",
      title: params.messageDraft.title,
      summary: params.messageDraft.bodyPreview,
      evidenceRefs: params.messageDraft.evidenceRefs,
      approvalCandidateExpected: params.evidence.screenId !== "foreman.ai.quick_modal",
    }));
  }
  return items;
}

export async function buildAiFieldCloseoutDraftEngine(params: {
  auth: AiFieldWorkAuthContext | null;
  evidence: AiForemanEvidenceResolverResult;
  checklist: AiForemanMissingEvidenceChecklist;
  input?: AiFieldWorkCopilotInput;
}): Promise<AiFieldCloseoutDraftEngineResult> {
  if (!params.auth || params.auth.userId.trim().length === 0 || params.auth.role !== params.evidence.role) {
    return blockedResult("Field closeout draft engine requires the original authenticated role context.");
  }
  if (params.evidence.status === "blocked" || params.checklist.status === "blocked") {
    return blockedResult(params.evidence.exactReason ?? params.checklist.exactReason ?? "Field closeout evidence is blocked.");
  }
  if (params.evidence.status !== "loaded" || params.checklist.status !== "complete") {
    return {
      ...blockedResult(params.checklist.exactReason ?? "Field closeout draft engine requires complete evidence."),
      status: "empty",
    };
  }

  const input = params.input ?? { fieldContext: params.evidence.fieldContext };
  const reportDraft = await draftAiForemanReport({
    auth: params.auth,
    input: { ...input, fieldContext: params.evidence.fieldContext, reportKind: input.reportKind ?? "progress" },
  });
  const actDraft =
    params.evidence.screenId === "foreman.subcontract"
      ? await draftAiContractorAct({
          auth: params.auth,
          input: { ...input, fieldContext: params.evidence.fieldContext, actKind: input.actKind ?? "subcontract_progress" },
        })
      : null;
  const messageDraft = buildMessageDraft(params.evidence);
  const draftItems = draftItemsFor({
    evidence: params.evidence,
    reportDraft,
    actDraft,
    messageDraft,
  });
  const evidenceBacked =
    params.evidence.evidenceBacked &&
    draftItems.length > 0 &&
    draftItems.every((entry) => entry.evidenceRefs.length > 0);
  const status = evidenceBacked ? "drafted" : "empty";

  return {
    status,
    reportDraft,
    actDraft,
    messageDraft,
    draftItems,
    evidenceBacked,
    draftOnly: true,
    approvalCandidateExpected: draftItems.some((entry) => entry.approvalCandidateExpected),
    directExecutionAllowed: false,
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
    fakeDraftCreated: false,
    exactReason: status === "drafted" ? null : "Field closeout draft engine requires evidence-backed draft items.",
  };
}
