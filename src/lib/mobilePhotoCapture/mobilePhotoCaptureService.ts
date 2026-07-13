import type { PhotoMaterialImageKind, PhotoMaterialStoredImage } from "../ai/photoMaterialExistingRow";
import { recordPlatformObservability } from "../observability/platformObservability";
import { createMobileCameraCapabilityService, type MobileCameraCapabilityService } from "./mobileCameraCapabilityService";
import { createMobileCameraPermissionService, type MobileCameraPermissionService } from "./mobileCameraPermissionService";
import { createMobilePhotoNormalizationService, type MobilePhotoNormalizationService } from "./mobilePhotoNormalizationService";
import { createMobilePhotoLocalRepository, type MobilePhotoLocalRepository } from "./mobilePhotoLocalRepository";
import { createMobilePhotoUploadQueue, type MobilePhotoUploadQueue } from "./mobilePhotoUploadQueue";
import { createMobilePhotoUploadService, type MobilePhotoUploadService } from "./mobilePhotoUploadService";
import { createMobilePhotoRecoveryService, type MobilePhotoRecoveryService } from "./mobilePhotoRecoveryService";
import { createMobilePhotoCaptureError } from "./mobilePhotoCaptureErrors";

export type PhotoCaptureSource = "IN_APP_CAMERA" | "SYSTEM_CAMERA" | "SYSTEM_PHOTO_PICKER";
export type PhotoCaptureKind = "PRODUCT_FRONT" | "BARCODE" | "PRICE_TAG" | "OTHER";

export type MobileCameraState =
  | "IDLE"
  | "CHECKING_CAPABILITY"
  | "REQUESTING_PERMISSION"
  | "PERMISSION_DENIED"
  | "MOUNTING"
  | "READY"
  | "CAPTURING"
  | "REVIEWING"
  | "STAGING"
  | "COMPLETED"
  | "INTERRUPTED"
  | "FAILED";

export type CapturedPhotoAsset = {
  captureId: string;
  scanId: string;
  source: PhotoCaptureSource;
  kind: PhotoCaptureKind;
  localUri: string;
  mimeType: "image/jpeg" | "image/png";
  width: number;
  height: number;
  byteSize: number;
  contentSha256: string;
  orientationNormalized: boolean;
  metadataStripped: boolean;
  createdAt: string;
};

export type OpenMobileCameraInput = {
  scanId: string;
  targetRowId: string;
  userAction: "PHOTO_BUTTON_PRESS";
};

export type CapturePhotoInput = {
  scanId: string;
  kind: PhotoCaptureKind;
  source: PhotoCaptureSource;
  cameraReady: boolean;
  takePictureAsync: () => Promise<{
    uri?: string | null;
    width?: number | null;
    height?: number | null;
  } | null | undefined>;
  now?: string;
};

export type SystemCameraInput = {
  scanId: string;
  kind: PhotoCaptureKind;
  now?: string;
};

export type PhotoLibraryInput = SystemCameraInput & {
  selectionLimit?: number;
};

export type AttachCapturedPhotoToScanInput = {
  asset: CapturedPhotoAsset;
  storagePathPrefix?: string;
};

export type ScanAttachmentResult = {
  storedImage: PhotoMaterialStoredImage;
  recognitionAllowed: false;
};

export interface MobilePhotoCaptureService {
  openCamera(input: OpenMobileCameraInput): Promise<void>;
  capturePhoto(input: CapturePhotoInput): Promise<CapturedPhotoAsset>;
  launchSystemCamera(input: SystemCameraInput): Promise<CapturedPhotoAsset | null>;
  pickFromLibrary(input: PhotoLibraryInput): Promise<CapturedPhotoAsset | null>;
  pickManyFromLibrary(input: PhotoLibraryInput): Promise<CapturedPhotoAsset[]>;
  restorePendingSystemResult(input: SystemCameraInput): Promise<CapturedPhotoAsset | null>;
  attachCapturedPhotoToScan(input: AttachCapturedPhotoToScanInput): Promise<ScanAttachmentResult>;
  queueUpload(asset: CapturedPhotoAsset): Promise<void>;
  completeQueuedUploads(): Promise<void>;
  discardCapture(captureId: string): Promise<void>;
}

export type MobilePhotoCaptureServiceDeps = {
  capability?: MobileCameraCapabilityService;
  permissions?: MobileCameraPermissionService;
  normalizer?: MobilePhotoNormalizationService;
  repository?: MobilePhotoLocalRepository;
  uploadQueue?: MobilePhotoUploadQueue;
  uploader?: MobilePhotoUploadService;
  recovery?: MobilePhotoRecoveryService;
};

