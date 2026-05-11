import fs from "fs";
import os from "os";
import path from "path";

import {
  ensureAndroidEmulatorReady,
  parseAdbDevices,
  parseAvdList,
  selectAndroidAvd,
  type CommandRunner,
} from "../../scripts/e2e/ensureAndroidEmulatorReady";

describe("ensureAndroidEmulatorReady", () => {
  it("does not treat missing adb or no-device as pass", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-emulator-missing-adb-"));
    const result = await ensureAndroidEmulatorReady({
      projectRoot: tempDir,
      env: { NODE_ENV: "test" },
      runCommand: () => ({ status: 1, stdout: "", stderr: "not found" }),
      startProcess: () => {
        throw new Error("emulator should not start without adb");
      },
      sleep: async () => undefined,
      artifactPath: "artifact.json",
    });

    expect(result.final_status).toBe("BLOCKED_HOST_HAS_NO_ANDROID_SDK_OR_AVD");
    expect(result.adbDetected).toBe(false);
    expect(result.fakePassClaimed).toBe(false);
    expect(JSON.parse(fs.readFileSync(path.join(tempDir, "artifact.json"), "utf8"))).toEqual(
      expect.objectContaining({ fakePassClaimed: false, adbPath: "missing" }),
    );
  });

  it("attempts emulator boot when no device is connected and an AVD exists", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-emulator-avd-"));
    let adbDeviceCalls = 0;
    const started: string[][] = [];
    const runCommand: CommandRunner = (command, args) => {
      const joined = [command, ...args].join(" ");
      if (joined === "where adb") return { status: 0, stdout: "adb\n", stderr: "" };
      if (joined === "where emulator") return { status: 0, stdout: "emulator\n", stderr: "" };
      if (joined === "adb devices") {
        adbDeviceCalls += 1;
        return {
          status: 0,
          stdout: adbDeviceCalls === 1 ? "List of devices attached\n" : "List of devices attached\nemulator-5554\tdevice\n",
          stderr: "",
        };
      }
      if (joined === "emulator -list-avds") {
        return { status: 0, stdout: "Medium_Phone_API_36.1\nPixel_7_API_34\n", stderr: "" };
      }
      if (joined.includes("getprop sys.boot_completed")) {
        return { status: 0, stdout: "1\n", stderr: "" };
      }
      if (joined.includes("settings put global")) {
        return { status: 0, stdout: "", stderr: "" };
      }
      return { status: 0, stdout: "", stderr: "" };
    };

    const result = await ensureAndroidEmulatorReady({
      projectRoot: tempDir,
      env: { NODE_ENV: "test", MAESTRO_EXPECTED_AVD_PATTERN: "API_34" },
      runCommand,
      startProcess: (_command, args) => started.push([...args]),
      sleep: async () => undefined,
      bootTimeoutMs: 1_000,
      pollIntervalMs: 1,
      artifactPath: "artifact.json",
    });

    expect(started).toContainEqual(["-avd", "Pixel_7_API_34", "-no-snapshot-save"]);
    expect(result.final_status).toBe("GREEN_ANDROID_EMULATOR_READY");
    expect(result.bootAttempted).toBe(true);
    expect(result.bootCompleted).toBe(true);
    expect(result.animationsDisabled).toBe(true);
    const artifact = JSON.parse(fs.readFileSync(path.join(tempDir, "artifact.json"), "utf8"));
    expect(artifact).toEqual(expect.objectContaining({ adbPath: "present_redacted", emulatorPath: "present_redacted" }));
  });

  it("parses devices and chooses a canonical AVD without exposing host paths", () => {
    expect(parseAdbDevices("List of devices attached\nemulator-5554\tdevice\nabc\toffline\n")).toEqual(["emulator-5554"]);
    expect(parseAvdList("Medium_Phone_API_36.1\nPixel_7_API_34\n")).toEqual([
      "Medium_Phone_API_36.1",
      "Pixel_7_API_34",
    ]);
    expect(
      selectAndroidAvd({
        avds: ["Medium_Phone_API_36.1", "Pixel_7_API_34"],
        expectedPattern: "API_34",
      }),
    ).toBe("Pixel_7_API_34");
  });
});
