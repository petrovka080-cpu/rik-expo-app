import fs from "node:fs";
import path from "node:path";

import {
  createMobilePhotoCaptureService,
  type CapturedPhotoAsset,
  type MobilePhotoCaptureService,
  type MobilePhotoCaptureServiceDeps,
} from "../../src/lib/mobilePhotoCapture/mobilePhotoCaptureService";
import type { MobilePhotoLocalRepository } from "../../src/lib/mobilePhotoCapture/mobilePhotoLocalRepository";
import type { MobilePhotoQueuedUpload, MobilePhotoUploadQueue } from "../../src/lib/mobilePhotoCapture/mobilePhotoUploadQueue";
import type { MobilePhotoUploadService } from "../../src/lib/mobilePhotoCapture/mobilePhotoUploadService";

export function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

export function readAppJson(): {
  expo: {
    plugins?: unknown[];
    android?: { permissions?: string[]; blockedPermissions?: string[] };
    ios?: { infoPlist?: Record<string, unknown> };
  };
} {
  return JSON.parse(readSource("app.json"));
}

export function readPackageJson(): { dependencies?: Record<string, string> } {
  return JSON.parse(readSource("package.json"));
}

export function readMobilePhotoSource(): string {
  const roots = [
    "src/lib/mobilePhotoCapture",
    "src/components/photoCapture",
    "src/features/consumerRepair",
  ];
  const files: string[] = [];
  const visit = (relativeDir: string) => {
    for (const entry of fs.readdirSync(path.join(process.cwd(), relativeDir), { withFileTypes: true })) {
      const relativePath = `${relativeDir}/${entry.name}`;
      if (entry.isDirectory()) visit(relativePath);
      if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) files.push(relativePath);
    }
  };
  roots.forEach(visit);
  return files.map((file) => readSource(file)).join("\n");
}

export function pluginEntry(name: string): unknown {
  return readAppJson().expo.plugins?.find((entry) =>
    entry === name || (Array.isArray(entry) && entry[0] === name),
  );
}

export type MobilePhotoHarness = {
  service: MobilePhotoCaptureService;
  staged: CapturedPhotoAsset[];
  attached: string[];
  queue: MobilePhotoQueuedUpload[];
  uploaded: MobilePhotoQueuedUpload[];
};

export function createMobilePhotoHarness(overrides: Partial<MobilePhotoCaptureServiceDeps> = {}): MobilePhotoHarness {
  const staged: CapturedPhotoAsset[] = [];
  const attached: string[] = [];
  const queue: MobilePhotoQueuedUpload[] = [];
  const uploaded: MobilePhotoQueuedUpload[] = [];

  const repository: MobilePhotoLocalRepository = {
    async stage(input) {
      const asset: CapturedPhotoAsset = {
        captureId: input.captureId,
        scanId: input.scanId,
        source: input.source,
        kind: input.kind,
        localUri: `file:///private/mobile-photo-staging/${input.captureId}.jpg`,
        mimeType: input.mimeType,
        width: input.width,
        height: input.height,
        byteSize: input.byteSize,
        contentSha256: input.contentSha256,
        orientationNormalized: input.orientationNormalized,
        metadataStripped: input.metadataStripped,
        createdAt: input.createdAt,
      };
      staged.push(asset);
      return asset;
    },
    async markAttached(captureId) {
      attached.push(captureId);
    },
    async markUploaded() {},
    async listRecords() {
      return staged.map((asset) => ({
        ...asset,
        attachedToScan: attached.includes(asset.captureId),
        uploaded: uploaded.some((item) => item.captureId === asset.captureId),
        deleted: false,
      }));
    },
    async discard(captureId) {
      const index = staged.findIndex((item) => item.captureId === captureId);
      if (index >= 0) staged.splice(index, 1);
    },
  };

  const uploadQueue: MobilePhotoUploadQueue = {
    async enqueue(item) {
      if (!queue.some((queued) => queued.idempotencyKey === item.idempotencyKey)) queue.push(item);
    },
    async listPending() {
      return queue.filter((item) => item.status !== "uploaded");
    },
    async markUploading() {},
    async markUploaded(idempotencyKey) {
      const item = queue.find((candidate) => candidate.idempotencyKey === idempotencyKey);
      if (item) item.status = "uploaded";
    },
    async markFailed() {},
    async removeByCaptureId(captureId) {
      const index = queue.findIndex((item) => item.captureId === captureId);
      if (index >= 0) queue.splice(index, 1);
    },
  };

  const uploader: MobilePhotoUploadService = {
    async uploadQueuedItem(item) {
      uploaded.push(item);
      return {
        scanImageId: `scan-image:${item.captureId}`,
        recognitionJobStarted: true,
      };
    },
  };

  const service = createMobilePhotoCaptureService({
    capability: {
      async checkCapability() {
        return {
          nativeModuleResolved: true,
          cameraHardwareAvailable: true,
          permissionApiAvailable: true,
          cameraViewComponentAvailable: true,
        };
      },
    },
    permissions: {
      async getCameraPermission() {
        return { state: "GRANTED", granted: true, canAskAgain: true };
      },
      async requestCameraPermission() {
        return { state: "GRANTED", granted: true, canAskAgain: true };
      },
    },
    normalizer: {
      async normalize(input) {
        return {
          uri: `file:///normalized/${input.captureId}.jpg`,
          mimeType: "image/jpeg",
          width: input.width ?? 1200,
          height: input.height ?? 900,
          byteSize: 250000,
          contentSha256: "a".repeat(64),
          orientationNormalized: true,
          metadataStripped: true,
        };
      },
    },
    recovery: {
      async launchSystemCamera() {
        return { uri: "file:///system-camera.jpg", width: 1200, height: 900 };
      },
      async pickFromLibrary() {
        return { uri: "file:///library.heic", width: 900, height: 1200 };
      },
      async pickManyFromLibrary(selectionLimit = 1) {
        return Array.from({ length: Math.max(1, selectionLimit) }, (_, index) => ({
          uri: `file:///library-${index + 1}.heic`,
          width: 900,
          height: 1200,
        }));
      },
      async restorePendingSystemResult() {
        return { uri: "file:///pending.jpg", width: 1200, height: 900 };
      },
    },
    repository,
    uploadQueue,
    uploader,
    ...overrides,
  });

  return { service, staged, attached, queue, uploaded };
}
