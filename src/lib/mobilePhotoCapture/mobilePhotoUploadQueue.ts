import {
  createDefaultOfflineStorage,
  readJsonFromStorage,
  writeJsonToStorage,
  type OfflineStorageAdapter,
} from "../offline/offlineStorage";

const QUEUE_KEY = "mobile_photo_capture:upload_queue:v1";

export type MobilePhotoQueuedUpload = {
  captureId: string;
  scanId: string;
  localUri: string;
  mimeType: "image/jpeg" | "image/png";
  byteSize: number;
  contentSha256: string;
  idempotencyKey: string;
  attempts: number;
  status: "queued" | "uploading" | "uploaded" | "failed";
  createdAt: string;
  updatedAt?: string;
};

export type MobilePhotoUploadQueue = {
  enqueue: (item: MobilePhotoQueuedUpload) => Promise<void>;
  listPending: () => Promise<MobilePhotoQueuedUpload[]>;
  markUploading: (idempotencyKey: string) => Promise<void>;
  markUploaded: (idempotencyKey: string) => Promise<void>;
  markFailed: (idempotencyKey: string) => Promise<void>;
  removeByCaptureId: (captureId: string) => Promise<void>;
};

async function readQueue(storage: OfflineStorageAdapter): Promise<MobilePhotoQueuedUpload[]> {
  return (await readJsonFromStorage<MobilePhotoQueuedUpload[]>(storage, QUEUE_KEY)) ?? [];
}

async function writeQueue(storage: OfflineStorageAdapter, items: MobilePhotoQueuedUpload[]): Promise<void> {
  await writeJsonToStorage(storage, QUEUE_KEY, items);
}

export function createMobilePhotoUploadQueue(
  storage: OfflineStorageAdapter = createDefaultOfflineStorage(),
): MobilePhotoUploadQueue {
  return {
    async enqueue(item) {
      const items = await readQueue(storage);
      const duplicate = items.find((candidate) => candidate.idempotencyKey === item.idempotencyKey);
      if (duplicate) return;
      await writeQueue(storage, [...items, item]);
    },
    async listPending() {
      return (await readQueue(storage)).filter((item) => item.status === "queued" || item.status === "failed");
    },
    async markUploading(idempotencyKey) {
      const now = new Date().toISOString();
      await writeQueue(storage, (await readQueue(storage)).map((item) =>
        item.idempotencyKey === idempotencyKey
          ? { ...item, status: "uploading", attempts: item.attempts + 1, updatedAt: now }
          : item,
      ));
    },
    async markUploaded(idempotencyKey) {
      const now = new Date().toISOString();
      await writeQueue(storage, (await readQueue(storage)).map((item) =>
        item.idempotencyKey === idempotencyKey
          ? { ...item, status: "uploaded", updatedAt: now }
          : item,
      ));
    },
    async markFailed(idempotencyKey) {
      const now = new Date().toISOString();
      await writeQueue(storage, (await readQueue(storage)).map((item) =>
        item.idempotencyKey === idempotencyKey
          ? { ...item, status: "failed", updatedAt: now }
          : item,
      ));
    },
    async removeByCaptureId(captureId) {
      await writeQueue(storage, (await readQueue(storage)).filter((item) => item.captureId !== captureId));
    },
  };
}
