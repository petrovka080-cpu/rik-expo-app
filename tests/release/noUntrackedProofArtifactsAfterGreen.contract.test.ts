import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const matrixPath = path.resolve(process.cwd(), "artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_matrix.json");

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

describe("no untracked proof artifacts after green", () => {
  it("does not allow untracked worktree proof artifacts when green is claimed", () => {
    expect(fs.existsSync(matrixPath)).toBe(true);
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as Record<string, unknown>;
    if (matrix.final_status !== "GREEN_WORKTREE_CLEAN_COMMIT_PUSH_READY") return;

    const untracked = git(["ls-files", "--others", "--exclude-standard"])
      .split(/\r?\n/)
      .filter((filePath) => filePath.startsWith("artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_"));

    expect(untracked).toEqual([]);
  });
});
