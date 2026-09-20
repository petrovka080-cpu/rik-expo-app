import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statfsSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { computeReleaseFingerprints } from "../release/computeReleaseFingerprints";
import { summarizeAndroidAvdCleanupInventory } from "./androidAvdCleanupSafety";

const CONTRACT = "rik-expo-app.r4-a13-6.android-avd-cleanup-correction.v1";
const STATUS = "CORRECTED_AVD_STATE_REMOVAL_NOT_SAFE_CACHE_NO_NEW_DELETION";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const MASTER = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
);
const EXPECTED_MASTER_SHA256 = "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8";
const NATIVE_ACCEPTANCE = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a13-6-i15-foundation-150/04_ANDROID_NATIVE/acceptance.json",
);
const OUTPUT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a13-6-avd-cleanup-correction/acceptance.json",
);
const AVD_NAME = process.env.ANDROID_AVD_NAME?.trim() || "Pixel_7_API_34";
const AVD_HOME = resolve(
  process.env.ANDROID_AVD_HOME?.trim()
    || `${process.env.USERPROFILE ?? ""}/.android/avd`,
);
const AVD_PATH = resolve(AVD_HOME, `${AVD_NAME}.avd`);
const DEVICE_ID = "emulator-5554";
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`ANDROID_AVD_CLEANUP_CORRECTION:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256(readFileSync(path));
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function runText(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 20_000,
    }).trim();
  } catch {
    return "";
  }
}

function listFiles(root: string): { relativePath: string; bytes: number }[] {
  const files: { relativePath: string; bytes: number }[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolutePath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolutePath);
      } else if (entry.isFile()) {
        files.push({
          relativePath: relative(root, absolutePath).replace(/\\/gu, "/"),
          bytes: statSync(absolutePath).size,
        });
      }
    }
  }
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function diskFreeBytes(path: string): number {
  const stats = statfsSync(path);
  return stats.bavail * stats.bsize;
}

function main(): void {
  invariant(existsSync(MASTER), "MASTER_MISSING");
  invariant(sha256File(MASTER) === EXPECTED_MASTER_SHA256, "MASTER_SHA256_MISMATCH");
  invariant(existsSync(AVD_PATH), `AVD_MISSING:${AVD_PATH}`);
  invariant(existsSync(NATIVE_ACCEPTANCE), "NATIVE_ACCEPTANCE_MISSING");

  const nativeAcceptance = JSON.parse(readFileSync(NATIVE_ACCEPTANCE, "utf8")) as Record<string, any>;
  invariant(nativeAcceptance.runtime?.platform === "android_native", "NATIVE_ACCEPTANCE_PLATFORM_MISMATCH");
  invariant(nativeAcceptance.runtime?.chromeCdpUsed === false, "NATIVE_ACCEPTANCE_CHROME_MISMATCH");
  invariant(nativeAcceptance.runtime?.appDataCleared === false, "NATIVE_ACCEPTANCE_DATA_WAS_CLEARED");
  invariant(nativeAcceptance.runtime?.avdWiped === false, "NATIVE_ACCEPTANCE_AVD_WAS_WIPED");

  const packageBefore = runText("adb", ["-s", DEVICE_ID, "shell", "pm", "path", PACKAGE_NAME]);
  invariant(packageBefore.startsWith("package:"), "PACKAGE_NOT_INSTALLED_BEFORE_AUDIT");
  const bootCompleted = runText("adb", ["-s", DEVICE_ID, "shell", "getprop", "sys.boot_completed"]);
  invariant(bootCompleted === "1", "EMULATOR_NOT_BOOTED");

  const freeBytesBefore = diskFreeBytes(AVD_PATH);
  const inventory = summarizeAndroidAvdCleanupInventory(listFiles(AVD_PATH));
  const critical = inventory.entries.filter((entry) => [
    "userdata-qemu.img.qcow2",
    "userdata-qemu.img",
    "encryptionkey.img.qcow2",
    "config.ini",
    "cache.img",
    "cache.img.qcow2",
  ].includes(entry.relativePath.toLowerCase()));
  const largest = [...inventory.entries]
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, 25);
  const fingerprints = computeReleaseFingerprints();
  const packageAfter = runText("adb", ["-s", DEVICE_ID, "shell", "pm", "path", PACKAGE_NAME]);
  const freeBytesAfter = diskFreeBytes(AVD_PATH);

  invariant(packageAfter === packageBefore, "PACKAGE_STATE_CHANGED_DURING_AUDIT");
  invariant(freeBytesAfter >= 0 && freeBytesBefore >= 0, "DISK_MEASUREMENT_FAILED");

  const payload: Record<string, any> = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: STATUS,
    globalStatus: GLOBAL_STATUS,
    master: {
      path: MASTER.replace(/\\/gu, "/"),
      bytes: statSync(MASTER).size,
      sha256: sha256File(MASTER),
    },
    source: {
      branch: runText("git", ["branch", "--show-current"]),
      head: runText("git", ["rev-parse", "HEAD"]),
      sourceTreeHash: fingerprints.sourceTreeHash,
      productSourceHash: fingerprints.productSourceHash,
      proofHarnessHash: fingerprints.proofHarnessHash,
    },
    historicalCorrection: {
      reportedReclaimedGiB: 12.12,
      reportedExactBytes: null,
      correctedClassification: "INVALIDATED_AS_SAFE_CACHE_CLEANUP",
      safeReclaimBytesProven: null,
      safeReclaimClaimAllowed: false,
      removedStatefulArtifact: "userdata-qemu.img.qcow2",
      stateImpact: "AVD_USERDATA_RESET_OR_REPLACEMENT",
      observedConsequenceFromJournal: "APK_REINSTALL_AND_NEW_AUTHORIZATION_REQUIRED",
      unsynchronizedLocalDraftsPreserved: "NOT_PROVEN",
      explanation: "The reported disk delta included deletion of mutable AVD userdata and therefore cannot be classified wholly or partly as safe cache reclaim without a per-object before/after ledger.",
    },
    currentReadOnlyAudit: {
      avdName: AVD_NAME,
      avdPath: AVD_PATH.replace(/\\/gu, "/"),
      deviceId: DEVICE_ID,
      bootCompleted: true,
      packageName: PACKAGE_NAME,
      packageInstalledBefore: true,
      packageInstalledAfter: true,
      inventoryFileCount: inventory.entries.length,
      inventoryByteSemantics: "FILE_LOGICAL_LENGTH_NOT_ALLOCATED_OR_RECLAIMABLE_BYTES",
      totals: inventory.totals,
      criticalArtifacts: critical,
      largestArtifacts: largest,
      diskFreeBytesBefore: freeBytesBefore,
      diskFreeBytesAfter: freeBytesAfter,
      diskFreeDeltaBytes: freeBytesAfter - freeBytesBefore,
      diskFreeDeltaInterpretation: "RUNNING_EMULATOR_BACKGROUND_VARIATION_NOT_A_CLEANUP_RESULT",
      auditPerformedDeletionOrStateMutation: false,
      filesDeleted: [],
      filesMoved: [],
      emulatorStopped: false,
      appDataCleared: false,
      installPerformed: false,
      avdWiped: false,
    },
    policy: {
      classifier: "scripts/dev/androidAvdCleanupSafety.ts",
      default: "FAIL_CLOSED",
      userdata: "PROTECTED_STATE",
      allQcow2: "PROTECTED_STATE",
      snapshots: "PROTECTED_STATE",
      unknownArtifacts: "UNKNOWN_BLOCKED",
      cachePartition: "CONDITIONAL_CACHE_NOT_SAFE_RECLAIM",
      runningAvdDeletion: "FORBIDDEN",
    },
    linkedNativeAcceptance: {
      path: NATIVE_ACCEPTANCE.replace(/\\/gu, "/"),
      fileSha256: sha256File(NATIVE_ACCEPTANCE),
      receiptSha256: nativeAcceptance.receiptSha256,
      initialRevisionId: nativeAcceptance.nativeJourney?.create?.revisionId,
      editedRevisionId: nativeAcceptance.nativeJourney?.edit?.revisionId,
    },
    gates: {
      historicalSafeCleanupClaimCorrected: "GREEN",
      userdataProtectedByPolicy: "GREEN",
      unknownArtifactsFailClosed: "GREEN",
      noNewDeletion: "GREEN",
      currentPackagePreserved: "GREEN",
      currentAvdPreserved: "GREEN",
      safeCleanupOfTwelvePointTwelveGiBProven: "RED_NOT_PROVEN",
    },
    productionRequests: 0,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  payload.receiptSha256 = sha256(JSON.stringify(payload));
  atomicJson(OUTPUT, payload);
  process.stdout.write(`${JSON.stringify({
    status: payload.status,
    output: OUTPUT,
    receiptSha256: payload.receiptSha256,
    totals: inventory.totals,
    filesDeleted: 0,
  })}\n`);
}

main();
