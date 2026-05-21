import type { AiApprovalPreconditionRecheck, AiApprovalRequest } from "./aiApprovalTypes";

const ACTION_REQUIRED_HUMAN_FIELDS: Partial<Record<AiApprovalRequest["actionKind"], string[]>> = {
  purchase_order_create: ["supplier", "price"],
  payment_prepare_or_post: ["documents_reviewed"],
  warehouse_discrepancy_confirm: ["warehouse_manager_review"],
  document_final_link: ["document_review"],
  marketplace_product_publish: ["price", "availability", "supplier", "moderation"],
  office_reminder_send: ["message_reviewed"],
  client_report_publish: ["client_report_review"],
  act_sign: ["evidence_reviewed"],
  work_closeout: ["evidence_reviewed"],
};

export function recheckAiApprovalPreconditions(params: {
  request: AiApprovalRequest;
  resolvedHumanFields?: readonly string[];
  stale?: boolean;
  permissionChanged?: boolean;
  nowIso?: string;
}): AiApprovalPreconditionRecheck {
  const resolved = new Set(params.resolvedHumanFields ?? []);
  const requiredHumanFields = ACTION_REQUIRED_HUMAN_FIELDS[params.request.actionKind] ?? [];
  const missingHumanFields = requiredHumanFields.filter((field) => !resolved.has(field));
  const checks: AiApprovalPreconditionRecheck["checks"] = params.request.preconditions.map((check) => {
    if (params.permissionChanged) {
      return {
        labelRu: check.labelRu,
        status: "permission_changed",
        reasonRu: "Права изменились после создания черновика.",
        sourceRefIds: check.sourceRefIds,
      };
    }
    if (params.stale) {
      return {
        labelRu: check.labelRu,
        status: "stale",
        reasonRu: "Данные могли измениться после черновика.",
        sourceRefIds: check.sourceRefIds,
      };
    }
    if (check.status === "blocked") {
      return {
        labelRu: check.labelRu,
        status: "failed",
        reasonRu: check.reasonRu,
        sourceRefIds: check.sourceRefIds,
      };
    }
    if (check.status === "missing" && missingHumanFields.length > 0) {
      return {
        labelRu: check.labelRu,
        status: "missing",
        reasonRu: `Нужно подтвердить: ${missingHumanFields.join(", ")}.`,
        sourceRefIds: check.sourceRefIds,
      };
    }
    return {
      labelRu: check.labelRu,
      status: "passed",
      reasonRu: check.status === "requires_review" ? "Проверено человеком перед execution." : check.reasonRu,
      sourceRefIds: check.sourceRefIds,
    };
  });
  const extraHumanChecks = missingHumanFields.map((field) => ({
    labelRu: `Human field: ${field}`,
    status: "missing" as const,
    reasonRu: `Поле ${field} должно быть подтверждено человеком.`,
    sourceRefIds: params.request.sourceRefIds,
  }));
  const allChecks = [...checks, ...extraHumanChecks];
  const failed = allChecks.some((check) => check.status !== "passed");
  return {
    approvalRequestId: params.request.id,
    checkedAt: params.nowIso ?? new Date().toISOString(),
    result: params.permissionChanged
      ? "permission_changed"
      : params.stale
        ? "stale_data"
        : failed
          ? "requires_review"
          : "passed",
    checks: allChecks,
    executionAllowed: !failed,
  };
}
