import type {
  AiFieldContextSnapshot,
  AiFieldEvidenceType,
} from "../field/aiFieldWorkCopilotTypes";
import type {
  AiForemanCloseoutScreenId,
  AiForemanEvidenceResolverResult,
} from "./aiForemanEvidenceResolver";

export type AiForemanMissingEvidenceItemKind =
  | "field_context"
  | "object_scope"
  | "work_summary"
  | "subcontract_scope"
  | "work_items"
  | "document_metadata"
  | "redacted_evidence_refs";

export type AiForemanMissingEvidenceSeverity = "required" | "recommended";

export type AiForemanMissingEvidenceChecklistItem = {
  kind: AiForemanMissingEvidenceItemKind;
  severity: AiForemanMissingEvidenceSeverity;
  resolved: boolean;
  summary: string;
};

export type AiForemanMissingEvidenceChecklist = {
  status: "complete" | "incomplete" | "blocked";
  screenId: AiForemanCloseoutScreenId;
  requiredMissingKinds: readonly AiForemanMissingEvidenceItemKind[];
  recommendedMissingKinds: readonly AiForemanMissingEvidenceItemKind[];
  items: readonly AiForemanMissingEvidenceChecklistItem[];
  evidenceRefCount: number;
  evidenceTypes: readonly AiFieldEvidenceType[];
  evidenceBacked: boolean;
  noFinalSubmit: true;
  noSigning: true;
  noDirectSubcontractMutation: true;
  mutationCount: 0;
  dbWrites: 0;
  fakeChecklist: false;
  exactReason: string | null;
};

export const AI_FOREMAN_MISSING_EVIDENCE_CHECKLIST_CONTRACT = Object.freeze({
  contractId: "ai_foreman_missing_evidence_checklist_v1",
  evidenceRequired: true,
  noFinalSubmit: true,
  noSigning: true,
  noDirectSubcontractMutation: true,
  mutationCount: 0,
  dbWrites: 0,
  fakeChecklist: false,
} as const);

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasEvidenceType(
  result: AiForemanEvidenceResolverResult,
  evidenceType: AiFieldEvidenceType,
): boolean {
  return result.evidenceRefs.some((ref) => ref.type === evidenceType);
}

function item(params: {
  kind: AiForemanMissingEvidenceItemKind;
  severity: AiForemanMissingEvidenceSeverity;
  resolved: boolean;
  summary: string;
}): AiForemanMissingEvidenceChecklistItem {
  return {
    kind: params.kind,
    severity: params.severity,
    resolved: params.resolved,
    summary: params.summary,
  };
}

function commonItems(
  result: AiForemanEvidenceResolverResult,
  context: AiFieldContextSnapshot | null,
): AiForemanMissingEvidenceChecklistItem[] {
  return [
    item({
      kind: "field_context",
      severity: "required",
      resolved: context !== null,
      summary: "A scoped field context snapshot is required.",
    }),
    item({
      kind: "object_scope",
      severity: "required",
      resolved: hasText(context?.objectId) || hasText(context?.subcontractId),
      summary: "Closeout needs object or subcontract scope.",
    }),
    item({
      kind: "work_summary",
      severity: "required",
      resolved: hasText(context?.workSummary),
      summary: "Closeout drafts require a redacted work summary.",
    }),
    item({
      kind: "redacted_evidence_refs",
      severity: "required",
      resolved: result.evidenceBacked && result.evidenceRefs.length > 0,
      summary: "Every draft must cite redacted evidence refs.",
    }),
    item({
      kind: "document_metadata",
      severity: "recommended",
      resolved: Boolean(context?.documents?.length) || hasEvidenceType(result, "document"),
      summary: "Document metadata strengthens report, act, and message drafts.",
    }),
  ];
}

function screenSpecificItems(
  screenId: AiForemanCloseoutScreenId,
  context: AiFieldContextSnapshot | null,
): AiForemanMissingEvidenceChecklistItem[] {
  if (screenId !== "foreman.subcontract") return [];

  return [
    item({
      kind: "subcontract_scope",
      severity: "required",
      resolved: hasText(context?.subcontractId),
      summary: "Subcontract closeout requires subcontract scope.",
    }),
    item({
      kind: "work_items",
      severity: "required",
      resolved: Boolean(context?.workItems?.length),
      summary: "Subcontract act/report drafts require at least one redacted work item.",
    }),
  ];
}

export function buildAiForemanMissingEvidenceChecklist(
  result: AiForemanEvidenceResolverResult,
): AiForemanMissingEvidenceChecklist {
  const items = [
    ...commonItems(result, result.fieldContext),
    ...screenSpecificItems(result.screenId, result.fieldContext),
  ];
  const requiredMissingKinds = items
    .filter((entry) => entry.severity === "required" && !entry.resolved)
    .map((entry) => entry.kind);
  const recommendedMissingKinds = items
    .filter((entry) => entry.severity === "recommended" && !entry.resolved)
    .map((entry) => entry.kind);
  const evidenceTypes = [...new Set(result.evidenceRefs.map((ref) => ref.type))];
  const status =
    result.status === "blocked"
      ? "blocked"
      : requiredMissingKinds.length === 0
        ? "complete"
        : "incomplete";

  return {
    status,
    screenId: result.screenId,
    requiredMissingKinds,
    recommendedMissingKinds,
    items,
    evidenceRefCount: result.evidenceRefs.length,
    evidenceTypes,
    evidenceBacked: result.evidenceBacked && requiredMissingKinds.length === 0,
    noFinalSubmit: true,
    noSigning: true,
    noDirectSubcontractMutation: true,
    mutationCount: 0,
    dbWrites: 0,
    fakeChecklist: false,
    exactReason:
      status === "complete"
        ? null
        : result.exactReason ?? `Missing required foreman evidence: ${requiredMissingKinds.join(", ")}`,
  };
}
