import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import { runAccountantReturnToBuyerChain } from "./accountant.return.service";
import { normalizeAccountantInboxRpcTab } from "../../lib/api/accountant";
import { loadAccountantHistoryWindowData } from "./accountant.history.service";
import {
  adaptAccountantInboxScopeEnvelope,
  buildAccountantInboxScopeRpcArgs,
  loadAccountantInboxWindowData,
  resolveAccountantInboxRpcTabContract,
} from "./accountant.inbox.service";
import type { Tab } from "./types";

jest.mock("../../lib/api/accountant", () => ({
  accountantReturnToBuyer: jest.fn(),
  normalizeAccountantInboxRpcTab: jest.requireActual("../../lib/api/accountant").normalizeAccountantInboxRpcTab,
}));

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

jest.mock("../../lib/api/integrity.guards", () => ({
  filterProposalLinkedRowsByExistingProposalLinks: jest.fn(async (_client, rows) => ({
    rows,
    filteredCount: 0,
  })),
  filterPaymentRowsByExistingPaymentProposalLinks: jest.fn(async (_client, rows) => ({
    rows,
    filteredCount: 0,
  })),
}));

jest.mock("../../lib/logger", () => ({
  logger: {
    info: jest.fn(),
  },
}));

const { supabase: mockSupabase } = jest.requireMock("../../lib/supabaseClient") as {
  supabase: {
    rpc: jest.Mock;
  };
};

const { accountantReturnToBuyer } = jest.requireMock("../../lib/api/accountant") as {
  accountantReturnToBuyer: jest.Mock;
};

const integrityGuards = jest.requireMock("../../lib/api/integrity.guards") as {
  filterProposalLinkedRowsByExistingProposalLinks: jest.Mock;
  filterPaymentRowsByExistingPaymentProposalLinks: jest.Mock;
};

const ACCOUNTANT_TAB_PAY = "Рљ РѕРїР»Р°С‚Рµ" as unknown as Tab;

