import fs from "node:fs";
import path from "node:path";

import { repoRoot, safeActionsRoot } from "./aiSafeActionsArchitectureTestHelpers";

describe("AI safe actions no second AI framework", () => {
  it("uses the approved safeActions root only", () => {
    expect(fs.existsSync(safeActionsRoot)).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, "src", "features", "ai", "safeActions"))).toBe(false);
  });
});
