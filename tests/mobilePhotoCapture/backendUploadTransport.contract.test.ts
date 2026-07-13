import type { MobilePhotoQueuedUpload } from "../../src/lib/mobilePhotoCapture/mobilePhotoUploadQueue";
import {
  createMobilePhotoUploadService,
  type MobilePhotoUploadIntent,
} from "../../src/lib/mobilePhotoCapture/mobilePhotoUploadService";

const queuedItem: MobilePhotoQueuedUpload = {
  captureId: "capture-1",
  scanId: "photo_material_scan:estimate-1:row-1:2026-06-29T00:00:00.000Z",
  localUri: "file:///private/mobile-photo-staging/capture-1.jpg",
  mimeType: "image/jpeg",
  byteSize: 1234,
  contentSha256: "b".repeat(64),
  idempotencyKey: "scan:capture-1:hash",
  attempts: 0,
  status: "queued",
  createdAt: "2026-06-29T00:00:00.000Z",
};

const activePrivateIntent: MobilePhotoUploadIntent = {
  uploadToken: "11111111-1111-4111-8111-111111111111",
  uploadUrl: "private-media-upload-session",
  storageBucket: "private-media",
  storageKey: "user/session/original",
  expiresAt: "2999-01-01T00:00:00.000Z",
};

describe("mobile photo backend upload transport", () => {
  it("creates intent, uploads private media, then completes backend row before recognition can start", async () => {
    const calls: string[] = [];
    const service = createMobilePhotoUploadService({
      async createUploadIntent(item) {
        calls.push(`intent:${item.scanId}`);
        return activePrivateIntent;
      },
      async uploadFile({ intent }) {
        calls.push(`upload:${intent.storageBucket}`);
        expect(intent.storageBucket).toBe("private-media");
        return { uploaded: true };
      },
      async completeUpload({ intent }) {
        calls.push(`complete:${intent.uploadToken}`);
        return {
          scanImageId: "22222222-2222-4222-8222-222222222222",
          recognitionJobStarted: true,
        };
      },
    });

    const result = await service.uploadQueuedItem(queuedItem);

    expect(result).toEqual({
      scanImageId: "22222222-2222-4222-8222-222222222222",
      recognitionJobStarted: true,
    });
    expect(calls).toEqual([
      `intent:${queuedItem.scanId}`,
      "upload:private-media",
      `complete:${activePrivateIntent.uploadToken}`,
    ]);
  });

  it("fails closed and does not upload when the backend intent is already expired", async () => {
    const calls: string[] = [];
    const service = createMobilePhotoUploadService({
      async createUploadIntent() {
        calls.push("intent");
        return {
          ...activePrivateIntent,
          expiresAt: "2000-01-01T00:00:00.000Z",
        };
      },
      async uploadFile() {
        calls.push("upload");
        return { uploaded: true };
      },
      async completeUpload() {
        calls.push("complete");
        return {
          scanImageId: "22222222-2222-4222-8222-222222222222",
          recognitionJobStarted: true,
        };
      },
    });

    await expect(service.uploadQueuedItem(queuedItem)).rejects.toMatchObject({
      code: "PHOTO_UPLOAD_INTENT_EXPIRED",
    });
    expect(calls).toEqual(["intent"]);
  });
});