describe("accountant window services", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
    mockSupabase.rpc.mockReset();
    accountantReturnToBuyer.mockReset();
    integrityGuards.filterProposalLinkedRowsByExistingProposalLinks.mockClear();
    integrityGuards.filterPaymentRowsByExistingPaymentProposalLinks.mockClear();
  });

  it("loads inbox rows from rpc_scope_v1 without legacy window fallback", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        rows: [
          {
            proposal_id: "proposal-1",
            proposal_no: "P-1",
            supplier: "Supplier",
            invoice_number: "INV-1",
            invoice_date: "2026-03-30",
            invoice_amount: 120,
            outstanding_amount: 100,
            invoice_currency: "KGS",
            payment_status: "pending",
            total_paid: 20,
            payments_count: 1,
            has_invoice: true,
            sent_to_accountant_at: "2026-03-30T00:00:00Z",
            payment_eligible: true,
            failure_code: null,
            last_paid_at: 1711756800000,
          },
        ],
        meta: {
          offset_rows: 0,
          limit_rows: 40,
          returned_row_count: 1,
          total_row_count: 1,
          has_more: false,
          tab: ACCOUNTANT_TAB_PAY,
        },
      },
      error: null,
    });

    const result = await loadAccountantInboxWindowData({
      tab: ACCOUNTANT_TAB_PAY,
      offsetRows: 0,
      limitRows: 40,
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith("accountant_inbox_scope_v1", {
      p_tab: normalizeAccountantInboxRpcTab(ACCOUNTANT_TAB_PAY),
      p_offset: 0,
      p_limit: 40,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.sourceMeta).toEqual({
      primaryOwner: "rpc_scope_v1",
      fallbackUsed: false,
      sourceKind: "rpc:accountant_inbox_scope_v1",
      parityStatus: "not_checked",
      backendFirstPrimary: true,
    });
    expect(result.rows[0]).toMatchObject({
      proposal_id: "proposal-1",
      outstanding_amount: 100,
      payment_eligible: true,
      failure_code: null,
    });
    expect(integrityGuards.filterProposalLinkedRowsByExistingProposalLinks).toHaveBeenCalledTimes(1);
  });

  it("surfaces inbox rpc failure without falling back to legacy window data", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("forced_inbox_scope_failure"),
    });

    await expect(
      loadAccountantInboxWindowData({
        tab: ACCOUNTANT_TAB_PAY,
        offsetRows: 0,
        limitRows: 40,
      }),
    ).rejects.toThrow("forced_inbox_scope_failure");

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("accountant_inbox_scope_v1", {
      p_tab: normalizeAccountantInboxRpcTab(ACCOUNTANT_TAB_PAY),
      p_offset: 0,
      p_limit: 40,
    });
    expect(integrityGuards.filterProposalLinkedRowsByExistingProposalLinks).not.toHaveBeenCalled();
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.screen === "accountant"
          && event.surface === "inbox_window"
          && event.event === "load_inbox_primary_rpc"
          && event.result === "error"
          && event.fallbackUsed === false,
      ),
    ).toBe(true);
  });

  it("builds rpc args with a ready accountant tab contract for valid input", () => {
    const contract = resolveAccountantInboxRpcTabContract(ACCOUNTANT_TAB_PAY);
    const args = buildAccountantInboxScopeRpcArgs({
      tab: ACCOUNTANT_TAB_PAY,
      offsetRows: -10,
      limitRows: 0,
    });

    expect(contract).toEqual({
      status: "ready",
      rpcTab: normalizeAccountantInboxRpcTab(ACCOUNTANT_TAB_PAY),
    });
    expect(args).toEqual({
      p_tab: normalizeAccountantInboxRpcTab(ACCOUNTANT_TAB_PAY) ?? undefined,
      p_offset: 0,
      p_limit: 1,
    });
  });

  it("omits the rpc tab when the boundary input is empty or undefined", () => {
    const emptyTab = "" as unknown as Tab;
    const undefinedTab = undefined as unknown as Tab;

    expect(resolveAccountantInboxRpcTabContract(emptyTab)).toEqual({
      status: "missing",
    });
    expect(resolveAccountantInboxRpcTabContract(undefinedTab)).toEqual({
      status: "missing",
    });
    expect(
      buildAccountantInboxScopeRpcArgs({
        tab: emptyTab,
        offsetRows: 5,
        limitRows: 25,
      }),
    ).toEqual({
      p_tab: undefined,
      p_offset: 5,
      p_limit: 25,
    });
  });

  it("adapts partial and malformed inbox scope payloads without false rows", () => {
    const envelope = adaptAccountantInboxScopeEnvelope({
      rows: [
        {
          proposal_id: null,
          proposal_no: "drop-me",
        },
        {
          proposal_id: "proposal-1",
          proposal_no: "P-1",
          payments_count: "bad-count",
          has_invoice: "not-boolean",
          payment_eligible: "not-boolean",
          invoice_currency: null,
          last_paid_at: "bad-last-paid-at",
        },
        "bad-row",
      ],
      meta: null,
    });

    expect(envelope.rows).toEqual([
      {
        proposal_id: "proposal-1",
        proposal_no: "P-1",
        id_short: null,
        supplier: null,
        invoice_number: null,
        invoice_date: null,
        invoice_amount: null,
        outstanding_amount: null,
        invoice_currency: "KGS",
        payment_status: null,
        total_paid: 0,
        payments_count: 0,
        has_invoice: false,
        sent_to_accountant_at: null,
        payment_eligible: null,
        failure_code: null,
        last_paid_at: null,
      },
    ]);
    expect(envelope.meta).toEqual({});
  });

  it("loads history rows from rpc_scope_v1 without legacy window fallback", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        rows: [
          {
            payment_id: 1,
            paid_at: "2026-03-30T00:00:00Z",
            proposal_id: "proposal-1",
            supplier: "Supplier",
            invoice_number: "INV-1",
            invoice_date: "2026-03-30",
            invoice_amount: 120,
            invoice_currency: "KGS",
            amount: 120,
            method: "bank",
            note: "note",
            has_invoice: true,
            accountant_fio: "Accountant",
            purpose: "Payment",
          },
        ],
        meta: {
          offset_rows: 0,
          limit_rows: 50,
          returned_row_count: 1,
          total_row_count: 1,
          total_amount: 120,
          has_more: false,
          date_from: null,
          date_to: null,
          search: null,
        },
      },
      error: null,
    });

    const result = await loadAccountantHistoryWindowData({
      dateFrom: "",
      dateTo: "",
      histSearch: "",
      offsetRows: 0,
      limitRows: 50,
      toRpcDateOrNull: (value) => {
        const text = String(value ?? "").trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
      },
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith("accountant_history_scope_v1", {
      p_date_from: undefined,
      p_date_to: undefined,
      p_search: undefined,
      p_offset: 0,
      p_limit: 50,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.sourceMeta).toEqual({
      primaryOwner: "rpc_scope_v1",
      fallbackUsed: false,
      sourceKind: "rpc:accountant_history_scope_v1",
      parityStatus: "not_checked",
      backendFirstPrimary: true,
    });
    expect(integrityGuards.filterPaymentRowsByExistingPaymentProposalLinks).toHaveBeenCalledTimes(1);
  });

  it("surfaces history rpc failure without falling back to legacy window data", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("forced_history_scope_failure"),
    });

    await expect(
      loadAccountantHistoryWindowData({
        dateFrom: "",
        dateTo: "",
        histSearch: "",
        offsetRows: 0,
        limitRows: 50,
        toRpcDateOrNull: (value) => {
          const text = String(value ?? "").trim();
          return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
        },
      }),
    ).rejects.toThrow("forced_history_scope_failure");

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("accountant_history_scope_v1", {
      p_date_from: undefined,
      p_date_to: undefined,
      p_search: undefined,
      p_offset: 0,
      p_limit: 50,
    });
    expect(integrityGuards.filterPaymentRowsByExistingPaymentProposalLinks).not.toHaveBeenCalled();
  });

  it("passes an undefined comment through the direct return boundary when the user input is empty", async () => {
    accountantReturnToBuyer.mockResolvedValue(undefined);

    await runAccountantReturnToBuyerChain({
      proposalId: "proposal-1",
      comment: "   ",
    });

    expect(accountantReturnToBuyer).toHaveBeenCalledWith({
      proposalId: "proposal-1",
      comment: undefined,
    });
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it("keeps fallback return RPC calls optional instead of sending null comments", async () => {
    accountantReturnToBuyer.mockRejectedValueOnce(new Error("primary_failed"));
    mockSupabase.rpc
      .mockResolvedValueOnce({ error: new Error("rpc_failed") })
      .mockResolvedValueOnce({ error: null });

    await runAccountantReturnToBuyerChain({
      proposalId: "proposal-2",
      comment: null,
    });

    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, "acc_return_min_auto", {
      p_proposal_id: "proposal-2",
      p_comment: undefined,
    });
    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, "proposal_return_to_buyer_min", {
      p_proposal_id: "proposal-2",
      p_comment: undefined,
    });
  });
});
