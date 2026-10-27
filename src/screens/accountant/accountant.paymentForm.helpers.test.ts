import {
  applyAllocationRow,
  buildFullAllocationRows,
  buildPaidAllocationState,
  derivePaymentFormCanonicalAmount,
  derivePaymentFormState,
  normalizePaymentFormItem,
} from "./accountant.paymentForm.helpers";

describe("accountant.paymentForm.helpers", () => {
  it("normalizes items and keeps invalid rows out of parity calculations", () => {
    expect(normalizePaymentFormItem({ id: "item-1", qty: "2", price: "15.5" })).toEqual({
      id: "item-1",
      name_human: null,
      uom: null,
      qty: 2,
      price: 15.5,
      rik_code: null,
    });
    expect(normalizePaymentFormItem({ id: "" })).toBeNull();
  });

  it("derives partial/full allocation parity without changing formulas", () => {
    const items = [
      { id: "item-1", name_human: "One", qty: 2, price: 50, uom: "pcs", rik_code: "MAT-1" },
      { id: "item-2", name_human: "Two", qty: 1, price: 30, uom: "pcs", rik_code: "MAT-2" },
    ];
    const { paidByLineMap, paidKnownSum } = buildPaidAllocationState([
      { proposal_item_id: "item-1", amount: 20 },
    ]);

    const partialState = derivePaymentFormState({
      current: {
        proposal_id: "proposal-1",
        invoice_amount: 130,
        outstanding_amount: 110,
        total_paid: 20,
        paid_unassigned: 0,
        invoice_currency: "KGS",
      },
      proposalId: "proposal-1",
      mode: "partial",
      items,
      paidByLineMap,
      paidKnownSum,
      allocRows: [{ proposal_item_id: "item-1", amount: 40 }],
      itemsLoading: false,
      paymentDataErrorMessage: null,
    });

    expect(partialState.restProposal).toBe(110);
    expect(partialState.paidBeforeByLine).toEqual([20, 0]);
    expect(partialState.remainByLine).toEqual([80, 30]);
    expect(partialState.allocSum).toBe(40);
    expect(partialState.allocOk).toBe(true);

    const fullRows = buildFullAllocationRows({
      items,
      remainByLine: partialState.remainByLine,
    });
    expect(fullRows).toEqual([
      { proposal_item_id: "item-1", amount: 80 },
      { proposal_item_id: "item-2", amount: 30 },
    ]);
  });

  it("uses canonical outstanding and paid_unassigned for proposal payment truth", () => {
    const items = [
      { id: "item-1", name_human: "One", qty: 2, price: 50, uom: "pcs", rik_code: "MAT-1" },
    ];

    const state = derivePaymentFormState({
      current: {
        proposal_id: "proposal-1",
        invoice_amount: 999,
        total_paid: 0,
        outstanding_amount: 35,
        paid_unassigned: 7,
        invoice_currency: "KGS",
      },
      proposalId: "proposal-1",
      mode: "partial",
      items,
      paidByLineMap: new Map(),
      paidKnownSum: 0,
      allocRows: [],
      itemsLoading: false,
      paymentDataErrorMessage: null,
    });

    expect(state.restProposal).toBe(35);
    expect(state.paidUnassigned).toBe(7);
  });

  it("derives the submit amount from the canonical payment owner", () => {
    expect(
      derivePaymentFormCanonicalAmount({
        proposalId: "proposal-1",
        mode: "full",
        restProposal: 35,
        allocSum: 12,
      }),
    ).toBe("35.00");
    expect(
      derivePaymentFormCanonicalAmount({
        proposalId: "proposal-1",
        mode: "partial",
        restProposal: 35,
        allocSum: 12,
      }),
    ).toBe("12.00");
    expect(
      derivePaymentFormCanonicalAmount({
        proposalId: "",
        mode: "full",
        restProposal: 35,
        allocSum: 12,
      }),
    ).toBeNull();
  });

  it("clamps per-line allocations to the actual residual", () => {
    const items = [
      { id: "item-1", name_human: "One", qty: 2, price: 50, uom: "pcs", rik_code: "MAT-1" },
      { id: "item-2", name_human: "Two", qty: 1, price: 30, uom: "pcs", rik_code: "MAT-2" },
    ];

    const nextRows = applyAllocationRow({
      allocRows: [],
      itemId: "item-1",
      value: 999,
      items,
      remainByLine: [80, 30],
    });

    expect(nextRows).toEqual([{ proposal_item_id: "item-1", amount: 80 }]);
  });
});
