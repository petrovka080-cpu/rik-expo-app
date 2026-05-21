import type { MediaUploadDescriptor } from "../mediaTypes";

export type MediaCompressionPlan = {
  localId: string;
  mediaKind: MediaUploadDescriptor["mediaKind"];
  normalizedMimeType: string;
  targetMaxBytes: number;
  shouldTranscode: boolean;
};

export function planMediaCompression(descriptor: MediaUploadDescriptor): MediaCompressionPlan {
  const photo = descriptor.mediaKind === "photo";
  return {
    localId: descriptor.localId,
    mediaKind: descriptor.mediaKind,
    normalizedMimeType: photo ? "image/jpeg" : "video/mp4",
    targetMaxBytes: photo ? 2 * 1024 * 1024 : 20 * 1024 * 1024,
    shouldTranscode: descriptor.mimeType !== (photo ? "image/jpeg" : "video/mp4"),
  };
}
