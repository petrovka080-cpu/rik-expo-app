import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import type { CreateProposalsResult } from "../../lib/catalog_api";

import { uploadSupplierProposalAttachmentsMutation } from "./buyer.attachments.mutation";
import { syncSubmittedRequestItemsStatusMutation } from "./buyer.status.mutation";
import { isBuyerMutationFailure } from "./buyer.mutation.shared";
import { handleCreateProposalsBySupplierAction } from "./buyer.submit.mutation";
import { classifyProposalActionFailure } from "../../lib/api/proposalActionBoundary";

jest.mock("../../lib/supabaseClient", () => ({ supabase: {} }));

jest.mock("./buyer.attachments.mutation", () => ({
  uploadSupplierProposalAttachmentsMutation: jest.fn(),
}));

jest.mock("./buyer.status.mutation", () => ({
  syncSubmittedRequestItemsStatusMutation: jest.fn(),
}));

const mockedUploadSupplierProposalAttachmentsMutation =
  uploadSupplierProposalAttachmentsMutation as unknown as jest.Mock;
const mockedSyncSubmittedRequestItemsStatusMutation =
  syncSubmittedRequestItemsStatusMutation as unknown as jest.Mock;

const buildCreateResult = (
  overrides: Partial<CreateProposalsResult["proposals"][number]> = {},
): CreateProposalsResult => ({
  proposals: [
    {
      proposal_id: "proposal-1",
      proposal_no: "P-1",
      supplier: "Acme",
      request_item_ids: ["ri-1"],
      status: "submitted",
      raw_status: "submitted",
      submitted: true,
      submitted_at: "2026-03-30T10:00:00.000Z",
      visible_to_director: true,
      submit_source: "rpc:proposal_submit",
      ...overrides,
    },
  ],
});

const buildSubmitReadbackSupabase = (
  response: {
    data?: unknown[];
    error?: unknown;
  } = {
    data: [
      {
        id: "proposal-1",
        status: "submitted",
        submitted_at: "2026-03-30T10:00:00.000Z",
        sent_to_accountant_at: null,
      },
    ],
    error: null,
  },
) => {
  const maybeSingleMock = jest.fn(async () => ({
    data: Array.isArray(response.data) ? (response.data[0] ?? null) : null,
    error: response.error ?? null,
  }));
  const eqMock = jest.fn(() => ({ maybeSingle: maybeSingleMock }));
  const selectMock = jest.fn(() => ({ eq: eqMock }));
  const fromMock = jest.fn(() => ({ select: selectMock }));
  return {
    supabase: { from: fromMock } as never,
    fromMock,
    selectMock,
    eqMock,
    maybeSingleMock,
  };
};

const baseSubmitDeps = () => {
  const alert = jest.fn();
  const readback = buildSubmitReadbackSupabase();
  return {
    deps: {
      creating: false,
      sendingRef: { current: false },
      pickedIds: ["ri-1"],
      metaNow: {
        "ri-1": {
          supplier: "Acme",
          price: "100",
          note: "note",
        },
      },
      attachmentsNow: {},
      buyerFio: "Buyer User",
      buyerId: "buyer-1",
      requestId: "request-1",
      needAttachWarn: false,
      kbOpen: false,
      validatePicked: jest.fn(() => true),
      confirmSendWithoutAttachments: jest.fn(async () => true),
      apiCreateProposalsBySupplier: jest.fn(async () => buildCreateResult()),
      supabase: readback.supabase,
      uploadProposalAttachment: jest.fn(async () => undefined),
      setAttachments: jest.fn(),
      removeFromInboxLocally: jest.fn(),
      clearPick: jest.fn(),
      fetchInbox: jest.fn(async () => undefined),
      fetchBuckets: jest.fn(async () => undefined),
      setTab: jest.fn(),
      closeSheet: jest.fn(),
      setShowAttachBlock: jest.fn(),
      showToast: jest.fn(),
      alert,
      jobQueueEnabled: false,
    },
    alert,
    readback,
  };
};