const PHOTO_MATERIAL_KIND: Record<PhotoCaptureKind, PhotoMaterialImageKind> = {
  PRODUCT_FRONT: "PRODUCT_FRONT",
  BARCODE: "BARCODE",
  PRICE_TAG: "PRICE_TAG",
  OTHER: "OTHER",
};

function nowIso(now?: string): string {
  return now ?? new Date().toISOString();
}

function makeCaptureId(scanId: string, kind: PhotoCaptureKind, now: string): string {
  return `capture:${scanId}:${kind}:${now}`;
}

function recordMobilePhotoEvent(event: string, result: "success" | "error" | "skipped", extra?: Record<string, unknown>) {
  recordPlatformObservability({
    screen: "request",
    surface: "mobile_photo_capture",
    category: "ui",
    event,
    result,
    sourceKind: "mobile_photo_capture",
    extra,
  });
}

async function stageRawPhoto(params: {
  scanId: string;
  kind: PhotoCaptureKind;
  source: PhotoCaptureSource;
  uri: string;
  width?: number | null;
  height?: number | null;
  now?: string;
  normalizer: MobilePhotoNormalizationService;
  repository: MobilePhotoLocalRepository;
}): Promise<CapturedPhotoAsset> {
  const createdAt = nowIso(params.now);
  const captureId = makeCaptureId(params.scanId, params.kind, createdAt);
  const normalized = await params.normalizer.normalize({
    captureId,
    sourceUri: params.uri,
    width: params.width ?? null,
    height: params.height ?? null,
  });
  return params.repository.stage({
    captureId,
    scanId: params.scanId,
    source: params.source,
    kind: params.kind,
    normalizedUri: normalized.uri,
    mimeType: normalized.mimeType,
    width: normalized.width,
    height: normalized.height,
    byteSize: normalized.byteSize,
    contentSha256: normalized.contentSha256,
    orientationNormalized: normalized.orientationNormalized,
    metadataStripped: normalized.metadataStripped,
    createdAt,
  });
}

