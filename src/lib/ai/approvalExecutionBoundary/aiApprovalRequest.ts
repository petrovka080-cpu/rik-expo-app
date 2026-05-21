import type { AiSafeActionDraft, AiSafeActionKind } from "../safeActions";
import { buildAiApprovalImpactDiffFromDraft } from "./aiApprovalImpactDiff";
import type { AiApprovalActionKind, AiApprovalRequest } from "./aiApprovalTypes";

const ACTION_KIND_BY_DRAFT_KIND: Record<AiSafeActionKind, AiApprovalActionKind> = {
  procurement_purchase_draft: "purchase_order_create",
  warehouse_deficit_request_draft: "purchase_order_create",
  warehouse_discrepancy_draft: "warehouse_discrepancy_confirm",
  accountant_payment_checklist_draft: "payment_prepare_or_post",
  accounting_entry_reference_draft: "payment_prepare_or_post",
  foreman_act_draft: "act_sign",
  work_closeout_checklist_draft: "work_closeout",
  contractor_remark_response_draft: "office_reminder_send",
  document_link_suggestion_draft: "document_final_link",
  marketplace_product_card_draft: "marketplace_product_publish",
  office_reminder_draft: "office_reminder_send",
  client_progress_report_draft: "client_report_publish",
};

const EXECUTION_TITLE_BY_KIND: Record<AiApprovalActionKind, string> = {
  purchase_order_create: "Согласование закупки",
  payment_prepare_or_post: "Согласование платежного действия",
  warehouse_issue: "Согласование складской выдачи",
  warehouse_receive: "Согласование складского прихода",
  warehouse_discrepancy_confirm: "Согласование складского расхождения",
  work_closeout: "Согласование закрытия работы",
  act_sign: "Согласование подписания акта",
  document_final_link: "Согласование финальной связи документа",
  marketplace_product_publish: "Модерация публикации товара",
  office_reminder_send: "Подтверждение отправки напоминания",
  client_report_publish: "Согласование клиентского отчета",
  role_permission_change: "Согласование изменения прав",
};

function normalizePreconditionStatus(status: AiSafeActionDraft["preconditions"][number]["status"]): AiApprovalRequest["preconditions"][number]["status"] {
  return status === "permission_limited" ? "blocked" : status;
}

export function mapAiSafeActionDraftToApprovalActionKind(actionKind: AiSafeActionKind): AiApprovalActionKind {
  return ACTION_KIND_BY_DRAFT_KIND[actionKind];
}

export function buildAiApprovalRequestFromDraft(params: {
  draft: AiSafeActionDraft;
  nowIso?: string;
  expiresAt?: string;
}): AiApprovalRequest {
  const actionKind = mapAiSafeActionDraftToApprovalActionKind(params.draft.actionKind);
  const requiredApproverRoles = params.draft.approvalRoute?.approverRoles ?? [];
  return {
    id: `approval_request:${params.draft.id}`,
    actionKind,
    sourceDraftId: params.draft.id,
    sourceTraceId: params.draft.sourceTraceId ?? `trace:${params.draft.id}`,
    orgId: params.draft.orgId,
    projectId: params.draft.projectId,
    requestedByUserId: params.draft.userId,
    requestedByRole: params.draft.role,
    targetEntityRefs: params.draft.openLinks.map((link) => ({
      entityType: link.sourceRefId.split(":")[1] ?? "unknown",
      entityId: link.sourceRefId.split(":")[2] ?? link.sourceRefId,
      sourceRefId: link.sourceRefId,
      labelRu: link.labelRu,
    })),
    titleRu: EXECUTION_TITLE_BY_KIND[actionKind],
    summaryRu: params.draft.summaryRu,
    sourceRefIds: [...params.draft.sourceRefIds],
    openLinks: params.draft.openLinks.map((link) => ({ ...link })),
    preconditions: params.draft.preconditions.map((check) => ({
      id: check.id,
      labelRu: check.labelRu,
      status: normalizePreconditionStatus(check.status),
      reasonRu: check.reasonRu,
      sourceRefIds: [...check.sourceRefIds],
    })),
    impactDiff: buildAiApprovalImpactDiffFromDraft(params.draft),
    approvalPolicy: {
      requiredApproverRoles,
      requiredDecisionCount: requiredApproverRoles.length > 0 ? 1 : 0,
      canRequesterApproveOwnRequest: false,
      ledgerRequired: true,
      canBypass: false,
    },
    status: "submitted_for_approval",
    createdAt: params.nowIso ?? params.draft.createdAt,
    expiresAt: params.expiresAt,
    sourceDraftSnapshot: {
      id: params.draft.id,
      actionKind: params.draft.actionKind,
      idempotencyKey: params.draft.idempotencyKey,
      safety: params.draft.safety,
    },
  };
}

export function assertAiApprovalRequestIsLedgerReady(request: AiApprovalRequest): boolean {
  return (
    request.approvalPolicy.ledgerRequired === true &&
    request.approvalPolicy.canBypass === false &&
    request.approvalPolicy.canRequesterApproveOwnRequest === false &&
    request.sourceRefIds.length > 0 &&
    request.impactDiff.willNotDo.length > 0
  );
}
