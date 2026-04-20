import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";

import {
  clearRequestItemsDirectorRejectState,
  sendProposalToAccountingMin,
  setRequestItemsDirectorStatus,
} from "./buyer.actions.repo";
import {
  ensureProposalHtmlAttachmentMutation,
  uploadInvoiceAttachmentMutation,
} from "./buyer.attachments.mutation";
import { isBuyerMutationFailure } from "./buyer.mutation.shared";
import {
  runProposalAccountingMutation,
  sendToAccountingAction,
  syncSubmittedRequestItemsStatusMutation,
} from "./buyer.status.mutation";

jest.mock("./buyer.actions.repo", () => ({
  clearRequestItemsDirectorRejectState: jest.fn(),
  sendProposalToAccountingMin: jest.fn(),
  setRequestItemsDirectorStatus: jest.fn(),
}));

jest.mock("./buyer.attachments.mutation", () => ({
  ensureProposalHtmlAttachmentMutation: jest.fn(),
  uploadInvoiceAttachmentMutation: jest.fn(),
}));

const mockedClearRequestItemsDirectorRejectState =
  clearRequestItemsDirectorRejectState as unknown as jest.Mock;
const mockedSendProposalToAccountingMin =
  sendProposalToAccountingMin as unknown as jest.Mock;
const mockedSetRequestItemsDirectorStatus =
  setRequestItemsDirectorStatus as unknown as jest.Mock;
const mockedEnsureProposalHtmlAttachmentMutation =
  ensureProposalHtmlAttachmentMutation as unknown as jest.Mock;
const mockedUploadInvoiceAttachmentMutation =
  uploadInvoiceAttachmentMutation as unknown as jest.Mock;

const serverAccountingRow = {
  payment_status: "К оплате",
  sent_to_accountant_at: "2026-03-30T12:00:00.000Z",
  invoice_amount: 100,
};

const buildSupabase = (
  row: Record<string, unknown> | null = serverAccountingRow,
  error: Error | null = null,
) => {
  const maybeSingle = jest.fn(async () => ({ data: row, error }));
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));

  return {
    client: { from } as never,
    from,
    select,
    eq,
    maybeSingle,
  };
};

const buildAccountingParams = (
  overrides: Partial<Parameters<typeof runProposalAccountingMutation>[0]> = {},
) => {
  const supabase = buildSupabase();
  return {
    operation: "send_to_accounting" as const,
    proposalId: "proposal-1",
    invNumber: "INV-1",
    invDate: "2026-03-30",
    invAmount: "100",
    invCurrency: "KGS",
    buildProposalPdfHtml: jest.fn(async () => "<html></html>"),
    proposalSendToAccountant: jest.fn(async () => undefined),
    uploadProposalAttachment: jest.fn(async () => undefined),
    ensureAccountingFlags: jest.fn(async () => undefined),
    supabase: supabase.client,
    fetchBuckets: jest.fn(async () => undefined),
    ...overrides,
  };
};

const buildAccountingActionParams = (
  overrides: Partial<Parameters<typeof sendToAccountingAction>[0]> = {},
) => ({
  acctProposalId: "proposal-1",
  invNumber: "INV-1",
  invDate: "2026-03-30",
  invAmount: "100",
  invCurrency: "KGS",
  buildProposalPdfHtml: jest.fn(async () => "<html></html>"),
  proposalSendToAccountant: jest.fn(async () => undefined),
  uploadProposalAttachment: jest.fn(async () => undefined),
  ensureAccountingFlags: jest.fn(async () => undefined),
  supabase: buildSupabase().client,
  fetchBuckets: jest.fn(async () => undefined),
  closeSheet: jest.fn(),
  setApproved: jest.fn(),
  setBusy: jest.fn(),
  alert: jest.fn(),
  ...overrides,
});

