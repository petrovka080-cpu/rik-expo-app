jest.mock("./_core", () => ({
  client: {
    rpc: jest.fn(),
  },
  rpcCompat: jest.fn(),
}));

jest.mock("./integrity.guards", () => ({
  ensureProposalExists: jest.fn(),
  ensureProposalItemIdsBelongToProposal: jest.fn(),
}));

import { client } from "./_core";
import {
  AccountantPayInvoiceAtomicError,
  accountantLoadProposalFinancialState,
  accountantPayInvoiceAtomic,
} from "./accountant";
import {
  ensureProposalExists,
  ensureProposalItemIdsBelongToProposal,
} from "./integrity.guards";

const mockClient = client as unknown as {
  rpc: jest.Mock;
};

const mockEnsureProposalExists = ensureProposalExists as unknown as jest.Mock;
const mockEnsureProposalItemIdsBelongToProposal =
  ensureProposalItemIdsBelongToProposal as unknown as jest.Mock;

describe("accountant financial rpc boundary", () => {
  beforeEach(() => {
    mockClient.rpc.mockReset();
    mockEnsureProposalExists.mockReset().mockResolvedValue({ proposalId: "proposal-1" });
    mockEnsureProposalItemIdsBelongToProposal.mockReset().mockResolvedValue(undefined);
  });

  it("loads canonical proposal financial state from rpc", async () => {
    mockClient.rpc.mockResolvedValue({
      data: {
        proposal: {
          proposal_id: "proposal-1",
          status: "Утверждено",
          sent_to_accountant_at: "2026-03-30T10:00:00.000Z",
          supplier: "Supplier",
        },
        invoice: {
          invoice_number: "INV-1",
          invoice_date: "2026-03-30",
          invoice_currency: "KGS",
          payable_source: "proposal_items_total",
        },
        totals: {
          payable_amount: 130,
          total_paid: 20,
          outstanding_amount: 110,
          payments_count: 1,
          payment_status: "Частично оплачено",
          last_paid_at: "2026-03-30T10:00:00.000Z",
        },
        eligibility: {
          approved: true,
          sent_to_accountant: true,
          payment_eligible: true,
          failure_code: null,
        },
        allocation_summary: {
          paid_known_sum: 20,
          paid_unassigned: 0,
          allocation_count: 2,
        },
        items: [
          {
            proposal_item_id: "item-1",
            name_human: "Line one",
            uom: "pcs",
            qty: 2,
            price: 50,
            rik_code: "MAT-1",
            line_total: 100,
            paid_total: 20,
            outstanding: 80,
          },
        ],
        meta: {
          source_kind: "rpc:accountant_proposal_financial_state_v1",
          backend_truth: true,
          legacy_total_paid: 0,
          legacy_payment_status: "К оплате",
        },
      },
      error: null,
    });

    const result = await accountantLoadProposalFinancialState("proposal-1");

    expect(mockEnsureProposalExists).toHaveBeenCalled();
    expect(mockClient.rpc).toHaveBeenCalledWith(
      "accountant_proposal_financial_state_v1",
      expect.objectContaining({ p_proposal_id: "proposal-1" }),
    );
    expect(result).toMatchObject({
      proposalId: "proposal-1",
      totals: {
        payableAmount: 130,
        totalPaid: 20,
        outstandingAmount: 110,
      },
      eligibility: {
        paymentEligible: true,
      },
      items: [
        expect.objectContaining({
          proposalItemId: "item-1",
          paidTotal: 20,
          outstanding: 80,
        }),
      ],
    });
  });

  it("commits payment through atomic rpc and returns parsed server truth", async () => {
    mockClient.rpc.mockResolvedValue({
      data: {
        ok: true,
        proposal_id: "proposal-1",
        payment_id: 77,
        client_mutation_id: "pay-1",
        idempotent_replay: false,
        outcome: "success",
        allocation_summary: {
          allocation_count: 1,
          allocated_amount: 10,
          requested_amount: 10,
        },
        totals_before: {
          payable_amount: 100,
          total_paid: 20,
          outstanding_amount: 80,
          payment_status: "Частично оплачено",
        },
        totals_after: {
          payable_amount: 100,
          total_paid: 30,
          outstanding_amount: 70,
          payment_status: "Частично оплачено",
        },
        server_truth: {
          proposal: {
            proposal_id: "proposal-1",
            status: "Утверждено",
            sent_to_accountant_at: "2026-03-30T10:00:00.000Z",
            supplier: "Supplier",
          },
          invoice: {
            invoice_number: "INV-1",
            invoice_date: "2026-03-30",
            invoice_currency: "KGS",
            payable_source: "proposal_items_total",
          },
          totals: {
            payable_amount: 100,
            total_paid: 30,
            outstanding_amount: 70,
            payments_count: 2,
            payment_status: "Частично оплачено",
            last_paid_at: "2026-03-30T10:10:00.000Z",
          },
          eligibility: {
            approved: true,
            sent_to_accountant: true,
            payment_eligible: true,
            failure_code: null,
          },
          allocation_summary: {
            paid_known_sum: 30,
            paid_unassigned: 0,
            allocation_count: 1,
          },
          items: [],
          meta: {
            source_kind: "rpc:accountant_proposal_financial_state_v1",
            backend_truth: true,
            legacy_total_paid: 30,
            legacy_payment_status: "Частично оплачено",
          },
        },
      },
      error: null,
    });

    const result = await accountantPayInvoiceAtomic({
      proposalId: "proposal-1",
      amount: 10,
      accountantFio: "Accountant",
      purpose: "Payment",
      clientMutationId: "pay-1",
      method: "Банк",
      allocations: [{ proposal_item_id: "item-1", amount: 10 }],
      expectedTotalPaid: 20,
      expectedOutstanding: 80,
    });

    expect(mockEnsureProposalExists).toHaveBeenCalled();
    expect(mockEnsureProposalItemIdsBelongToProposal).toHaveBeenCalledWith(
      expect.anything(),
      "proposal-1",
      ["item-1"],
      expect.any(Object),
    );
    expect(mockClient.rpc).toHaveBeenCalledWith(
      "accounting_pay_invoice_v1",
      expect.objectContaining({
        p_proposal_id: "proposal-1",
        p_amount: 10,
        p_client_mutation_id: "pay-1",
        p_expected_total_paid: 20,
        p_expected_outstanding: 80,
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      paymentId: 77,
      clientMutationId: "pay-1",
      idempotentReplay: false,
      outcome: "success",
      totalsAfter: {
        totalPaid: 30,
        outstandingAmount: 70,
      },
      serverTruth: {
        proposalId: "proposal-1",
      },
    });
  });

  it("throws typed failure when server rejects payment", async () => {
    mockClient.rpc.mockResolvedValue({
      data: {
        ok: false,
        proposal_id: "proposal-1",
        failure_code: "amount_exceeds_outstanding",
        failure_message: "Requested amount exceeds outstanding balance.",
        totals_before: {
          payable_amount: 100,
          total_paid: 20,
          outstanding_amount: 80,
          payment_status: "Частично оплачено",
        },
        validation: {
          approved: true,
          sent_to_accountant: true,
          payment_eligible: true,
          proposal_status: "Утверждено",
        },
        allocation_summary: {
          allocation_count: 1,
          allocated_amount: 90,
          requested_amount: 90,
        },
      },
      error: null,
    });

    await expect(
      accountantPayInvoiceAtomic({
        proposalId: "proposal-1",
        amount: 90,
        accountantFio: "Accountant",
        purpose: "Payment",
        clientMutationId: "pay-rejected",
        method: "Банк",
        allocations: [{ proposal_item_id: "item-1", amount: 90 }],
      }),
    ).rejects.toMatchObject({
      name: "AccountantPayInvoiceAtomicError",
      code: "amount_exceeds_outstanding",
      proposalId: "proposal-1",
    } satisfies Partial<AccountantPayInvoiceAtomicError>);
  });
});
