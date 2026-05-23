import fs from "node:fs";
import path from "node:path";

const matrixPath = path.resolve(process.cwd(), "artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_matrix.json");

describe("pushed branch required for green", () => {
  it("requires origin branch containment before green", () => {
    expect(fs.existsSync(matrixPath)).toBe(true);
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as Record<string, unknown>;

    if (matrix.final_status === "GREEN_WORKTREE_CLEAN_COMMIT_PUSH_READY") {
      expect(matrix.branch_pushed).toBe(true);
      expect(matrix.remote_contains_commit).toBe(true);
      expect(matrix.remote_branch).toEqual(expect.stringMatching(/^origin\/.+/));
    }
  });
});
