export function normalizeReleaseVerifyDirtyPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function isOwnerQualityValidatedCanonicalApi34ChangedFile(filePath: string): boolean {
  normalizeReleaseVerifyDirtyPath(filePath);
  return false;
}

export function releaseVerifyAllowedDirtyFile(filePath: string): boolean {
  normalizeReleaseVerifyDirtyPath(filePath);
  return false;
}

export function releaseVerifyAllowedDirtyFiles(
  dirtyFiles: string[],
  insideReleaseVerify = process.env.RELEASE_GUARD_IN_PROGRESS === "1",
): string[] {
  if (!insideReleaseVerify) return [];
  return dirtyFiles.map(normalizeReleaseVerifyDirtyPath).filter((file) => releaseVerifyAllowedDirtyFile(file));
}

export function releaseVerifyBlockingDirtyFiles(
  dirtyFiles: string[],
  insideReleaseVerify = process.env.RELEASE_GUARD_IN_PROGRESS === "1",
): string[] {
  const normalizedFiles = dirtyFiles.map(normalizeReleaseVerifyDirtyPath);
  if (!insideReleaseVerify) return normalizedFiles;
  return normalizedFiles.filter((file) => !releaseVerifyAllowedDirtyFile(file));
}
