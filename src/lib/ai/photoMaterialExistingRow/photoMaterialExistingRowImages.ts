import type {
  PhotoMaterialQualityIssueCode,
  PhotoMaterialQualityValidation,
  PhotoMaterialStoredImage,
} from "./photoMaterialExistingRowTypes";

const MAX_IMAGES = 4;
const MAX_BYTES = 10 * 1024 * 1024;
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;
const MAX_DECODED_PIXELS = 48_000_000;

export function validatePhotoMaterialImages(images: readonly PhotoMaterialStoredImage[]): PhotoMaterialQualityValidation {
  const issues: PhotoMaterialQualityIssueCode[] = [];
  if (images.length > MAX_IMAGES) issues.push("IMAGE_COUNT_EXCEEDED");
  for (const image of images) {
    if (image.byteSize > MAX_BYTES) issues.push("IMAGE_TOO_LARGE");
    if (!["image/jpeg", "image/png", "image/heic"].includes(image.mimeType)) issues.push("UNSUPPORTED_MIME");
    if (image.width < MIN_WIDTH || image.height < MIN_HEIGHT) issues.push("IMAGE_TOO_SMALL");
    if (image.decodedPixelCount > MAX_DECODED_PIXELS) issues.push("DECODED_PIXELS_EXCEEDED");
    if (!/^[a-f0-9]{64}$/i.test(image.contentSha256)) issues.push("CONTENT_SHA256_REQUIRED");
    if (image.storageBucket !== "private-media" || !image.privateObject) issues.push("PRIVATE_STORAGE_REQUIRED");
    if (image.signedUrlExposed) issues.push("SIGNED_URL_FORBIDDEN");
    if (!image.exifGpsStripped) issues.push("EXIF_GPS_NOT_STRIPPED");
  }
  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
    rescanRequired: issues.length > 0,
  };
}

export function photoMaterialArtifactSafeImageSummary(images: readonly PhotoMaterialStoredImage[]) {
  return images.map((image) => ({
    imageId: image.imageId,
    scanId: image.scanId,
    kind: image.kind,
    mimeType: image.mimeType,
    byteSize: image.byteSize,
    width: image.width,
    height: image.height,
    contentSha256: image.contentSha256,
    privateObject: image.privateObject,
  }));
}
