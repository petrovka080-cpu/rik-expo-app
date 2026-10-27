import { mapAccountantListRowToProps } from "./accountantRowAdapters";

describe("accountantRowAdapters", () => {
  it("uses canonical outstanding_amount instead of recomputing client rest", () => {
    const row = mapAccountantListRowToProps({
      proposal_id: "proposal-1",
      supplier: "Supplier",
      invoice_number: "INV-1",
      invoice_date: "2026-03-31",
      invoice_amount: 999,
      outstanding_amount: 35,
      invoice_currency: "KGS",
      payment_status: "Частично оплачено",
      total_paid: 0,
      sent_to_accountant_at: "2026-03-31T10:00:00.000Z",
      has_invoice: true,
      payments_count: 1,
    });

    expect(row.sum).toBe(999);
    expect(row.rest).toBe(35);
    expect(row.statusTone).toBe("warning");
  });
});
