import {
  hasForbiddenAiToolTransportKeys,
  normalizeAiToolTransportText,
} from "../../src/features/ai/tools/transport/aiToolTransportTypes";
import { readFinanceSummaryTransport } from "../../src/features/ai/tools/transport/financeSummary.transport";
import { readWarehouseStatusTransport } from "../../src/features/ai/tools/transport/warehouseStatus.transport";

jest.mock("../../src/screens/director/director.finance.bff.client", () => ({
  callDirectorFinanceBffRpc: jest.fn(async () => ({
    status: "ok",
    payload: {
      summary: {
        total_payable: 100,
        total_paid: 40,
        total_debt: 60,
        overdue_amount: 10,
      },
      by_supplier: [{ supplier_name: "hidden", bank_account: "hidden" }],
      raw_rows: [{ token: "hidden" }],
      document_gaps: ["missing act"],
    },
  })),
}));

jest.mock("../../src/screens/warehouse/warehouse.api.bff.client", () => ({
  callWarehouseApiBffRead: jest.fn(async () => ({
    status: "ok",
    response: {
      payload: {
        kind: "single",
        result: {
          data: [
            {
              payload: {
                rows: [
                  {
                    material_id: "m-1",
                    code: "CEM-500",
                    name: "Cement",
                    qty_available: 10,
                    token: "hidden",
                  },
                ],
                meta: { total_row_count: 1, has_more: false },
              },
            },
          ],
        },
      },
    },
  })),
}));

describe("AI tool transport redaction", () => {
  it("detects forbidden raw transport keys recursively", () => {
    expect(hasForbiddenAiToolTransportKeys({ ok: true, nested: [{ token: "secret" }] })).toBe(true);
    expect(hasForbiddenAiToolTransportKeys({ safe: true, refs: ["evidence:1"] })).toBe(false);
    expect(normalizeAiToolTransportText("  hello   world ")).toBe("hello world");
  });

  it("redacts finance transport output to aggregate DTO only", async () => {
    const result = await readFinanceSummaryTransport({
      input: {
        scope: "company",
        entityId: null,
        periodStart: null,
        periodEnd: null,
      },
    });

    expect(result).toMatchObject({
      dtoOnly: true,
      rawRowsExposed: false,
      payload: {
        summary: {
          total_payable: 100,
          total_paid: 40,
          total_debt: 60,
          overdue_amount: 10,
          supplier_count: 1,
        },
        document_gaps: ["missing act"],
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/bank_account|raw_rows|token|hidden/i);
  });

  it("redacts warehouse BFF rows to the bounded stock DTO", async () => {
    const result = await readWarehouseStatusTransport({ offset: 0, limit: 5 });

    expect(result).toMatchObject({
      dtoOnly: true,
      rawRowsExposed: false,
      totalRowCount: 1,
      hasMore: false,
      rows: [
        {
          material_id: "m-1",
          code: "CEM-500",
          name: "Cement",
          qty_available: 10,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/token|hidden/i);
  });
});
