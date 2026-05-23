import fs from "node:fs";
import path from "node:path";

const classificationPath = path.resolve(process.cwd(), "artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_change_classification.json");

describe("no unknown dirty files", () => {
  it("classifies every dirty file without unknown blockers", () => {
    expect(fs.existsSync(classificationPath)).toBe(true);
    const entries = JSON.parse(fs.readFileSync(classificationPath, "utf8")) as Array<{ classification?: string; path?: string }>;
    const unknown = entries.filter((entry) => entry.classification === "unknown_blocker");

    expect(unknown).toEqual([]);
  });
});
