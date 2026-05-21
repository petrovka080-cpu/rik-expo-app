import type { MediaKind, MediaVariant } from "../mediaTypes";
import { allowedMediaVariants } from "../mediaVariantPolicy";

export function createMediaVariants(input: {
  assetId: string;
  mediaKind: MediaKind;
}): Record<MediaVariant, string | undefined> {
  const variants: Record<MediaVariant, string | undefined> = {
    original: undefined,
    preview: undefined,
    thumbnail: undefined,
    tiny: undefined,
    poster: undefined,
  };

  for (const variant of allowedMediaVariants(input.mediaKind)) {
    variants[variant] = `media://${input.assetId}/${variant}`;
  }

  return variants;
}

export function hasRequiredMediaVariants(input: {
  mediaKind: MediaKind;
  variants: Partial<Record<MediaVariant, string | undefined>>;
}): boolean {
  const required = input.mediaKind === "video" ? ["thumbnail", "preview", "poster"] : ["thumbnail", "preview", "tiny"];
  return required.every((variant) => Boolean(input.variants[variant as MediaVariant]));
}
