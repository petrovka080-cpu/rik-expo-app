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
import {
  mobilePhotoBase64Bytes,
  mobilePhotoSha256Hex,
  mobilePhotoUtf8Bytes,
} from "./mobilePhotoNormalizationService";

const RECORDS_KEY = "mobile_photo_capture:records:v1";
const MOBILE_PHOTO_STORAGE_VERSION = "v2" as const;

export type MobilePhotoStorageIdentity = {
  tenantId: string;
  requestId: string;
  revisionId: string;
  rowId: string;
};

type MobilePhotoStorageKeyInput = MobilePhotoStorageIdentity & {
  captureId: string;
  mimeType: "image/jpeg" | "image/png";
};

function requiredStorageIdentityField(
  value: string,
  field: keyof MobilePhotoStorageKeyInput,
): string {
  const normalized = String(value ?? "").normalize("NFC").trim();
  if (!normalized) throw new Error(`MOBILE_PHOTO_STORAGE_IDENTITY_MISSING:${field}`);
  return normalized;
}

function mobilePhotoStorageIdentitySha256(
  input: Omit<MobilePhotoStorageKeyInput, "mimeType">,
): string {
  const fields = [
    requiredStorageIdentityField(input.tenantId, "tenantId"),
    requiredStorageIdentityField(input.requestId, "requestId"),
    requiredStorageIdentityField(input.revisionId, "revisionId"),
    requiredStorageIdentityField(input.rowId, "rowId"),
    requiredStorageIdentityField(input.captureId, "captureId"),
  ];
  const canonical = fields.map((field) => `${mobilePhotoUtf8Bytes(field).length}:${field}`).join("|");
  return mobilePhotoSha256Hex(mobilePhotoUtf8Bytes(canonical));
}

function mobilePhotoExtensionForMime(
  mimeType: MobilePhotoStorageKeyInput["mimeType"],
): "jpg" | "png" {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  throw new Error("MOBILE_PHOTO_STORAGE_MIME_NOT_ALLOWED");
}

export function mobilePhotoStagingRelativePath(input: MobilePhotoStorageKeyInput): string {
  const digest = mobilePhotoStorageIdentitySha256(input);
  const extension = mobilePhotoExtensionForMime(input.mimeType);
  return `mobile-photo-staging/${MOBILE_PHOTO_STORAGE_VERSION}/${digest.slice(0, 2)}/${digest}.${extension}`;
}

function mobilePhotoLegacyMigrationRelativePath(input: {
  scanId: string;
  captureId: string;
  contentSha256: string;
  mimeType: MobilePhotoStorageKeyInput["mimeType"];
}): string {
  const canonical = [input.scanId, input.captureId, input.contentSha256]
    .map((field) => String(field ?? "").normalize("NFC"))
    .map((field) => `${mobilePhotoUtf8Bytes(field).length}:${field}`)
    .join("|");
  const digest = mobilePhotoSha256Hex(mobilePhotoUtf8Bytes(`legacy-v1|${canonical}`));
  return `mobile-photo-staging/${MOBILE_PHOTO_STORAGE_VERSION}/legacy/${digest}.${mobilePhotoExtensionForMime(input.mimeType)}`;
}

export type MobilePhotoLocalRecord = CapturedPhotoAsset & {
  attachedToScan: boolean;
  uploaded: boolean;
  deleted: boolean;
  storageIdentity?: MobilePhotoStorageIdentity;
  storageVersion?: "v2";
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
  storageIdentity?: MobilePhotoStorageIdentity;
};

export type MobilePhotoLocalRepository = {
  stage: (input: MobilePhotoStageInput) => Promise<CapturedPhotoAsset>;
  markAttached: (captureId: string) => Promise<void>;
  markUploaded: (captureId: string) => Promise<void>;
  listRecords: () => Promise<MobilePhotoLocalRecord[]>;
  discard: (captureId: string) => Promise<void>;
};

type LocalFileInfo = { exists: boolean; size?: number };

export type MobilePhotoLocalFileSystem = {
  makeDirectoryAsync: (uri: string, options: { intermediates: boolean }) => Promise<void>;
  copyAsync: (options: { from: string; to: string }) => Promise<void>;
  moveAsync: (options: { from: string; to: string }) => Promise<void>;
  deleteAsync: (uri: string, options: { idempotent: boolean }) => Promise<void>;
  getInfoAsync: (uri: string) => Promise<LocalFileInfo>;
  readAsStringAsync: (uri: string, options: { encoding: "base64" }) => Promise<string>;
};

