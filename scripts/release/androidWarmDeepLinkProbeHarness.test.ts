import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  redactProbeText,
  runTerminalProbeCase,
  writeJsonAtomic,
} from "./androidWarmDeepLinkProbeHarness";

describe("android warm deep-link probe harness", () => {
  it("redacts credentials and email addresses from captured output", () => {
    const redacted = redactProbeText(
      "Authorization: Bearer abc.def password=hunter2 owner@example.com",
    );
    expect(redacted).not.toContain("abc.def");
    expect(redacted).not.toContain("hunter2");
    expect(redacted).not.toContain("owner@example.com");
    expect(redacted).toContain("[redacted");
  });

  it("atomically replaces a terminal JSON artifact", () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "rik-android-probe-"),
    );
    const artifactPath = path.join(directory, "terminal.json");
    writeJsonAtomic(artifactPath, { terminal: true, status: "RED" });
    writeJsonAtomic(artifactPath, { terminal: true, status: "PASS" });
    expect(JSON.parse(fs.readFileSync(artifactPath, "utf8"))).toEqual({
      terminal: true,
      status: "PASS",
    });
    expect(fs.readdirSync(directory)).toEqual(["terminal.json"]);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("writes terminal ERROR and runs cleanup when execution throws", async () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "rik-android-probe-"),
    );
    const artifactPath = path.join(directory, "terminal.json");
    let cleaned = false;
    const result = await runTerminalProbeCase({
      artifactPath,
      runId: "unit-run",
      caseId: "exception",
      launchId: "unit-launch",
      timeoutMs: 2_000,
      execute: async () => {
        throw new Error("deterministic_exception");
      },
      cleanup: async () => {
        cleaned = true;
        return { ok: true, detail: "cleanup_green" };
      },
    });

    expect(result.status).toBe("ERROR");
    expect(result.terminal).toBe(true);
    expect(result.cleanup).toEqual({
      attempted: true,
      ok: true,
      detail: "cleanup_green",
    });
    expect(cleaned).toBe(true);
    expect(JSON.parse(fs.readFileSync(artifactPath, "utf8"))).toMatchObject({
      terminal: true,
      status: "ERROR",
    });
    fs.rmSync(directory, { recursive: true, force: true });
  });
});
