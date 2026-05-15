import {
  listAiScreenButtonRoleActionEntries,
} from "../screenAudit/aiScreenButtonRoleActionRegistry";

export const AI_DOCUMENT_FORBIDDEN_ACTION_POLICY_CONTRACT = Object.freeze({
  contractId: "ai_document_forbidden_action_policy_v1",
  screenId: "documents.main",
  directFinalSubmitAllowed: false,
  signingAllowed: false,
  deletionAllowed: false,
  rawDocumentExportAllowed: false,
  serviceRoleReadAllowed: false,
  mutationCount: 0,
  dbWrites: 0,
  providerCalled: false,
} as const);

export type AiDocumentForbiddenActionId =
  | "documents.main.forbidden"
  | "sign_final_document"
  | "send_final_document_directly"
  | "delete_document"
  | "raw_document_export"
  | "privileged_document_read";

export type AiDocumentForbiddenActionPolicy = {
  actionId: AiDocumentForbiddenActionId;
  forbidden: true;
  reason: string;
  directFinalSubmitAllowed: false;
  signingAllowed: false;
  deletionAllowed: false;
  rawDocumentExportAllowed: false;
  serviceRoleReadAllowed: false;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
};

const DEFAULT_FORBIDDEN_REASON =
  "AI document knowledge may search, summarize, and draft preview only; final document actions require human approval outside this policy.";

const STATIC_FORBIDDEN_ACTIONS: readonly AiDocumentForbiddenActionId[] = Object.freeze([
  "sign_final_document",
  "send_final_document_directly",
  "delete_document",
  "raw_document_export",
  "privileged_document_read",
] as const);

function buildForbiddenPolicy(
  actionId: AiDocumentForbiddenActionId,
  reason: string,
): AiDocumentForbiddenActionPolicy {
  return {
    actionId,
    forbidden: true,
    reason,
    directFinalSubmitAllowed: false,
    signingAllowed: false,
    deletionAllowed: false,
    rawDocumentExportAllowed: false,
    serviceRoleReadAllowed: false,
    mutationCount: 0,
    dbWrites: 0,
    providerCalled: false,
  };
}

export function listAiDocumentForbiddenActionPolicies(): AiDocumentForbiddenActionPolicy[] {
  const auditForbidden = listAiScreenButtonRoleActionEntries().find(
    (entry) => entry.screenId === "documents.main" && entry.actionKind === "forbidden",
  );
  return [
    buildForbiddenPolicy(
      "documents.main.forbidden",
      auditForbidden?.forbiddenReason ?? DEFAULT_FORBIDDEN_REASON,
    ),
    ...STATIC_FORBIDDEN_ACTIONS.map((actionId) =>
      buildForbiddenPolicy(actionId, DEFAULT_FORBIDDEN_REASON),
    ),
  ];
}

export function getAiDocumentForbiddenActionPolicy(
  actionId: string,
): AiDocumentForbiddenActionPolicy | null {
  const normalized = actionId.trim();
  return listAiDocumentForbiddenActionPolicies().find((policy) => policy.actionId === normalized) ?? null;
}

export function isAiDocumentActionForbidden(actionId: string): boolean {
  return getAiDocumentForbiddenActionPolicy(actionId)?.forbidden === true;
}