export function createMobilePhotoCaptureService(
  deps: MobilePhotoCaptureServiceDeps = {},
): MobilePhotoCaptureService {
  const capability = deps.capability ?? createMobileCameraCapabilityService();
  const permissions = deps.permissions ?? createMobileCameraPermissionService();
  const normalizer = deps.normalizer ?? createMobilePhotoNormalizationService();
  const repository = deps.repository ?? createMobilePhotoLocalRepository();
  const uploadQueue = deps.uploadQueue ?? createMobilePhotoUploadQueue();
  const uploader = deps.uploader ?? createMobilePhotoUploadService();
  const recovery = deps.recovery ?? createMobilePhotoRecoveryService();

  return {
    async openCamera(input) {
      if (input.userAction !== "PHOTO_BUTTON_PRESS") {
        throw createMobilePhotoCaptureError("CAMERA_PERMISSION_DENIED");
      }
      recordMobilePhotoEvent("mobile_camera_connection_checked", "success", {
        targetRowId: input.targetRowId,
      });
      const capabilityResult = await capability.checkCapability();
      if (!capabilityResult.nativeModuleResolved) {
        recordMobilePhotoEvent("mobile_camera_native_module_missing", "error");
        throw createMobilePhotoCaptureError("CAMERA_NATIVE_MODULE_UNAVAILABLE");
      }
      if (!capabilityResult.cameraHardwareAvailable) {
        throw createMobilePhotoCaptureError("CAMERA_NOT_AVAILABLE");
      }
      const permission = await permissions.requestCameraPermission();
      if (permission.state !== "GRANTED") {
        throw createMobilePhotoCaptureError(
          permission.state === "DENIED_PERMANENT"
            ? "CAMERA_PERMISSION_PERMANENTLY_DENIED"
            : permission.state === "RESTRICTED"
              ? "CAMERA_PERMISSION_RESTRICTED"
              : "CAMERA_PERMISSION_DENIED",
        );
      }
      recordMobilePhotoEvent("mobile_camera_permission_granted", "success", {
        scanId: input.scanId,
      });
    },

    async capturePhoto(input) {
      if (!input.cameraReady) {
        throw createMobilePhotoCaptureError("CAMERA_NOT_READY");
      }
      recordMobilePhotoEvent("mobile_photo_capture_started", "success", {
        scanId: input.scanId,
        kind: input.kind,
      });
      const picture = await input.takePictureAsync();
      const uri = String(picture?.uri ?? "").trim();
      if (!uri) throw createMobilePhotoCaptureError("CAMERA_CAPTURE_FAILED");
      const staged = await stageRawPhoto({
        scanId: input.scanId,
        kind: input.kind,
        source: input.source,
        uri,
        width: picture?.width,
        height: picture?.height,
        now: input.now,
        normalizer,
        repository,
      });
      recordMobilePhotoEvent("mobile_photo_staged", "success", {
        scanId: input.scanId,
        kind: input.kind,
      });
      return staged;
    },

    async launchSystemCamera(input) {
      const result = await recovery.launchSystemCamera();
      if (!result) return null;
      return stageRawPhoto({
        scanId: input.scanId,
        kind: input.kind,
        source: "SYSTEM_CAMERA",
        uri: result.uri,
        width: result.width,
        height: result.height,
        now: input.now,
        normalizer,
        repository,
      });
    },

    async pickFromLibrary(input) {
      const result = await recovery.pickFromLibrary();
      if (!result) return null;
      return stageRawPhoto({
        scanId: input.scanId,
        kind: input.kind,
        source: "SYSTEM_PHOTO_PICKER",
        uri: result.uri,
        width: result.width,
        height: result.height,
        now: input.now,
        normalizer,
        repository,
      });
    },

    async pickManyFromLibrary(input) {
      const results = await recovery.pickManyFromLibrary(input.selectionLimit);
      return Promise.all(results.map((result, index) =>
        stageRawPhoto({
          scanId: `${input.scanId}:${index + 1}`,
          kind: input.kind,
          source: "SYSTEM_PHOTO_PICKER",
          uri: result.uri,
          width: result.width,
          height: result.height,
          now: input.now,
          normalizer,
          repository,
        })
      ));
    },

    async restorePendingSystemResult(input) {
      const result = await recovery.restorePendingSystemResult();
      if (!result) return null;
      recordMobilePhotoEvent("mobile_pending_picker_result_restored", "success");
      return stageRawPhoto({
        scanId: input.scanId,
        kind: input.kind,
        source: "SYSTEM_CAMERA",
        uri: result.uri,
        width: result.width,
        height: result.height,
        now: input.now,
        normalizer,
        repository,
      });
    },

    async attachCapturedPhotoToScan(input) {
      if (!input.asset.metadataStripped) {
        throw createMobilePhotoCaptureError("PHOTO_METADATA_STRIP_FAILED");
      }
      if (!input.asset.orientationNormalized) {
        throw createMobilePhotoCaptureError("PHOTO_ORIENTATION_NORMALIZATION_FAILED");
      }
      const storagePathPrefix = input.storagePathPrefix ?? "photo-material";
      const storedImage: PhotoMaterialStoredImage = {
        imageId: input.asset.captureId,
        scanId: input.asset.scanId,
        kind: PHOTO_MATERIAL_KIND[input.asset.kind],
        mimeType: input.asset.mimeType,
        byteSize: input.asset.byteSize,
        width: input.asset.width,
        height: input.asset.height,
        decodedPixelCount: input.asset.width * input.asset.height,
        contentSha256: input.asset.contentSha256,
        storageBucket: "private-media",
        storagePath: `${storagePathPrefix}/${input.asset.scanId}/${input.asset.captureId}.jpg`,
        privateObject: true,
        exifGpsStripped: true,
        signedUrlExposed: false,
      };
      await repository.markAttached(input.asset.captureId);
      recordMobilePhotoEvent("mobile_photo_confirmed", "success", {
        scanId: input.asset.scanId,
        kind: input.asset.kind,
      });
      return {
        storedImage,
        recognitionAllowed: false,
      };
    },

    async queueUpload(asset) {
      await uploadQueue.enqueue({
        captureId: asset.captureId,
        scanId: asset.scanId,
        localUri: asset.localUri,
        mimeType: asset.mimeType,
        byteSize: asset.byteSize,
        contentSha256: asset.contentSha256,
        idempotencyKey: `${asset.scanId}:${asset.captureId}:${asset.contentSha256}`,
        attempts: 0,
        status: "queued",
        createdAt: asset.createdAt,
      });
      recordMobilePhotoEvent("mobile_photo_upload_queued", "success", {
        scanId: asset.scanId,
      });
    },

    async completeQueuedUploads() {
      const pending = await uploadQueue.listPending();
      for (const item of pending) {
        await uploadQueue.markUploading(item.idempotencyKey);
        try {
          await uploader.uploadQueuedItem(item);
          await uploadQueue.markUploaded(item.idempotencyKey);
          await repository.markUploaded(item.captureId);
        } catch (error) {
          await uploadQueue.markFailed(item.idempotencyKey);
          throw error;
        }
      }
      if (pending.length > 0) {
        recordMobilePhotoEvent("mobile_photo_upload_resumed", "success", {
          count: pending.length,
        });
      }
    },

    async discardCapture(captureId) {
      await uploadQueue.removeByCaptureId(captureId);
      await repository.discard(captureId);
    },
  };
}
