import {
  buildMediaProofInventory,
  buildMediaProofMatrix,
  createMediaProofAsset,
  createMediaProofDescriptors,
  type MediaAsset,
} from "../../src/lib/media";

export function mediaProof() {
  return buildMediaProofInventory();
}

export function mediaMatrix() {
  return buildMediaProofMatrix();
}

export function mediaDescriptors() {
  return createMediaProofDescriptors();
}

export function mediaAsset(overrides: Partial<MediaAsset> = {}) {
  return createMediaProofAsset(overrides);
}
