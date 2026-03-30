import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import type { CreateProposalsResult } from "../../lib/catalog_api";

jest.mock("./buyer.attachments.mutation", () => ({
  uploadSupplierProposalAttachmentsMutation: jest.fn(),
}));

jest.mock("./buyer.status.mutation", () => ({
  syncSubmittedRequestItemsStatusMutation: jest.fn(),
}));

import { uploadSupplierProposalAttachmentsMutation } from "./buyer.attachments.mutation";
import { syncSubmittedRequestItemsStatusMutation } from "./buyer.status.mutation";
import { isBuyerMutationFailure } from "./buyer.mutation.shared";
import { handleCreateProposalsBySupplierAction } from "./buyer.submit.mutation";

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

const baseSubmitDeps = () => {
  const alert = jest.fn();
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
      supabase: {} as never,
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
    const { deps, alert } = baseSubmitDeps();

    const result = await handleCreateProposalsBySupplierAction(deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("success");
    expect(result.data).toEqual({
      mode: "sync",
      createdProposalIds: ["proposal-1"],
      affectedRequestItemIds: ["ri-1"],
    });
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
