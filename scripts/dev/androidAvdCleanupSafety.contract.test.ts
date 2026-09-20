import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertAndroidAvdCleanupTargetsSafe,
  classifyAndroidAvdArtifact,
  summarizeAndroidAvdCleanupInventory,
} from "./androidAvdCleanupSafety";

describe("Android AVD cleanup safety", () => {
  it.each([
    "userdata-qemu.img.qcow2",
    "userdata-qemu.img",
    "encryptionkey.img.qcow2",
    "sdcard.img",
    "config.ini",
    "hardware-qemu.ini",
    "snapshots/default_boot/snapshot.pb",
    "data/misc/some-device-state",
    "cache.img.qcow2",
  ])("protects device state %s", (relativePath) => {
    expect(classifyAndroidAvdArtifact(relativePath)).toMatchObject({
      classification: "PROTECTED_STATE",
      countsAsSafeReclaim: false,
    });
  });

  it("does not report the cache partition or runtime metadata as safe reclaim", () => {
    expect(classifyAndroidAvdArtifact("cache.img")).toMatchObject({
      classification: "CONDITIONAL_CACHE",
      countsAsSafeReclaim: false,
    });
    expect(classifyAndroidAvdArtifact("multiinstance.lock")).toMatchObject({
      classification: "CONDITIONAL_RUNTIME_FILE",
      countsAsSafeReclaim: false,
    });
  });

  it("blocks unknown files instead of guessing that they are caches", () => {
    expect(classifyAndroidAvdArtifact("mystery-large-image.bin")).toMatchObject({
      classification: "UNKNOWN_BLOCKED",
      countsAsSafeReclaim: false,
    });
  });

  it("keeps stateful bytes out of the safe-reclaim total", () => {
    const inventory = summarizeAndroidAvdCleanupInventory([
      { relativePath: "userdata-qemu.img.qcow2", bytes: 12_000 },
      { relativePath: "cache.img", bytes: 2_000 },
      { relativePath: "emulator.log", bytes: 300 },
      { relativePath: "unknown.bin", bytes: 100 },
    ]);

    expect(inventory.totals).toEqual({
      totalBytes: 14_400,
      safeCandidateBytes: 300,
      conditionalCacheBytes: 2_000,
      conditionalRuntimeBytes: 0,
      protectedStateBytes: 12_000,
      unknownBlockedBytes: 100,
    });
  });

  it("requires a stopped emulator and rejects every non-ephemeral target", () => {
    expect(() => assertAndroidAvdCleanupTargetsSafe(["emulator.log"], {
      emulatorStopped: false,
    })).toThrow("EMULATOR_NOT_PROVEN_STOPPED");

    expect(() => assertAndroidAvdCleanupTargetsSafe(["userdata-qemu.img.qcow2"], {
      emulatorStopped: true,
    })).toThrow("PROTECTED_STATE:userdata-qemu.img.qcow2");

    expect(assertAndroidAvdCleanupTargetsSafe(["emulator.log"], {
      emulatorStopped: true,
    })).toHaveLength(1);
  });

  it("keeps the correction sealer read-only for the AVD and installed app", () => {
    const source = readFileSync(resolve("scripts/dev/sealAndroidAvdCleanupCorrection.ts"), "utf8");
    expect(source).not.toMatch(/\b(?:unlinkSync|rmSync|rmdirSync|truncateSync)\b/u);
    expect(source).not.toContain("pm clear");
    expect(source).not.toContain("uninstall");
    expect(source).not.toContain("-wipe-data");
    expect(source).toContain('filesDeleted: []');
    expect(source).toContain('safeReclaimBytesProven: null');
    expect(source).toContain('correctedClassification: "INVALIDATED_AS_SAFE_CACHE_CLEANUP"');
  });
});
