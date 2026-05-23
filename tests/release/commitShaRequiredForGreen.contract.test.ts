import fs from "node:fs";
import path from "node:path";

const matrixPath = path.resolve(process.cwd(), "artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_matrix.json");

describe("commit sha required for green", () => {
  it("requires a real commit SHA before the worktree proof can be green", () => {
    expect(fs.existsSync(matrixPath)).toBe(true);
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as Record<string, unknown>;

    if (matrix.final_status === "GREEN_WORKTREE_CLEAN_COMMIT_PUSH_READY") {
      expect(matrix.commit_created).toBe(true);
      expect(matrix.commit_sha).toEqual(expect.stringMatching(/^[0-9a-f]{40}$/));
    }
  });
});