type VerifiedPhoto = {
  byteSize: number;
  contentSha256: string;
  mimeType: "image/jpeg" | "image/png";
};

let partialSequence = 0;

function fallbackStorageIdentity(input: Pick<MobilePhotoStageInput, "scanId">): MobilePhotoStorageIdentity {
  return {
    tenantId: `unscoped:${input.scanId}`,
    requestId: input.scanId,
    revisionId: input.scanId,
    rowId: input.scanId,
  };
}

function stagingUri(input: MobilePhotoStageInput, documentDir: string): string {
  const storageIdentity = input.storageIdentity ?? fallbackStorageIdentity(input);
  return `${documentDir}${mobilePhotoStagingRelativePath({
    ...storageIdentity,
    captureId: input.captureId,
    mimeType: input.mimeType,
  })}`;
}

function partialUri(targetUri: string): string {
  partialSequence += 1;
  return `${targetUri}.partial-${Date.now()}-${partialSequence}`;
}

async function ensureParentDir(uri: string, fileSystem: MobilePhotoLocalFileSystem): Promise<void> {
  const parent = uri.slice(0, uri.lastIndexOf("/") + 1);
  await fileSystem.makeDirectoryAsync(parent, { intermediates: true });
}

function sniffMime(bytes: Uint8Array): "image/jpeg" | "image/png" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  return null;
}

async function verifyPhoto(
  uri: string,
  expected: Pick<MobilePhotoStageInput, "byteSize" | "contentSha256" | "mimeType">,
  fileSystem: MobilePhotoLocalFileSystem,
): Promise<VerifiedPhoto> {
  const info = await fileSystem.getInfoAsync(uri);
  if (!info.exists) throw createMobilePhotoCaptureError("PHOTO_LOCAL_FILE_MISSING");
  const base64 = await fileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });
  const bytes = mobilePhotoBase64Bytes(base64);
  const byteSize = Number(info.size ?? bytes.length);
  const contentSha256 = mobilePhotoSha256Hex(bytes);
  const mimeType = sniffMime(bytes);
  if (bytes.length < 1 || byteSize !== bytes.length || byteSize !== expected.byteSize) {
    throw createMobilePhotoCaptureError("PHOTO_LOCAL_SIZE_MISMATCH");
  }
  if (contentSha256 !== expected.contentSha256.toLowerCase()) {
    throw createMobilePhotoCaptureError("PHOTO_LOCAL_HASH_MISMATCH");
  }
  if (mimeType !== expected.mimeType) {
    throw createMobilePhotoCaptureError("PHOTO_LOCAL_MIME_MISMATCH");
  }
  return { byteSize, contentSha256, mimeType };
}

async function safeDelete(uri: string, fileSystem: MobilePhotoLocalFileSystem): Promise<void> {
  await fileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}

