import type { MobilePhotoLocalRepository } from "./mobilePhotoLocalRepository";
import type { MobilePhotoUploadQueue } from "./mobilePhotoUploadQueue";

export type MobilePhotoCleanupService = {
  discardCapture: (captureId: string) => Promise<void>;
  cleanupUploadedOrDeleted: () => Promise<{ deletedRecords: number; rawPhotosPromoted: 0 }>;
};

export function createMobilePhotoCleanupService(input: {
  repository: MobilePhotoLocalRepository;
  uploadQueue: MobilePhotoUploadQueue;
}): MobilePhotoCleanupService {
  return {
    async discardCapture(captureId) {
      await input.uploadQueue.removeByCaptureId(captureId);
      await input.repository.discard(captureId);
    },
    async cleanupUploadedOrDeleted() {
      const records = await input.repository.listRecords();
      const deletable = records.filter((record) => record.uploaded || record.deleted);
      for (const record of deletable) {
        await input.repository.discard(record.captureId);
      }
      return {
        deletedRecords: deletable.length,
        rawPhotosPromoted: 0,
      };
    },
  };
}
