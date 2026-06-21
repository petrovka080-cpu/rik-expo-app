import type {
  PhotoMaterialCandidate,
  PhotoMaterialScanSession,
  PhotoMaterialStoredImage,
} from "./photoMaterialExistingRowTypes";

export function canReadPhotoMaterialScan(input: {
  session: PhotoMaterialScanSession;
  userId: string;
}): boolean {
  return input.session.userId === input.userId;
}

export function canReadPhotoMaterialImage(input: {
  session: PhotoMaterialScanSession;
  image: PhotoMaterialStoredImage;
  userId: string;
}): boolean {
  return input.image.scanId === input.session.scanId && canReadPhotoMaterialScan(input);
}

export function assertPhotoMaterialCandidateBelongsToScan(input: {
  session: PhotoMaterialScanSession;
  candidate: PhotoMaterialCandidate;
}): void {
  if (input.candidate.scanId !== input.session.scanId) {
    throw new Error("PHOTO_MATERIAL_CANDIDATE_SCAN_MISMATCH_REJECTED");
  }
}

export function assertPhotoMaterialTargetRevision(input: {
  session: PhotoMaterialScanSession;
  baseRevisionId: string;
  targetRowId: string;
}): void {
  if (input.session.baseRevisionId !== input.baseRevisionId) throw new Error("PHOTO_MATERIAL_TARGET_REVISION_MISMATCH");
  if (input.session.targetRowId !== input.targetRowId) throw new Error("PHOTO_MATERIAL_TARGET_ROW_MISMATCH");
}

export function serviceRoleKeyVisibleInPhotoMaterialClientBundle(bundleSource: string): boolean {
  return /service[_-]?role|SUPABASE_SERVICE_ROLE|sb_secret_/i.test(bundleSource);
}
