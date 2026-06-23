import type { MobilePhotoQueuedUpload } from "./mobilePhotoUploadQueue";
import { createMobilePhotoCaptureError } from "./mobilePhotoCaptureErrors";

export type MobilePhotoUploadIntent = {
  uploadToken: string;
  uploadUrl: string;
  expiresAt: string;
};

export type MobilePhotoUploadTransport = {
  createUploadIntent: (item: MobilePhotoQueuedUpload) => Promise<MobilePhotoUploadIntent>;
  uploadFile: (input: {
    item: MobilePhotoQueuedUpload;
    intent: MobilePhotoUploadIntent;
  }) => Promise<{ uploaded: true }>;
  completeUpload: (input: {
    item: MobilePhotoQueuedUpload;
    intent: MobilePhotoUploadIntent;
  }) => Promise<{ scanImageId: string; recognitionJobStarted: true }>;
};

export type MobilePhotoUploadService = {
  uploadQueuedItem: (item: MobilePhotoQueuedUpload) => Promise<{ scanImageId: string; recognitionJobStarted: true }>;
};

const missingTransport: MobilePhotoUploadTransport = {
  async createUploadIntent() {
    throw createMobilePhotoCaptureError("PHOTO_UPLOAD_INTENT_FAILED");
  },
  async uploadFile() {
    throw createMobilePhotoCaptureError("PHOTO_UPLOAD_NETWORK_UNAVAILABLE");
  },
  async completeUpload() {
    throw createMobilePhotoCaptureError("PHOTO_UPLOAD_INTENT_FAILED");
  },
};

export function createMobilePhotoUploadService(
  transport: MobilePhotoUploadTransport = missingTransport,
): MobilePhotoUploadService {
  return {
    async uploadQueuedItem(item) {
      const intent = await transport.createUploadIntent(item);
      if (new Date(intent.expiresAt).getTime() <= Date.now()) {
        throw createMobilePhotoCaptureError("PHOTO_UPLOAD_INTENT_EXPIRED");
      }
      await transport.uploadFile({ item, intent });
      return transport.completeUpload({ item, intent });
    },
  };
}
