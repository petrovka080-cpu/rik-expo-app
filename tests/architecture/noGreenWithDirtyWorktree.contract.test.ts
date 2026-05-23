import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const matrixPath = path.resolve(process.cwd(), "artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_matrix.json");

function gitStatusPorcelain(): string {
  return execFileSync("git", ["status", "--porcelain"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

describe("no green with dirty worktree", () => {
  it("blocks green if git status --porcelain is not empty", () => {
    expect(fs.existsSync(matrixPath)).toBe(true);
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as Record<string, unknown>;

    if (matrix.final_status === "GREEN_WORKTREE_CLEAN_COMMIT_PUSH_READY") {
      expect(gitStatusPorcelain()).toBe("");
      expect(matrix.final_worktree_clean).toBe(true);
    } else {
      expect(matrix.fake_green_claimed).toBe(false);
    }
  });
});