describe("buyer submit mutation owner", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    resetPlatformObservabilityEvents();
    mockedUploadSupplierProposalAttachmentsMutation.mockReset().mockResolvedValue({
      ok: true,
      family: "attachments",
      operation: "upload_supplier_attachments",
      status: "success",
      completedStages: ["upload_supplier_attachments"],
      warnings: [],
      data: { uploadCount: 0, failedCount: 0 },
    });
    mockedSyncSubmittedRequestItemsStatusMutation.mockReset().mockResolvedValue({
      ok: true,
      family: "status",
      operation: "sync_submit_request_items",
      status: "success",
      completedStages: [
        "set_request_items_director_status",
        "clear_request_item_reject_state",
      ],
      warnings: [],
      data: { affectedIds: ["ri-1"] },
    });
  });

  it("keeps submit happy path inside the submit owner", async () => {
    const { deps, alert, readback } = baseSubmitDeps();

    const result = await handleCreateProposalsBySupplierAction(deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("success");
    expect(result.data).toEqual({
      mode: "sync",
      createdProposalIds: ["proposal-1"],
      affectedRequestItemIds: ["ri-1"],
      terminalClass: "success",
      readbackConfirmed: true,
    });
    expect(readback.fromMock).toHaveBeenCalledWith("proposals");
    expect(readback.eqMock).toHaveBeenCalledWith("id", "proposal-1");
    expect(readback.maybeSingleMock).toHaveBeenCalled();
    expect(deps.setAttachments).toHaveBeenCalledWith({});
    expect(deps.removeFromInboxLocally).toHaveBeenCalledWith(["ri-1"]);
    expect(deps.clearPick).toHaveBeenCalled();
    expect(deps.setTab).toHaveBeenCalledWith("pending");
    expect(deps.closeSheet).toHaveBeenCalled();
    expect(deps.apiCreateProposalsBySupplier).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        buyerFio: "Buyer User",
        requestId: "request-1",
        clientMutationId: expect.any(String),
      }),
    );
    expect(alert).toHaveBeenCalledWith(
      expect.stringContaining("Отправлено"),
      expect.stringContaining("Создано предложений: 1"),
    );
  });

  it("surfaces the exact submit failure stage when director visibility breaks", async () => {
    const { deps, alert } = baseSubmitDeps();
    deps.apiCreateProposalsBySupplier = jest.fn(async () =>
      buildCreateResult({ visible_to_director: false }),
    );

    const result = await handleCreateProposalsBySupplierAction(deps);

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("verify_director_visibility");
    expect(alert).toHaveBeenCalled();
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.surface === "buyer_submit_mutation" &&
          event.event === "stage_failed" &&
          event.errorStage === "verify_director_visibility",
      ),
    ).toBe(true);
  });

  it("rejects duplicate submit instead of publishing a second terminal success", async () => {
    const { deps, alert } = baseSubmitDeps();
    deps.sendingRef.current = true;

    const result = await handleCreateProposalsBySupplierAction(deps);

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("guard_duplicate_submit");
    expect(deps.apiCreateProposalsBySupplier).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it("does not publish final success when authoritative submit readback is stale", async () => {
    const { deps, alert } = baseSubmitDeps();
    const staleReadback = buildSubmitReadbackSupabase({
      data: [
        {
          id: "proposal-1",
          status: "draft",
          submitted_at: null,
          sent_to_accountant_at: null,
        },
      ],
      error: null,
    });
    deps.supabase = staleReadback.supabase;

    const result = await handleCreateProposalsBySupplierAction(deps);

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("verify_director_visibility");
    expect(mockedUploadSupplierProposalAttachmentsMutation).not.toHaveBeenCalled();
    expect(mockedSyncSubmittedRequestItemsStatusMutation).not.toHaveBeenCalled();
    expect(deps.removeFromInboxLocally).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalled();
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "proposal_submit_terminal_failure",
      ),
    ).toBe(true);
  });

  it("keeps retryable submit failures out of final success classes", async () => {
    const { deps, alert } = baseSubmitDeps();
    deps.apiCreateProposalsBySupplier = jest.fn(async () => {
      throw { status: 503, message: "temporary network outage" };
    });

    const result = await handleCreateProposalsBySupplierAction(deps);

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("create_proposals");
    expect(
      classifyProposalActionFailure((result.error as Error & { causeError?: unknown }).causeError),
    ).toBe("retryable_failure");
    expect(mockedUploadSupplierProposalAttachmentsMutation).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalled();
  });

  it("publishes partial success when post-submit status sync degrades", async () => {
    const { deps, alert } = baseSubmitDeps();
    mockedSyncSubmittedRequestItemsStatusMutation.mockResolvedValue({
      ok: true,
      family: "status",
      operation: "sync_submit_request_items",
      status: "partial_success",
      completedStages: [
        "set_request_items_director_status",
        "clear_request_item_reject_state",
      ],
      warnings: [
        {
          stage: "set_request_items_director_status",
          message: "fallback used",
          degraded: true,
        },
      ],
      data: { affectedIds: ["ri-1"] },
    });

    const result = await handleCreateProposalsBySupplierAction(deps);

    expect(result.ok).toBe(true);
    if (isBuyerMutationFailure(result)) return;
    expect(result.status).toBe("partial_success");
    expect(result.warnings).toEqual([
      expect.objectContaining({
        stage: "sync_request_items_status",
        degraded: true,
      }),
    ]);
    expect(alert).toHaveBeenCalledWith(
      expect.stringContaining("Отправлено с предупреждением"),
      expect.stringContaining("Синхронизация request_items после submit"),
    );
  });

  it("does not start attachment continuation when canonical proposal commit fails", async () => {
    const { deps, alert } = baseSubmitDeps();
    deps.apiCreateProposalsBySupplier = jest.fn(async () => {
      throw new Error("proposal_submit_v3_invalid_price");
    });

    const result = await handleCreateProposalsBySupplierAction(deps);

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("create_proposals");
    expect(mockedUploadSupplierProposalAttachmentsMutation).not.toHaveBeenCalled();
    expect(mockedSyncSubmittedRequestItemsStatusMutation).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalled();
  });
});
