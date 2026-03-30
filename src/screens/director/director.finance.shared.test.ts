import { adaptDirectorFinancePanelScopeV4Payload } from "./director.finance.shared";

describe("director.finance.shared v4 adapter", () => {
  it("normalizes canonical v4 payload into RN-compatible finance scope", () => {
    const result = adaptDirectorFinancePanelScopeV4Payload({
      document_type: "director_finance_panel_scope",
      version: "v4",
      canonical: {
        summary: {
          approvedTotal: 1000,
          paidTotal: 700,
          debtTotal: 300,
          overpaymentTotal: 0,
          overdueCount: 1,
          overdueAmount: 300,
          criticalCount: 0,
          criticalAmount: 0,
          debtCount: 1,
          partialCount: 1,
          partialPaidTotal: 100,
        },
        suppliers: [
          {
            supplierId: "supplier-1",
            supplierName: "Supplier A",
            approvedTotal: 1000,
            paidTotal: 700,
            debtTotal: 300,
            overpaymentTotal: 0,
            invoiceCount: 1,
            debtCount: 1,
            overdueCount: 1,
            criticalCount: 0,
            overdueAmount: 300,
            criticalAmount: 0,
          },
        ],
        objects: [
          {
            objectKey: "OBJ-1",
            objectId: "00000000-0000-0000-0000-000000000111",
            objectCode: "OBJ-1",
            objectName: "Object One",
            approvedTotal: 1000,
            paidTotal: 700,
            debtTotal: 300,
            overpaymentTotal: 0,
            invoiceCount: 1,
            debtCount: 1,
            overdueCount: 1,
            criticalCount: 0,
            overdueAmount: 300,
            criticalAmount: 0,
          },
        ],
        spend: {
          header: {
            approved: 1000,
            paid: 700,
            toPay: 300,
            overpay: 0,
          },
          kindRows: [
            {
              kind: "materials",
              approved: 1000,
              paid: 700,
              overpay: 0,
              toPay: 300,
              suppliers: [],
            },
          ],
          overpaySuppliers: [],
        },
      },
      rows: [
        {
          requestId: "request-1",
          objectId: "00000000-0000-0000-0000-000000000111",
          objectCode: "OBJ-1",
          objectName: "Object One",
          supplierId: "supplier-1",
          supplierName: "Supplier A",
          proposalId: "proposal-1",
          invoiceNumber: "INV-1",
          amountTotal: 1000,
          amountPaid: 700,
          amountDebt: 300,
          dueDate: "2026-03-30",
          isOverdue: true,
          overdueDays: 12,
          status: "overdue",
        },
      ],
      pagination: {
        limit: 50,
        offset: 0,
        total: 1,
      },
      meta: {
        owner: "backend",
        generatedAt: "2026-03-30T12:00:00.000Z",
        sourceVersion: "director_finance_panel_scope_v4",
        payloadShapeVersion: "v4",
        identitySource: "request_object_identity_scope_v1",
        objectGroupingSource: "stable_object_refs",
        filtersEcho: {
          objectId: null,
          dateFrom: null,
          dateTo: null,
          dueDays: 7,
          criticalDays: 14,
        },
      },
    });

    expect(result.summary).toEqual(
      expect.objectContaining({
        approved: 1000,
        paid: 700,
        toPay: 300,
      }),
    );
    expect(result.report.suppliers).toEqual([
      expect.objectContaining({
        supplier: "Supplier A",
        toPay: 300,
      }),
    ]);
    expect(result.canonical.objects).toEqual([
      expect.objectContaining({
        objectCode: "OBJ-1",
        objectName: "Object One",
        debtTotal: 300,
      }),
    ]);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        objectCode: "OBJ-1",
        objectName: "Object One",
      }),
    );
    expect(result.meta.sourceVersion).toBe("director_finance_panel_scope_v4");
  });

  it("rejects malformed v4 envelope instead of silently fabricating truth", () => {
    expect(() =>
      adaptDirectorFinancePanelScopeV4Payload({
        document_type: "director_finance_panel_scope",
        version: "v3",
      }),
    ).toThrow("director_finance_panel_scope_v4 invalid version");
  });
});
