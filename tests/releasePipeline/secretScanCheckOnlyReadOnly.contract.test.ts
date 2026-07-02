import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("closeout secret scan check-only mode", () => {
  it("does not overwrite an existing tracked secret_scan artifact", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rik-secret-scan-"));
    const secretScanPath = path.join(tempDir, "secret_scan.json");
    const existingSecretScan = `${JSON.stringify({
      final_status: "GREEN_RELEASE_SECRET_SCAN_READY",
      scanned_files: 28770,
      matches: [],
      secrets_written_to_artifacts: false,
      fake_green_claimed: false,
    }, null, 2)}\n`;

    fs.writeFileSync(secretScanPath, existingSecretScan, "utf8");
    fs.writeFileSync(path.join(tempDir, "proof.md"), "proof artifact\n", "utf8");

    const result = spawnSync(
      "node",
      [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/release/scanCloseoutArtifactsForSecrets.ts",
        tempDir,
        "--check-only",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        shell: process.platform === "win32",
      },
    );

    try {
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        secrets_written_to_artifacts: false,
        fake_green_claimed: false,
      });
      expect(fs.readFileSync(secretScanPath, "utf8")).toBe(existingSecretScan);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
