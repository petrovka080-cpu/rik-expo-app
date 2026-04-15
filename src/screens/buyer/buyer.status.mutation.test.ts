import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";

import {
  clearRequestItemsDirectorRejectState,
  sendProposalToAccountingMin,
  setRequestItemsDirectorStatus,
  setRequestItemsDirectorStatusFallback,
} from "./buyer.actions.repo";
import {
  ensureProposalHtmlAttachmentMutation,
  uploadInvoiceAttachmentMutation,
} from "./buyer.attachments.mutation";
import { isBuyerMutationFailure } from "./buyer.mutation.shared";
import {
  runProposalAccountingMutation,
  syncSubmittedRequestItemsStatusMutation,
} from "./buyer.status.mutation";

jest.mock("./buyer.actions.repo", () => ({
  clearRequestItemsDirectorRejectState: jest.fn(),
  sendProposalToAccountingMin: jest.fn(),
  setRequestItemsDirectorStatus: jest.fn(),
  setRequestItemsDirectorStatusFallback: jest.fn(),
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
const mockedSetRequestItemsDirectorStatusFallback =
  setRequestItemsDirectorStatusFallback as unknown as jest.Mock;
const mockedEnsureProposalHtmlAttachmentMutation =
  ensureProposalHtmlAttachmentMutation as unknown as jest.Mock;
const mockedUploadInvoiceAttachmentMutation =
  uploadInvoiceAttachmentMutation as unknown as jest.Mock;

const buildSupabase = () =>
  ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(async () => ({
            data: {
              payment_status: "sent",
              sent_to_accountant_at: "2026-03-30T12:00:00.000Z",
            },
            error: null,
          })),
        })),
      })),
    })),
  }) as never;

describe("buyer status mutation owner", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    resetPlatformObservabilityEvents();
    mockedClearRequestItemsDirectorRejectState.mockReset().mockResolvedValue(undefined);
    mockedSendProposalToAccountingMin.mockReset().mockResolvedValue({ error: null });
    mockedSetRequestItemsDirectorStatus.mockReset().mockResolvedValue({ error: null });
    mockedSetRequestItemsDirectorStatusFallback.mockReset().mockResolvedValue(undefined);
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

  it("does not hide degraded status propagation after primary and fallback failures", async () => {
    mockedSetRequestItemsDirectorStatus.mockResolvedValue({
      error: new Error("rpc failed"),
    });
    mockedSetRequestItemsDirectorStatusFallback.mockRejectedValue(
      new Error("fallback failed"),
    );
    mockedClearRequestItemsDirectorRejectState.mockRejectedValue(
      new Error("reject clear failed"),
    );

    const result = await syncSubmittedRequestItemsStatusMutation({
      supabase: {} as never,
      affectedIds: ["ri-1"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("partial_success");
    expect(result.warnings).toHaveLength(2);
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.surface === "buyer_status_mutation" &&
          event.event === "stage_warning" &&
          event.errorStage === "set_request_items_director_status",
      ),
    ).toBe(true);
  });

  it("surfaces the exact accounting handoff stage on failure", async () => {
    const result = await runProposalAccountingMutation({
      operation: "send_to_accounting",
      proposalId: "proposal-1",
      invNumber: "INV-1",
      invDate: "2026-03-30",
      invAmount: "100",
      invCurrency: "KGS",
      buildProposalPdfHtml: async () => "<html></html>",
      proposalSendToAccountant: async () => undefined,
      uploadProposalAttachment: async () => undefined,
      ensureAccountingFlags: async () => {
        throw new Error("flags failed");
      },
      supabase: buildSupabase(),
      fetchBuckets: async () => undefined,
    });

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("ensure_accounting_flags");
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.surface === "buyer_status_mutation" &&
          event.event === "stage_failed" &&
          event.errorStage === "ensure_accounting_flags",
      ),
    ).toBe(true);
  });
});
