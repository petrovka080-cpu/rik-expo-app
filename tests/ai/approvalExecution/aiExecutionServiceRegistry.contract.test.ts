import { assertAiExecutionServiceRegistryIsSafe, listAiExecutionServiceDefinitions } from "../../../src/lib/ai/approvalExecutionBoundary";

describe("ai execution service registry", () => {
  it("requires approved services after ledger, recheck and idempotency", () => {
    expect(assertAiExecutionServiceRegistryIsSafe()).toBe(true);
    expect(listAiExecutionServiceDefinitions()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actionKind: "purchase_order_create", serviceName: "procurement_service" }),
        expect.objectContaining({ actionKind: "document_final_link", serviceName: "document_service" }),
        expect.objectContaining({ actionKind: "marketplace_product_publish", serviceName: "marketplace_service" }),
      ]),
    );
  });
});
