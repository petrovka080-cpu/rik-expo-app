import type {
  AiFieldContextSnapshot,
  AiFieldEvidenceRef,
  AiFieldEvidenceType,
} from "./aiFieldWorkCopilotTypes";

export const AI_FIELD_EVIDENCE_POLICY_CONTRACT = Object.freeze({
  contractId: "ai_field_evidence_policy_v1",
  evidenceRequired: true,
  redactedRefsOnly: true,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
  fakeFieldCards: false,
} as const);

const MAX_FIELD_EVIDENCE_REFS = 20;

function normalizeRef(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 160);
}

function evidenceRef(type: AiFieldEvidenceType, ref: string): AiFieldEvidenceRef | null {
  const normalized = normalizeRef(ref);
  if (normalized.length === 0) return null;
  return {
    type,
    ref: normalized,
    source: "field_evidence_policy",
    redacted: true,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
  };
}

function pushRef(target: AiFieldEvidenceRef[], type: AiFieldEvidenceType, ref: string | undefined): void {
  if (!ref) return;
  const next = evidenceRef(type, ref);
  if (!next) return;
  if (target.some((entry) => entry.ref === next.ref && entry.type === next.type)) return;
  target.push(next);
}

export function buildAiFieldEvidenceRefs(
  context: AiFieldContextSnapshot | null | undefined,
): AiFieldEvidenceRef[] {
  if (!context) return [];

  const refs: AiFieldEvidenceRef[] = [];
  pushRef(refs, "field_context", context.objectId ? `field_object:${context.objectId}` : undefined);
  pushRef(refs, "subcontract", context.subcontractId ? `field_subcontract:${context.subcontractId}` : undefined);

  for (const ref of context.sourceEvidenceRefs ?? []) {
    pushRef(refs, "field_context", ref);
  }

  for (const item of context.workItems ?? []) {
    pushRef(refs, "task", item.workId ? `field_work:${item.workId}` : undefined);
    for (const ref of item.evidenceRefs ?? []) {
      pushRef(refs, "task", ref);
    }
  }

  for (const document of context.documents ?? []) {
    pushRef(refs, "document", document.evidenceRef);
    pushRef(refs, "document", document.documentId ? `field_document:${document.documentId}` : undefined);
  }

  return refs.slice(0, MAX_FIELD_EVIDENCE_REFS);
}

export function fieldEvidenceRequiredSatisfied(
  evidenceRefs: readonly AiFieldEvidenceRef[],
): boolean {
  return evidenceRefs.length > 0 &&
    evidenceRefs.every(
      (ref) =>
        ref.redacted === true &&
        ref.rawRowsReturned === false &&
        ref.rawPromptReturned === false &&
        ref.rawProviderPayloadReturned === false,
    );
}

export function aiFieldContextHasEvidence(
  context: AiFieldContextSnapshot | null,
  evidenceRefs: readonly AiFieldEvidenceRef[],
): boolean {
  if (!context) return false;
  return fieldEvidenceRequiredSatisfied(evidenceRefs);
}

export function evidenceRefsForDraftTool(
  evidenceRefs: readonly AiFieldEvidenceRef[],
): string[] {
  return evidenceRefs.map((ref) => ref.ref).slice(0, MAX_FIELD_EVIDENCE_REFS);
}
