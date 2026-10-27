import type { AiApprovalActionKind, AiExecutionServiceDefinition, AiExecutionServiceName } from "./aiApprovalTypes";

const SERVICE_BY_ACTION_KIND: Record<AiApprovalActionKind, AiExecutionServiceName> = {
  purchase_order_create: "procurement_service",
  payment_prepare_or_post: "payment_service",
  warehouse_issue: "warehouse_service",
  warehouse_receive: "warehouse_service",
  warehouse_discrepancy_confirm: "warehouse_service",
  work_closeout: "field_service",
  act_sign: "field_service",
  document_final_link: "document_service",
  marketplace_product_publish: "marketplace_service",
  office_reminder_send: "office_service",
  client_report_publish: "client_report_service",
  role_permission_change: "office_service",
};

export const AI_EXECUTION_SERVICE_REGISTRY: readonly AiExecutionServiceDefinition[] =
  Object.entries(SERVICE_BY_ACTION_KIND).map(([actionKind, serviceName]) => ({
    actionKind: actionKind as AiApprovalActionKind,
    serviceName,
    allowedAfterApprovalOnly: true,
    requiresLedgerEntry: true,
    requiresPreconditionRecheck: true,
    requiresIdempotencyKey: true,
    canBeCalledByAiDirectly: false,
  }));

export function getAiExecutionServiceDefinition(actionKind: AiApprovalActionKind): AiExecutionServiceDefinition {
  const service = AI_EXECUTION_SERVICE_REGISTRY.find((entry) => entry.actionKind === actionKind);
  if (!service) throw new Error(`Unknown approval execution action kind: ${actionKind}`);
  return service;
}

export function listAiExecutionServiceDefinitions(): AiExecutionServiceDefinition[] {
  return [...AI_EXECUTION_SERVICE_REGISTRY];
}

export function assertAiExecutionServiceRegistryIsSafe(): boolean {
  return AI_EXECUTION_SERVICE_REGISTRY.every((entry) =>
    entry.allowedAfterApprovalOnly &&
    entry.requiresLedgerEntry &&
    entry.requiresPreconditionRecheck &&
    entry.requiresIdempotencyKey &&
    entry.canBeCalledByAiDirectly === false,
  );
}
