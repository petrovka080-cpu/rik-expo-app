import {
  createMediaUploadSession,
  type MediaBackendOperation,
  type MediaBackendTransport,
} from "../../../src/lib/media/services/mediaBackendUploadService";

describe("backend media upload session contract", () => {
  it("creates upload sessions through the backend transport only", async () => {
    const calls: Array<{ operation: string; payload: Record<string, unknown> }> = [];
    const transport: MediaBackendTransport = {
      async call<TResult>(
        operation: MediaBackendOperation,
        payload: Record<string, unknown>,
      ): Promise<TResult> {
        calls.push({ operation, payload });
        return {
          uploadSessionId: "session-1",
          storageBucket: "private-media",
          uploadUrl: "https://storage.example/upload",
          expiresAt: "2026-05-21T12:30:00.000Z",
        } as TResult;
      },
    };

    const result = await createMediaUploadSession(transport, {
      orgId: "org-1",
      requestedByUserId: "user-1",
      requestedByRole: "foreman",
      targetType: "request_draft",
      targetId: "draft-1",
      mediaKind: "photo",
      purpose: "work_evidence",
      expectedMimeType: "image/jpeg",
      expectedByteSizeMax: 5_242_880,
    });

    expect(result.storageBucket).toBe("private-media");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.operation).toBe("createMediaUploadSession");
    expect(calls[0]?.payload).toMatchObject({
      targetType: "request_draft",
      mediaKind: "photo",
      purpose: "work_evidence",
    });
  });
});
