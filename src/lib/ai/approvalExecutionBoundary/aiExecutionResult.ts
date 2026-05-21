import type { AiApprovalActionKind, AiExecutionBoundaryResult } from "./aiApprovalTypes";

const RESULT_LABEL_BY_ACTION_KIND: Record<AiApprovalActionKind, string> = {
  purchase_order_create: "Закупка создана approved service",
  payment_prepare_or_post: "Платежное действие выполнено approved service",
  warehouse_issue: "Складская выдача выполнена approved service",
  warehouse_receive: "Складской приход выполнен approved service",
  warehouse_discrepancy_confirm: "Складское расхождение подтверждено approved service",
  work_closeout: "Работа закрыта approved service",
  act_sign: "Акт подписан approved service",
  document_final_link: "Документ связан approved service",
  marketplace_product_publish: "Товар опубликован approved service",
  office_reminder_send: "Напоминание отправлено approved service",
  client_report_publish: "Клиентский отчет опубликован approved service",
  role_permission_change: "Права изменены approved service",
};

export function buildAiExecutionChangedRef(params: {
  actionKind: AiApprovalActionKind;
  approvalRequestId: string;
}): AiExecutionBoundaryResult["createdOrChangedRefs"][number] {
  return {
    entityType: params.actionKind,
    entityId: `${params.actionKind}:${params.approvalRequestId}`,
    labelRu: RESULT_LABEL_BY_ACTION_KIND[params.actionKind],
    sourceRefId: `approval-result:${params.actionKind}:${params.approvalRequestId}`,
  };
}

export function composeAiExecutionResultRu(result: AiExecutionBoundaryResult): string {
  if (result.status === "already_executed") {
    return "Действие уже выполнено ранее. Повторный запуск не создал дубликат.";
  }
  if (result.status === "executed") {
    return `Действие выполнено через ${result.executedByService}. Прямой DB mutation не использовался.`;
  }
  return result.resultRu;
}
