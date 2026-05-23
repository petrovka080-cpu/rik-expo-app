import fs from "node:fs";
import path from "node:path";

const matrixPath = path.resolve(process.cwd(), "artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_matrix.json");

function readMatrix(): Record<string, unknown> {
  expect(fs.existsSync(matrixPath)).toBe(true);
  return JSON.parse(fs.readFileSync(matrixPath, "utf8")) as Record<string, unknown>;
}

describe("worktree clean before green", () => {
  it("does not allow a green worktree proof while the final worktree is dirty", () => {
    const matrix = readMatrix();
    if (matrix.final_status === "GREEN_WORKTREE_CLEAN_COMMIT_PUSH_READY") {
      expect(matrix.final_worktree_clean).toBe(true);
    } else {
      expect(matrix.fake_green_claimed).toBe(false);
    }
  });
});
