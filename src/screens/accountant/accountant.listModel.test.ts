import {
  buildAccountantListModel,
  getAccountantListEstimatedItemSize,
  getAccountantListItemKey,
} from "./accountant.listModel";
import type { HistoryRow } from "./types";

const historyRow = (paymentId: number): HistoryRow => ({
  payment_id: paymentId,
  paid_at: "2026-04-13T00:00:00Z",
  proposal_id: `proposal-${paymentId}`,
  supplier: "Supplier",
  invoice_number: "INV",
  invoice_date: "2026-04-13",
  invoice_amount: 100,
  invoice_currency: "KGS",
  amount: 100,
  method: "bank",
  note: null,
  has_invoice: true,
});

describe("accountant list model", () => {
  it("builds a single virtualized inbox list model without mutating row data", () => {
    const inboxRows = [{ proposal_id: "proposal-1", label: "first" }];

    const model = buildAccountantListModel({
      isHistory: false,
      historyRows: [historyRow(1)],
      rows: inboxRows,
    });

    expect(model).toEqual([{ __kind: "inbox", data: inboxRows[0] }]);
    expect(model[0].data).toBe(inboxRows[0]);
    expect(getAccountantListItemKey(model[0], 0)).toBe("inbox:proposal-1");
    expect(getAccountantListEstimatedItemSize(false)).toBe(128);
  });

  it("builds a single virtualized history list model with stable keys", () => {
    const rows = [historyRow(10), historyRow(20)];

    const model = buildAccountantListModel({
      isHistory: true,
      historyRows: rows,
      rows: [{ proposal_id: "proposal-ignored" }],
    });

    expect(model.map((item) => item.__kind)).toEqual(["history", "history"]);
    expect(model[1].data).toBe(rows[1]);
    expect(getAccountantListItemKey(model[1], 1)).toBe("history:20");
    expect(getAccountantListEstimatedItemSize(true)).toBe(112);
  });
});
