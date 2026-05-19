import type { WarehouseStockSourceType } from "./warehouseStockTypes";

export const WAREHOUSE_ROLE_POLICY = Object.freeze({
  role: "warehouse",
  canReadSources: [
    "warehouse_stock",
    "warehouse_incoming",
    "warehouse_issue",
    "material",
    "specification",
    "procurement_request",
    "work",
    "object",
    "zone",
    "pdf_chunk",
    "document",
    "approval",
    "chat_message",
  ] satisfies WarehouseStockSourceType[],
  cannotReadSources: [
    "full_company_cashflow",
    "payment",
    "security_event",
    "runtime_debug",
    "provider_payload",
    "env_secret",
  ] as const,
  directReceiveAllowed: false,
  directIssueAllowed: false,
  directWriteoffAllowed: false,
  directStockAdjustmentAllowed: false,
  autoApprovalAllowed: false,
  dbWritesFromAiAllowed: false,
  fakeStockAllowed: false,
  fakeIncomingAllowed: false,
  fakeDocumentsAllowed: false,
});

export function warehouseCanReadSource(type: WarehouseStockSourceType): boolean {
  return WAREHOUSE_ROLE_POLICY.canReadSources.includes(type);
}