function encodedLegacyFileUri(uri: string): string | null {
  if (!uri.startsWith("file://")) return null;
  const path = uri.slice("file://".length);
  return `file://${path.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
}

async function readRecords(storage: OfflineStorageAdapter): Promise<MobilePhotoLocalRecord[]> {
  return (await readJsonFromStorage<MobilePhotoLocalRecord[]>(storage, RECORDS_KEY)) ?? [];
}

async function writeRecords(storage: OfflineStorageAdapter, records: MobilePhotoLocalRecord[]): Promise<void> {
  await writeJsonToStorage(storage, RECORDS_KEY, records);
}

export function createMobilePhotoLocalRepository(
  storage: OfflineStorageAdapter = createDefaultOfflineStorage(),
  fileSystem: MobilePhotoLocalFileSystem = FileSystem,
  documentDir: string = getFileSystemPaths().documentDir,
): MobilePhotoLocalRepository {
  return {
    async stage(input) {
      if (!/^[a-f0-9]{64}$/u.test(input.contentSha256) || input.byteSize < 1) {
        throw createMobilePhotoCaptureError("PHOTO_LOCAL_INTEGRITY_INVALID");
      }
      const targetUri = stagingUri(input, documentDir);
      const tempUri = partialUri(targetUri);
      let createdFinal = false;
      try {
        const existingBeforeCopy = await fileSystem.getInfoAsync(targetUri);
        if (existingBeforeCopy.exists) {
          try {
            await verifyPhoto(targetUri, input, fileSystem);
          } catch (error) {
            throw createMobilePhotoCaptureError("PHOTO_LOCAL_COLLISION", error);
          }
          await safeDelete(tempUri, fileSystem);
        } else {
          await verifyPhoto(input.normalizedUri, input, fileSystem);
          await ensureParentDir(targetUri, fileSystem);
          await safeDelete(tempUri, fileSystem);
          await fileSystem.copyAsync({ from: input.normalizedUri, to: tempUri });
          await verifyPhoto(tempUri, input, fileSystem);
          try {
            await fileSystem.moveAsync({ from: tempUri, to: targetUri });
            createdFinal = true;
          } catch (moveError) {
            const racedTarget = await fileSystem.getInfoAsync(targetUri);
            if (!racedTarget.exists) throw moveError;
            await verifyPhoto(targetUri, input, fileSystem);
            await safeDelete(tempUri, fileSystem);
          }
          await verifyPhoto(targetUri, input, fileSystem);
        }
      } catch (error) {
        await safeDelete(tempUri, fileSystem);
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
        localStorageKey: targetUri.startsWith(documentDir) ? targetUri.slice(documentDir.length) : undefined,
        storageIdentity: input.storageIdentity ?? fallbackStorageIdentity(input),
      };
      const records = await readRecords(storage);
      const next = records.filter((record) => record.captureId !== input.captureId);
      next.push({
        ...asset,
        attachedToScan: false,
        uploaded: false,
        deleted: false,
        storageIdentity: input.storageIdentity ?? fallbackStorageIdentity(input),
        storageVersion: "v2",
      });
      try {
        await writeRecords(storage, next);
      } catch (error) {
        if (createdFinal) await safeDelete(targetUri, fileSystem);
        throw createMobilePhotoCaptureError("PHOTO_LOCAL_RECORD_WRITE_FAILED", error);
      }
      if (input.normalizedUri !== targetUri) {
        await safeDelete(input.normalizedUri, fileSystem);
      }
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
      const records = await readRecords(storage);
      let changed = false;
      const migrated: MobilePhotoLocalRecord[] = [];
      for (const record of records) {
        if (record.deleted || record.storageVersion === "v2") {
          migrated.push(record);
          continue;
        }
        const targetUri = `${documentDir}${mobilePhotoLegacyMigrationRelativePath(record)}`;
        const tempUri = partialUri(targetUri);
        const sourceCandidates = [record.localUri, encodedLegacyFileUri(record.localUri)]
          .filter((value): value is string => Boolean(value));
        let sourceUri: string | null = null;
        for (const candidate of sourceCandidates) {
          try {
            await verifyPhoto(candidate, record, fileSystem);
            sourceUri = candidate;
            break;
          } catch {
            // Try the URI-encoded compatibility form before leaving the legacy record untouched.
          }
        }
        if (!sourceUri) {
          migrated.push(record);
          continue;
        }
        try {
          await ensureParentDir(targetUri, fileSystem);
          const existing = await fileSystem.getInfoAsync(targetUri);
          if (!existing.exists) {
            await fileSystem.copyAsync({ from: sourceUri, to: tempUri });
            await verifyPhoto(tempUri, record, fileSystem);
            await fileSystem.moveAsync({ from: tempUri, to: targetUri });
          }
          await verifyPhoto(targetUri, record, fileSystem);
          migrated.push({ ...record, localUri: targetUri, storageVersion: "v2" });
          changed = true;
        } catch {
          await safeDelete(tempUri, fileSystem);
          migrated.push(record);
        }
      }
      if (changed) await writeRecords(storage, migrated);
      return migrated;
    },
    async discard(captureId) {
      const records = await readRecords(storage);
      const record = records.find((candidate) => candidate.captureId === captureId);
      if (record?.localUri) {
        await safeDelete(record.localUri, fileSystem);
      }
      await writeRecords(storage, records.map((candidate) =>
        candidate.captureId === captureId ? { ...candidate, deleted: true } : candidate,
      ));
    },
  };
}
