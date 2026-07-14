import {
  buildProcurementLifecycleRequestView,
  findDuplicateProcurementRecordKeys,
} from "../../src/features/office/procurementLifecycle";

describe("procurement record idempotency", () => {
  it("treats existing proposal_items as the procurement record model", () => {
    const request = buildProcurementLifecycleRequestView({
      requestId: "request-1",
      items: [
        {
          requestItemId: "item-1",
          proposalId: "proposal-1",
          proposalItemId: "proposal-item-1",
          supplier: "ОсОО Поставщик",
          price: "1700",
        },
      ],
    });

    expect(request.procurementRecordCreated).toBe(true);
    expect(request.procurementRecordIdempotent).toBe(true);
    expect(request.noDuplicateProcurementRows).toBe(true);
  });

  it("detects double-click duplicate procurement rows instead of masking them", () => {
    const duplicates = findDuplicateProcurementRecordKeys([
      {
        requestItemId: "item-1",
        proposalId: "proposal-1",
        supplier: "ОсОО Поставщик",
      },
      {
        requestItemId: "item-1",
        proposalId: "proposal-1",
        supplier: "  осоо   поставщик ",
      },
    ]);

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]).toContain("request_item:item-1");
  });

  it("keeps distinct proposal_item ids as distinct persisted records", () => {
    const duplicates = findDuplicateProcurementRecordKeys([
      { requestItemId: "item-1", proposalItemId: "proposal-item-1" },
      { requestItemId: "item-2", proposalItemId: "proposal-item-2" },
    ]);

    expect(duplicates).toEqual([]);
  });
});
