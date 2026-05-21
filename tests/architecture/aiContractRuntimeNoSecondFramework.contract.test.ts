import fs from "node:fs";
import path from "node:path";

import { repoRoot } from "./aiContractRuntimeArchitectureTestHelpers";

describe("AI contract runtime no second framework", () => {
  it("uses the approved contractRuntime root only", () => {
    const forbiddenRoots = ["src/lib/aiContractRuntime2", "src/lib/aiInvariantFramework", "src/features/aiContractRuntime"];
    expect(forbiddenRoots.filter((root) => fs.existsSync(path.join(repoRoot, root)))).toEqual([]);
  });
});
