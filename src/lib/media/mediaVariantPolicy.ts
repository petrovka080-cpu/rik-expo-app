import type { MediaKind, MediaVariant } from "./mediaTypes";

export function allowedMediaVariants(mediaKind: MediaKind): MediaVariant[] {
  return mediaKind === "video"
    ? ["tiny", "thumbnail", "preview", "poster", "original"]
    : ["tiny", "thumbnail", "preview", "original"];
}

export function chooseDefaultPreviewVariant(mediaKind: MediaKind): Exclude<MediaVariant, "original"> {
  return mediaKind === "video" ? "poster" : "thumbnail";
}
