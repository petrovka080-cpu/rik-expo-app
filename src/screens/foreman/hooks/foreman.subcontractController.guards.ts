import type { ReqItemRow } from "../../../lib/catalog_api";
import type { Subcontract } from "../../subcontracts/subcontracts.shared";
import { trim } from "./foreman.subcontractController.model";

export type SubcontractControllerGuardReason =
  | "missing_template"
  | "template_not_approved"
  | "missing_user"
  | "missing_request"
  | "empty_draft";

export type SubcontractControllerGuardResult =
  | { ok: true; subcontractId?: string; requestId?: string }
  | { ok: false; reason: SubcontractControllerGuardReason };

export type SubcontractControllerGuardFailure = Extract<
  SubcontractControllerGuardResult,
  { ok: false }
>;

export function isSubcontractControllerGuardFailure(
  result: SubcontractControllerGuardResult,
): result is SubcontractControllerGuardFailure {
  return result.ok === false;
}

export function guardTemplateContract(templateContract: Subcontract | null | undefined): SubcontractControllerGuardResult {
  const subcontractId = trim(templateContract?.id);
  if (!subcontractId) {
    return { ok: false, reason: "missing_template" };
  }

  if (templateContract?.status !== "approved") {
    return { ok: false, reason: "template_not_approved" };
  }

  return { ok: true, subcontractId };
}

export function guardDraftUser(userId: string): SubcontractControllerGuardResult {
  if (!trim(userId)) {
    return { ok: false, reason: "missing_user" };
  }

  return { ok: true };
}

export function guardSendToDirector(params: {
  templateContract: Subcontract | null | undefined;
  requestId: string;
  draftItems: ReqItemRow[];
}): SubcontractControllerGuardResult {
  const templateGuard = guardTemplateContract(params.templateContract);
  if (!templateGuard.ok) return templateGuard;

  const requestId = trim(params.requestId);
  if (!requestId) {
    return { ok: false, reason: "missing_request" };
  }

  if ((params.draftItems || []).length === 0) {
    return { ok: false, reason: "empty_draft" };
  }

  return { ok: true, subcontractId: templateGuard.subcontractId, requestId };
}

export function guardPdfRequest(requestId: string): SubcontractControllerGuardResult {
  const normalized = trim(requestId);
  if (!normalized) {
    return { ok: false, reason: "missing_request" };
  }

  return { ok: true, requestId: normalized };
}
