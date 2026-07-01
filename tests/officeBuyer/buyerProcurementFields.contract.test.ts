import { buildProcurementLifecycleRequestView } from "../../src/features/office/procurementLifecycle";

describe("buyer procurement fields", () => {
  it("proves buyer price, supplier, note, tender state, and refresh-persisted record shape", () => {
    const request = buildProcurementLifecycleRequestView({
      requestId: "request-1",
      expectedItemCount: 3,
      items: [
        {
          requestItemId: "item-a",
          proposalId: "proposal-a",
          proposalItemId: "proposal-item-a",
          price: "150",
          qty: 2,
          supplier: "ОсОО Бетон",
          note: "Доставка утром",
        },
        {
          requestItemId: "item-b",
          proposalId: "proposal-b",
          proposalItemId: "proposal-item-b",
          tenderState: "Торги / запрос цены",
          supplier: "Торги",
          note: "Сравнить три предложения",
        },
        {
          requestItemId: "item-c",
          proposalId: "proposal-c",
          proposalItemId: "proposal-item-c",
          supplier: "Не выбран",
        },
      ],
    });

    expect(request.items).toHaveLength(3);
    expect(request.buyerCanFillPrice).toBe(true);
    expect(request.buyerCanFillSupplier).toBe(true);
    expect(request.buyerCanFillNote).toBe(true);
    expect(request.buyerCanMarkForTender).toBe(true);
    expect(request.procurementRecordCreated).toBe(true);
    expect(request.noQuestionMarkPlaceholders).toBe(true);
    expect(request.noFakeZeroSum).toBe(true);
  });
});
