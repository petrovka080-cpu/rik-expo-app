import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildWindowsCurrentCoreMemoryMonitorScript,
  collectLockedWindowsProcessTree,
  lockWindowsRootProcessIdentity,
  startWindowsCurrentCoreMemoryMonitor,
  type WindowsProcessSnapshot,
} from "./currentCoreMemoryMonitor";

const snapshot = (
  pid: number,
  parentPid: number,
  creationTime: string,
  commandLine: string,
): WindowsProcessSnapshot => ({
  pid,
  parentPid,
  creationTime,
  commandLine,
  workingSetBytes: 1024,
});

const close = (child: ReturnType<typeof spawn>): Promise<number | null> =>
  new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });

describe("CurrentCore process-identity memory monitor", () => {
  it("locks PID, creation time, command identity and runner ownership", () => {
    const root = snapshot(100, 10, "20260730100000.000000+000", "node jest.js batch-55");
    expect(
      lockWindowsRootProcessIdentity({
        snapshots: [root],
        rootPid: 100,
        runnerPid: 10,
        expectedCommandFragments: ["jest.js", "batch-55"],
      }),
    ).toEqual({
      commandLine: root.commandLine,
      creationTime: root.creationTime,
      parentPid: root.parentPid,
      pid: root.pid,
    });
    expect(
      lockWindowsRootProcessIdentity({
        snapshots: [root],
        rootPid: 100,
        runnerPid: 11,
        expectedCommandFragments: ["jest.js"],
      }),
    ).toBeNull();
  });

  it("counts only descendants created after their locked parent identity", () => {
    const root = snapshot(100, 10, "20260730100000.000000+000", "node jest.js batch-55");
    const child = snapshot(101, 100, "20260730100001.000000+000", "node worker");
    const grandchild = snapshot(102, 101, "20260730100002.000000+000", "node helper");
    const staleEmulator = snapshot(
      103,
      100,
      "20260729090000.000000+000",
      "emulator.exe Pixel_7_API_34",
    );
    const unrelated = snapshot(200, 20, "20260730100003.000000+000", "node unrelated");
    expect(
      collectLockedWindowsProcessTree(
        [root, child, grandchild, staleEmulator, unrelated],
        root,
      ).map((item) => item.pid),
    ).toEqual([100, 101, 102]);
  });

  it("rejects a reused PID when creation time no longer matches", () => {
    const locked = snapshot(100, 10, "20260730100000.000000+000", "node jest.js");
    const reused = snapshot(100, 10, "20260730110000.000000+000", "node jest.js");
    expect(collectLockedWindowsProcessTree([reused], locked)).toEqual([]);
  });

  it("builds a bounded, atomic, fail-closed production monitor", () => {
    const script = buildWindowsCurrentCoreMemoryMonitorScript({
      evidencePath: "C:\\temp\\batch-55.memory.json",
      expectedCommandFragments: ["jest.js", "batch-55.json.tmp"],
      graceMs: 2_000,
      maxDurationMs: 30_000,
      readyPath: "C:\\temp\\batch-55.memory.ready.json",
      rootPid: 100,
      runnerPid: 10,
    });
    expect(script).toContain("CreationDate");
    expect(script).toContain("ROOT_COMMAND_IDENTITY_MISMATCH");
    expect(script).toContain("MEMORY_MONITOR_DEADLINE_EXCEEDED");
    expect(script).toContain("PROCESS_SNAPSHOT_UNAVAILABLE");
    expect(script).toContain("current-core-memory-monitor-handshake-v1");
    expect(script).toContain("Write-MonitorReady $true");
    expect(script).toContain("writer_complete=$true");
    expect(script).toContain("Move-Item -LiteralPath $temporaryPath");
    expect(script).not.toContain("Stop-Process");
  });

  it("exits after the real root and descendants, preserves unrelated processes, and closes atomic evidence", async () => {
    if (process.platform !== "win32") {
      expect(process.platform).not.toBe("win32");
      return;
    }
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "current-core-memory-monitor-"),
    );
    const evidencePath = path.join(directory, "batch-55.memory.json");
    const readyPath = path.join(directory, "batch-55.memory.ready.json");
    const childScriptPath = path.join(directory, "owned-jest-child.mjs");
    const wrapperPath = path.join(
      process.cwd(),
      "scripts/release/currentCoreJestBatchRoot.mjs",
    );
    fs.writeFileSync(
      childScriptPath,
      "setTimeout(() => process.stdout.write('OWNED_CHILD_COMPLETE'), 1500);\n",
      "utf8",
    );
    const unrelated = spawn(
      process.execPath,
      ["-e", "setTimeout(() => {}, 10000)", "unrelated-owner-token"],
      { stdio: "ignore", windowsHide: true },
    );
    const root = spawn(
      process.execPath,
      [
        wrapperPath,
        readyPath,
        childScriptPath,
        "current-core-monitor-child-token",
      ],
      { stdio: "ignore", windowsHide: true },
    );
    const monitor = startWindowsCurrentCoreMemoryMonitor({
      cwd: process.cwd(),
      evidencePath,
      expectedCommandFragments: [
        "currentCoreJestBatchRoot.mjs",
        "owned-jest-child.mjs",
      ],
      graceMs: 250,
      maxDurationMs: 10_000,
      readyPath,
      rootPid: root.pid!,
      runnerPid: process.pid,
    });
    try {
      await close(root);
      expect(await close(monitor)).toBe(0);
      const evidence = JSON.parse(
        fs.readFileSync(evidencePath, "utf8"),
      ) as Record<string, unknown>;
      expect(evidence.status).toBe("COMPLETE");
      expect(evidence.writer_complete).toBe(true);
      expect(Number(evidence.memory_peak_bytes)).toBeGreaterThan(0);
      expect(Number(evidence.descendants_observed)).toBeGreaterThanOrEqual(1);
      expect(fs.existsSync(`${evidencePath}.tmp`)).toBe(false);
      expect(
        JSON.parse(fs.readFileSync(readyPath, "utf8")),
      ).toEqual(
        expect.objectContaining({
          locked: true,
          writer_complete: true,
        }),
      );
      expect(fs.existsSync(`${readyPath}.tmp`)).toBe(false);
      expect(unrelated.exitCode).toBeNull();
    } finally {
      unrelated.kill();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }, 20_000);

  it("returns infrastructure RED on identity failure without stopping the root", async () => {
    if (process.platform !== "win32") {
      expect(process.platform).not.toBe("win32");
      return;
    }
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "current-core-memory-monitor-red-"),
    );
    const evidencePath = path.join(directory, "batch.memory.json");
    const readyPath = path.join(directory, "batch.memory.ready.json");
    const root = spawn(
      process.execPath,
      ["-e", "setTimeout(() => {}, 10000)", "real-root-token"],
      { stdio: "ignore", windowsHide: true },
    );
    const monitor = startWindowsCurrentCoreMemoryMonitor({
      cwd: process.cwd(),
      evidencePath,
      expectedCommandFragments: ["wrong-root-token"],
      maxDurationMs: 2_000,
      readyPath,
      rootPid: root.pid!,
      runnerPid: process.pid,
    });
    try {
      expect(await close(monitor)).toBe(0);
      const evidence = JSON.parse(
        fs.readFileSync(evidencePath, "utf8"),
      ) as Record<string, unknown>;
      expect(evidence.status).toBe("INFRASTRUCTURE_RED");
      expect(evidence.blocker).toBe("ROOT_COMMAND_IDENTITY_MISMATCH");
      expect(JSON.parse(fs.readFileSync(readyPath, "utf8"))).toEqual(
        expect.objectContaining({
          blocker: "ROOT_COMMAND_IDENTITY_MISMATCH",
          locked: false,
          writer_complete: true,
        }),
      );
      expect(root.exitCode).toBeNull();
    } finally {
      root.kill();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }, 10_000);

  it("keeps batch 55 self-closing with no manual monitor kill", () => {
    const runner = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runCurrentCoreRemediation153.ts"),
      "utf8",
    );
    expect(runner).toContain("startWindowsCurrentCoreMemoryMonitor");
    expect(runner).toContain("currentCoreJestBatchRoot.mjs");
    expect(runner).toContain("readyPath: monitorReadyPath");
    expect(runner).toContain("await monitorClosed");
    expect(runner).not.toContain("Stop-Process");
  });
});
