import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function gitStatus(): string {
  return spawnSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  }).stdout.replace(/\r\n/g, "\n");
}

describe("closeout read-only contract", () => {
  it("defaults selected-work closeout to verify mode", () => {
    const source = fs.readFileSync(
      path.join(PROJECT_ROOT, "scripts/e2e/runRequestEstimateProductionSafeSelectedWorkCatalogUxCloseout.ts"),
      "utf8",
    );

    expect(source).toContain('?? "verify"');
    expect(source).toContain("verifyExistingCloseoutReadOnly");
    expect(source).toContain("--mode must be refresh or verify");
  });

  it("does not dirty the worktree when the selected-work closeout verifier runs", () => {
    const before = gitStatus();
    const result = spawnSync(
      "node",
      ["node_modules/tsx/dist/cli.mjs", "scripts/e2e/runRequestEstimateProductionSafeSelectedWorkCatalogUxCloseout.ts"],
      {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        shell: process.platform === "win32",
        timeout: 30_000,
      },
    );
    const after = gitStatus();

    expect(result.status).toBe(0);
    expect(after).toBe(before);
  });
});
