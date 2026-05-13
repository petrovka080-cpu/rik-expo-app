import type { AiApprovalStatus } from "../../approval/aiApprovalTypes";
import type { AiActionLedgerRepository } from "../../actionLedger/aiActionLedgerRepository";
import type { AiDomain, AiUserRole } from "../../policy/aiRolePolicy";
import type { AiActionType } from "../../policy/aiRiskPolicy";

export type { AiActionLedgerRepository };

export type ActionStatusTransportRecord = {
  actionType?: string;
  screenId?: string;
  domain?: AiDomain;
  evidenceRefs?: string[];
};

export type ActionStatusTransportResult = {
  status: AiApprovalStatus | "not_found";
  record?: ActionStatusTransportRecord;
  persistedLookup: boolean;
  persistentBackend: boolean;
};

export function ledgerActionToToolAction(value: string | undefined): AiActionType | "unknown" {
  if (
    value === "search_catalog" ||
    value === "compare_suppliers" ||
    value === "summarize_project" ||
    value === "summarize_finance" ||
    value === "summarize_warehouse" ||
    value === "explain_status" ||
    value === "draft_request" ||
    value === "draft_report" ||
    value === "draft_act" ||
    value === "draft_supplier_message" ||
    value === "submit_request" ||
    value === "confirm_supplier" ||
    value === "create_order" ||
    value === "change_warehouse_status" ||
    value === "send_document" ||
    value === "change_payment_status" ||
    value === "generate_final_pdf_if_it_changes_status"
  ) {
    return value;
  }
  if (value === "document_send") return "send_document";
  return "unknown";
}

export async function readActionStatusTransport(params: {
  actionId: string;
  role: AiUserRole;
  repository: AiActionLedgerRepository;
}): Promise<ActionStatusTransportResult> {
  const status = await params.repository.getStatus(params.actionId, params.role);
  const record = status.record
    ? {
        actionType: status.record.actionType,
        screenId: status.record.screenId,
        domain: status.record.domain,
        evidenceRefs: status.record.evidenceRefs,
      }
    : undefined;

  return {
    status: status.status === "blocked" ? "blocked" : status.status,
    record,
    persistedLookup: status.persistedLookup,
    persistentBackend: status.persistentBackend,
  };
}
