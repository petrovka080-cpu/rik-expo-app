import { basename } from "node:path";

export type AndroidAvdArtifactClassification =
  | "PROTECTED_STATE"
  | "CONDITIONAL_CACHE"
  | "CONDITIONAL_RUNTIME_FILE"
  | "SAFE_EPHEMERAL_CANDIDATE"
  | "UNKNOWN_BLOCKED";

export type AndroidAvdArtifactDecision = {
  relativePath: string;
  classification: AndroidAvdArtifactClassification;
  reason: string;
  countsAsSafeReclaim: boolean;
};

export type AndroidAvdCleanupInventoryEntry = AndroidAvdArtifactDecision & {
  bytes: number;
};

export type AndroidAvdCleanupTotals = {
  totalBytes: number;
  safeCandidateBytes: number;
  conditionalCacheBytes: number;
  conditionalRuntimeBytes: number;
  protectedStateBytes: number;
  unknownBlockedBytes: number;
};

const PROTECTED_STATE_BASENAMES = new Set([
  "config.ini",
  "hardware-qemu.ini",
  "encryptionkey.img",
  "sdcard.img",
]);

const CONDITIONAL_RUNTIME_BASENAMES = new Set([
  "avd.conf",
  "bootcompleted.ini",
  "emu-launch-params.txt",
  "emulator-user.ini",
  "multiinstance.lock",
  "quickbootchoice.ini",
  "read-snapshot.txt",
  "version_num.cache",
]);

function normalizeRelativePath(value: string): string {
  return value.trim().replace(/\\/gu, "/").replace(/^\.\//u, "").toLowerCase();
}

/**
 * Classifies files inside an Android Virtual Device directory. The policy is
 * intentionally fail-closed: an unrecognised file is not a cache candidate.
 * In particular, qcow2 overlays can contain mutable device state even when a
 * neighbouring base image has "cache" in its name.
 */
export function classifyAndroidAvdArtifact(relativePath: string): AndroidAvdArtifactDecision {
  const normalized = normalizeRelativePath(relativePath);
  const fileName = basename(normalized);
  const segments = normalized.split("/").filter(Boolean);

  if (
    segments.includes("snapshots")
    || segments.includes("data")
    || fileName.startsWith("userdata")
    || fileName.startsWith("encryptionkey")
    || fileName.startsWith("sdcard")
    || fileName.endsWith(".qcow2")
    || PROTECTED_STATE_BASENAMES.has(fileName)
  ) {
    return {
      relativePath,
      classification: "PROTECTED_STATE",
      reason: "AVD device/application state or a mutable disk overlay",
      countsAsSafeReclaim: false,
    };
  }

  if (fileName === "cache.img") {
    return {
      relativePath,
      classification: "CONDITIONAL_CACHE",
      reason: "emulator cache partition; never an automatic deletion target",
      countsAsSafeReclaim: false,
    };
  }

  if (
    CONDITIONAL_RUNTIME_BASENAMES.has(fileName)
    || fileName.endsWith(".lock")
  ) {
    return {
      relativePath,
      classification: "CONDITIONAL_RUNTIME_FILE",
      reason: "emulator runtime/control metadata; unsafe while the AVD may be running",
      countsAsSafeReclaim: false,
    };
  }

  if (
    segments.length === 1
    && (fileName.endsWith(".log") || fileName.endsWith(".tmp"))
  ) {
    return {
      relativePath,
      classification: "SAFE_EPHEMERAL_CANDIDATE",
      reason: "top-level diagnostic or temporary file; still requires a stopped AVD",
      countsAsSafeReclaim: true,
    };
  }

  return {
    relativePath,
    classification: "UNKNOWN_BLOCKED",
    reason: "unrecognised AVD artifact; deletion is blocked until explicitly classified",
    countsAsSafeReclaim: false,
  };
}

export function summarizeAndroidAvdCleanupInventory(
  entries: readonly { relativePath: string; bytes: number }[],
): { entries: AndroidAvdCleanupInventoryEntry[]; totals: AndroidAvdCleanupTotals } {
  const classified = entries.map((entry) => ({
    ...classifyAndroidAvdArtifact(entry.relativePath),
    bytes: entry.bytes,
  }));
  const totals: AndroidAvdCleanupTotals = {
    totalBytes: 0,
    safeCandidateBytes: 0,
    conditionalCacheBytes: 0,
    conditionalRuntimeBytes: 0,
    protectedStateBytes: 0,
    unknownBlockedBytes: 0,
  };

  for (const entry of classified) {
    totals.totalBytes += entry.bytes;
    if (entry.classification === "SAFE_EPHEMERAL_CANDIDATE") {
      totals.safeCandidateBytes += entry.bytes;
    } else if (entry.classification === "CONDITIONAL_CACHE") {
      totals.conditionalCacheBytes += entry.bytes;
    } else if (entry.classification === "CONDITIONAL_RUNTIME_FILE") {
      totals.conditionalRuntimeBytes += entry.bytes;
    } else if (entry.classification === "PROTECTED_STATE") {
      totals.protectedStateBytes += entry.bytes;
    } else {
      totals.unknownBlockedBytes += entry.bytes;
    }
  }

  return { entries: classified, totals };
}

export function assertAndroidAvdCleanupTargetsSafe(
  relativePaths: readonly string[],
  options: { emulatorStopped: boolean },
): AndroidAvdArtifactDecision[] {
  if (!options.emulatorStopped) {
    throw new Error("ANDROID_AVD_CLEANUP_BLOCKED:EMULATOR_NOT_PROVEN_STOPPED");
  }
  if (relativePaths.length === 0) {
    throw new Error("ANDROID_AVD_CLEANUP_BLOCKED:NO_EXPLICIT_TARGETS");
  }

  const decisions = relativePaths.map(classifyAndroidAvdArtifact);
  const blocked = decisions.filter((decision) => !decision.countsAsSafeReclaim);
  if (blocked.length > 0) {
    throw new Error(
      `ANDROID_AVD_CLEANUP_BLOCKED:${blocked
        .map((decision) => `${decision.classification}:${decision.relativePath}`)
        .join(",")}`,
    );
  }
  return decisions;
}
