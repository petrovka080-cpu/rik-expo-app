import {
  getMediaSignedReadUrl,
  type MediaBackendOperation,
  type MediaBackendTransport,
} from "../../../src/lib/media/services/mediaBackendUploadService";

describe("backend media signed read URL contract", () => {
  it("resolves short-lived read URLs without exposing storage keys to UI payloads", async () => {
    const transport: MediaBackendTransport = {
      async call<TResult>(
        operation: MediaBackendOperation,
        _payload: Record<string, unknown>,
      ): Promise<TResult> {
        expect(operation).toBe("getMediaSignedReadUrl");
        return {
          readUrl: "https://storage.example/read",
          expiresAt: "2026-05-21T12:30:00.000Z",
          storageKeyVisibleToUser: false,
        } as TResult;
      },
    };

    await expect(
      getMediaSignedReadUrl(transport, {
        mediaAssetId: "media-1",
        role: "director",
        userId: "user-1",
        orgId: "org-1",
      }),
    ).resolves.toMatchObject({
      readUrl: expect.stringContaining("https://"),
      storageKeyVisibleToUser: false,
    });
  });
});
