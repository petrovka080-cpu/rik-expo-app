import {
  attachDraftMediaToRequest,
  confirmMediaLink,
  type MediaBackendOperation,
  type MediaBackendTransport,
} from "../../../src/lib/media/services/mediaBackendUploadService";

describe("backend media draft attachment contract", () => {
  it("carries request draft media to the procurement request through backend links", async () => {
    const operations: string[] = [];
    const transport: MediaBackendTransport = {
      async call<TResult>(
        operation: MediaBackendOperation,
        _payload: Record<string, unknown>,
      ): Promise<TResult> {
        operations.push(operation);
        if (operation === "attachDraftMediaToRequest") {
          return { attachedCount: 2, clientVisible: false } as TResult;
        }
        return { mediaLinkId: "link-1", finalLinkedByHuman: true } as TResult;
      },
    };

    const attached = await attachDraftMediaToRequest(transport, {
      orgId: "org-1",
      requestDraftId: "draft-124",
      procurementRequestId: "124",
      actorUserId: "foreman-1",
    });

    const confirmed = await confirmMediaLink(transport, {
      mediaAssetId: "media-1",
      targetType: "procurement_request",
      targetId: "124",
      role: "foreman",
      userId: "foreman-1",
      orgId: "org-1",
    });

    expect(attached).toEqual({ attachedCount: 2, clientVisible: false });
    expect(confirmed.finalLinkedByHuman).toBe(true);
    expect(operations).toEqual(["attachDraftMediaToRequest", "confirmMediaLink"]);
  });
});
