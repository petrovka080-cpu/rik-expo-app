import { isAllowedProofArtifactPath } from "./proofArtifactAllowlist";

export function normalizeReleaseVerifyDirtyPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function isCanonicalApi34EvidencePath(file: string): boolean {
  return (
    file === "scripts/e2e/canonicalApi34Evidence.ts" ||
    file.startsWith("artifacts/S_ANDROID_API34_CANONICAL_EVIDENCE/") ||
    file.startsWith("artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/")
  );
}

export function isOwnerQualityValidatedCanonicalApi34ChangedFile(filePath: string): boolean {
  const file = normalizeReleaseVerifyDirtyPath(filePath);
  return (
    isCanonicalApi34EvidencePath(file) ||
    file.startsWith("tests/architecture/ownerQuality") ||
    file.startsWith("tests/architecture/ownerSession") ||
    file.startsWith("tests/architecture/real10000") ||
    file === "tests/architecture/worldConstructionReleaseReusePolicy.contract.test.ts" ||
    file.startsWith("tests/catalogBinding/owner") ||
    file === "tests/e2e/ownerAccountLiveEstimateQualityLock.web.spec.ts" ||
    file.startsWith("tests/liveQuality/") ||
    file.startsWith("tests/pdf/owner")
  );
}

export function releaseVerifyAllowedDirtyFile(filePath: string): boolean {
  const file = normalizeReleaseVerifyDirtyPath(filePath);
  return (
    isAllowedProofArtifactPath(file) ||
    isOwnerQualityValidatedCanonicalApi34ChangedFile(file)
  );
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
