import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildProofRunManifestPath, writeProofRunManifest } from "../../scripts/release/proofRunManifest";

describe("proof run manifests", () => {
  it("writes ignored run manifests under artifacts/_runs", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "proof-run-manifest-"));
    const startedAt = "2026-06-10T12:30:00.000Z";
    const manifestPath = buildProofRunManifestPath({
      artifactsRoot: root,
      startedAt,
      wave: "S_TEST_WAVE",
    });

    expect(manifestPath.replace(/\\/g, "/")).toContain("artifacts/_runs".replace("artifacts", path.basename(root)));

    const written = writeProofRunManifest(
      {
        run_id: "2026-06-10T12-30-00Z_S_TEST_WAVE",
        wave: "S_TEST_WAVE",
        command: "npx tsx scripts/e2e/run-test.ts --mode=refresh",
        mode: "refresh",
        started_at: startedAt,
        finished_at: "2026-06-10T12:31:00.000Z",
        duration_ms: 60_000,
        exit_code: 0,
        head: "abc123",
        pid: 12345,
        stdout_log: null,
        stderr_log: null,
        fake_green_claimed: false,
      },
      root,
    );

    const parsed = JSON.parse(fs.readFileSync(written, "utf8")) as Record<string, unknown>;
    expect(written).toBe(manifestPath);
    expect(parsed.fake_green_claimed).toBe(false);
    expect(parsed.mode).toBe("refresh");
  });
});