describe("buyer status mutation owner", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    resetPlatformObservabilityEvents();
    mockedClearRequestItemsDirectorRejectState
      .mockReset()
      .mockResolvedValue(undefined);
    mockedSendProposalToAccountingMin
      .mockReset()
      .mockResolvedValue({ error: null });
    mockedSetRequestItemsDirectorStatus
      .mockReset()
      .mockResolvedValue({ error: null });
    mockedEnsureProposalHtmlAttachmentMutation.mockReset().mockResolvedValue({
      ok: true,
      family: "attachments",
      operation: "ensure_proposal_html",
      status: "success",
      completedStages: ["ensure_proposal_html"],
      warnings: [],
      data: { proposalId: "proposal-1", mode: "existing" },
    });
    mockedUploadInvoiceAttachmentMutation.mockReset().mockResolvedValue({
      ok: true,
      family: "attachments",
      operation: "upload_invoice_attachment",
      status: "success",
      completedStages: ["upload_invoice_attachment"],
      warnings: [],
      data: { proposalId: "proposal-1", uploaded: true },
    });
  });

  it("keeps status propagation happy path inside the status owner", async () => {
    const result = await syncSubmittedRequestItemsStatusMutation({
      supabase: {} as never,
      affectedIds: ["ri-1", "ri-2"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("success");
    expect(result.data).toEqual({ affectedIds: ["ri-1", "ri-2"] });
    expect(result.completedStages).toEqual([
      "set_request_items_director_status",
      "clear_request_item_reject_state",
    ]);
  });

  it("fails closed when the server-owned status RPC is unavailable", async () => {
    mockedSetRequestItemsDirectorStatus.mockResolvedValue({
      error: new Error("rpc failed"),
    });

    const result = await syncSubmittedRequestItemsStatusMutation({
      supabase: {} as never,
      affectedIds: ["ri-1"],
    });

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("set_request_items_director_status");
    expect(mockedClearRequestItemsDirectorRejectState).not.toHaveBeenCalled();
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.surface === "buyer_status_mutation" &&
          event.event === "stage_failed" &&
          event.errorStage === "set_request_items_director_status",
      ),
    ).toBe(true);
  });

  it("reads authoritative server state after accounting handoff before success", async () => {
    const supabase = buildSupabase();
    const ensureAccountingFlags = jest.fn(async () => undefined);
    const fetchBuckets = jest.fn(async () => undefined);

    const result = await runProposalAccountingMutation(
      buildAccountingParams({
        supabase: supabase.client,
        ensureAccountingFlags,
        fetchBuckets,
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("success");
    expect(result.completedStages).toEqual([
      "validate_invoice_fields",
      "ensure_proposal_html",
      "send_to_accountant",
      "verify_accountant_state",
      "refresh_bucket_lists",
    ]);
    expect(supabase.from).toHaveBeenCalledWith("proposals");
    expect(supabase.select).toHaveBeenCalledWith(
      "payment_status, sent_to_accountant_at, invoice_amount",
    );
    expect(ensureAccountingFlags).not.toHaveBeenCalled();
    expect(fetchBuckets).toHaveBeenCalledTimes(1);
  });

  it("does not claim success when server truth is stale after handoff", async () => {
    const supabase = buildSupabase({
      payment_status: null,
      sent_to_accountant_at: null,
      invoice_amount: null,
    });
    const ensureAccountingFlags = jest.fn(async () => undefined);

    const result = await runProposalAccountingMutation(
      buildAccountingParams({
        supabase: supabase.client,
        ensureAccountingFlags,
      }),
    );

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("verify_accountant_state");
    expect(ensureAccountingFlags).not.toHaveBeenCalled();
    expect(result.completedStages).toEqual([
      "validate_invoice_fields",
      "ensure_proposal_html",
      "send_to_accountant",
    ]);
  });

  it("surfaces terminal handoff failure without verify or local success", async () => {
    mockedSendProposalToAccountingMin.mockResolvedValue({
      error: new Error("fallback rpc failed"),
    });
    const supabase = buildSupabase();
    const fetchBuckets = jest.fn(async () => undefined);

    const result = await runProposalAccountingMutation(
      buildAccountingParams({
        supabase: supabase.client,
        proposalSendToAccountant: jest.fn(async () => {
          throw new Error("adapter failed");
        }),
        fetchBuckets,
      }),
    );

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("send_to_accountant");
    expect(supabase.from).not.toHaveBeenCalled();
    expect(fetchBuckets).not.toHaveBeenCalled();
  });

  it("keeps adapter fallback visible as partial success instead of masking it", async () => {
    const result = await runProposalAccountingMutation(
      buildAccountingParams({
        proposalSendToAccountant: jest.fn(async () => {
          throw new Error("adapter timed out");
        }),
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("partial_success");
    expect(result.warnings).toEqual([
      expect.objectContaining({
        stage: "send_to_accountant",
        degraded: true,
      }),
    ]);
    expect(mockedSendProposalToAccountingMin).toHaveBeenCalledTimes(1);
  });

  it("does not report final success when post-write authoritative refresh fails", async () => {
    const alert = jest.fn();
    const closeSheet = jest.fn();
    const setApproved = jest.fn();

    const result = await sendToAccountingAction(
      buildAccountingActionParams({
        fetchBuckets: jest.fn(async () => {
          throw new Error("refresh failed");
        }),
        alert,
        closeSheet,
        setApproved,
      }),
    );

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("refresh_bucket_lists");
    expect(setApproved).not.toHaveBeenCalled();
    expect(closeSheet).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      "Ошибка отправки",
      expect.stringContaining("Обновление buyer buckets"),
    );
  });

  it("does not send duplicate accounting requests while an action is already in flight", async () => {
    const inFlightRef = { current: true };
    const proposalSendToAccountant = jest.fn(async () => undefined);
    const alert = jest.fn();
    const setBusy = jest.fn();
    const closeSheet = jest.fn();
    const setApproved = jest.fn();

    const result = await sendToAccountingAction(
      buildAccountingActionParams({
        inFlightRef,
        proposalSendToAccountant,
        alert,
        setBusy,
        closeSheet,
        setApproved,
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data?.skipped).toBe("duplicate_in_flight");
    expect(proposalSendToAccountant).not.toHaveBeenCalled();
    expect(setBusy).not.toHaveBeenCalled();
    expect(setApproved).not.toHaveBeenCalled();
    expect(closeSheet).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it("does not call downstream finance RPC after failed internal attachment step", async () => {
    mockedEnsureProposalHtmlAttachmentMutation.mockResolvedValueOnce({
      ok: false,
      family: "attachments",
      operation: "ensure_proposal_html",
      status: "failed",
      failedStage: "ensure_proposal_html",
      completedStages: [],
      warnings: [],
      error: new Error("html failed"),
      message: "html failed",
    });
    const proposalSendToAccountant = jest.fn(async () => undefined);

    const result = await runProposalAccountingMutation(
      buildAccountingParams({ proposalSendToAccountant }),
    );

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("ensure_proposal_html");
    expect(proposalSendToAccountant).not.toHaveBeenCalled();
    expect(mockedSendProposalToAccountingMin).not.toHaveBeenCalled();
  });
});
