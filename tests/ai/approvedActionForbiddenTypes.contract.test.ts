import {
  isApprovedProcurementExecutorActionType,
  isForbiddenApprovedExecutorActionType,
} from "../../src/features/ai/executors/approvedActionExecutorPolicy";

describe("approved action forbidden executor types contract", () => {
  it("allows only draft_request and submit_request for the bounded procurement executor", () => {
    expect(isApprovedProcurementExecutorActionType("draft_request")).toBe(true);
    expect(isApprovedProcurementExecutorActionType("submit_request")).toBe(true);
    expect(isApprovedProcurementExecutorActionType("confirm_supplier")).toBe(false);
    expect(isApprovedProcurementExecutorActionType("create_order")).toBe(false);
  });

  it("keeps destructive and broad actions forbidden", () => {
    for (const actionType of [
      "confirm_supplier",
      "create_order",
      "change_warehouse_status",
      "send_document",
      "change_payment_status",
      "delete_data",
      "raw_db_export",
      "direct_supabase_query",
    ]) {
      expect(isForbiddenApprovedExecutorActionType(actionType)).toBe(true);
    }
  });
});
