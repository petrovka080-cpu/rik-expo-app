import * as FileSystem from "expo-file-system/legacy";

import { getFileSystemPaths } from "../fileSystemPaths";
import {
  createDefaultOfflineStorage,
  readJsonFromStorage,
  writeJsonToStorage,
  type OfflineStorageAdapter,
} from "../offline/offlineStorage";
import type { CapturedPhotoAsset, PhotoCaptureKind, PhotoCaptureSource } from "./mobilePhotoCaptureService";
import { createMobilePhotoCaptureError } from "./mobilePhotoCaptureErrors";

const RECORDS_KEY = "mobile_photo_capture:records:v1";
const STAGING_DIR = "mobile-photo-staging";

export type MobilePhotoLocalRecord = CapturedPhotoAsset & {
  attachedToScan: boolean;
  uploaded: boolean;
  deleted: boolean;
};

export type MobilePhotoStageInput = {
  captureId: string;
  scanId: string;
  source: PhotoCaptureSource;
  kind: PhotoCaptureKind;
  normalizedUri: string;
  mimeType: "image/jpeg" | "image/png";
  width: number;
  height: number;
  byteSize: number;
  contentSha256: string;
  orientationNormalized: boolean;
  metadataStripped: boolean;
  createdAt: string;
};

export type MobilePhotoLocalRepository = {
  stage: (input: MobilePhotoStageInput) => Promise<CapturedPhotoAsset>;
  markAttached: (captureId: string) => Promise<void>;
  markUploaded: (captureId: string) => Promise<void>;
  listRecords: () => Promise<MobilePhotoLocalRecord[]>;
  discard: (captureId: string) => Promise<void>;
};

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._:-]/g, "_");
}

function stagingUri(scanId: string, captureId: string): string {
  const paths = getFileSystemPaths();
  return `${paths.documentDir}${STAGING_DIR}/${sanitizeSegment(scanId)}/${sanitizeSegment(captureId)}.jpg`;
}

async function ensureParentDir(uri: string): Promise<void> {
  const parent = uri.slice(0, uri.lastIndexOf("/") + 1);
  await FileSystem.makeDirectoryAsync(parent, { intermediates: true });
}

async function readRecords(storage: OfflineStorageAdapter): Promise<MobilePhotoLocalRecord[]> {
  return (await readJsonFromStorage<MobilePhotoLocalRecord[]>(storage, RECORDS_KEY)) ?? [];
}

async function writeRecords(storage: OfflineStorageAdapter, records: MobilePhotoLocalRecord[]): Promise<void> {
  await writeJsonToStorage(storage, RECORDS_KEY, records);
}

export function createMobilePhotoLocalRepository(
  storage: OfflineStorageAdapter = createDefaultOfflineStorage(),
): MobilePhotoLocalRepository {
  return {
    async stage(input) {
      const targetUri = stagingUri(input.scanId, input.captureId);
      try {
        await ensureParentDir(targetUri);
        await FileSystem.copyAsync({ from: input.normalizedUri, to: targetUri });
        const info = await FileSystem.getInfoAsync(targetUri);
        if (!info.exists) throw createMobilePhotoCaptureError("PHOTO_LOCAL_COPY_FAILED");
      } catch (error) {
        if (error instanceof Error && error.name === "MobilePhotoCaptureError") throw error;
        throw createMobilePhotoCaptureError("PHOTO_LOCAL_COPY_FAILED", error);
      }
      const asset: CapturedPhotoAsset = {
        captureId: input.captureId,
        scanId: input.scanId,
        source: input.source,
        kind: input.kind,
        localUri: targetUri,
        mimeType: input.mimeType,
        width: input.width,
        height: input.height,
        byteSize: input.byteSize,
        contentSha256: input.contentSha256,
        orientationNormalized: input.orientationNormalized,
        metadataStripped: input.metadataStripped,
        createdAt: input.createdAt,
      };
      const records = await readRecords(storage);
      const next = records.filter((record) => record.captureId !== input.captureId);
      next.push({
        ...asset,
        attachedToScan: false,
        uploaded: false,
        deleted: false,
      });
      await writeRecords(storage, next);
      return asset;
    },
    async markAttached(captureId) {
      const records = await readRecords(storage);
      await writeRecords(storage, records.map((record) =>
        record.captureId === captureId ? { ...record, attachedToScan: true } : record,
      ));
    },
    async markUploaded(captureId) {
      const records = await readRecords(storage);
      await writeRecords(storage, records.map((record) =>
        record.captureId === captureId ? { ...record, uploaded: true } : record,
      ));
    },
    async listRecords() {
      return readRecords(storage);
    },
    async discard(captureId) {
      const records = await readRecords(storage);
      const record = records.find((candidate) => candidate.captureId === captureId);
      if (record?.localUri) {
        await FileSystem.deleteAsync(record.localUri, { idempotent: true });
      }
      await writeRecords(storage, records.map((candidate) =>
        candidate.captureId === captureId ? { ...candidate, deleted: true } : candidate,
      ));
    },
  };
}
