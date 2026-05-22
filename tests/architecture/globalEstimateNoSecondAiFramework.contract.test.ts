import fs from "node:fs";
import path from "node:path";

import { AI_ENTERPRISE_ALLOWED_LAYERS } from "../../src/lib/ai/enterpriseGuardrails";

const root = process.cwd();

describe("global estimate no second AI framework", () => {
  it("uses the approved globalEstimate AI layer and old estimateEngine export path", () => {
    expect(AI_ENTERPRISE_ALLOWED_LAYERS).toContainEqual(expect.objectContaining({
      layer: "globalEstimate",
      root: "src/lib/ai/globalEstimate",
      screenMayImportDirectly: false,
    }));
    expect(fs.existsSync(path.join(root, "src", "lib", "ai2"))).toBe(false);
    expect(fs.readFileSync(path.join(root, "src", "lib", "ai", "estimateEngine", "index.ts"), "utf8")).toContain("../globalEstimate");
  });
});
