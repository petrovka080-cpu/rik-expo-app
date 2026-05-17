import fs from "node:fs";
import path from "node:path";

import { listAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";

const root = path.join(process.cwd(), "src", "features", "ai", "screenMagic");

describe("AI screen magic no direct mutation", () => {
  it("keeps all buttons non-executable and source free of DB write primitives", () => {
    const packs = listAiScreenMagicPacks();
    const source = fs.readdirSync(root)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
      .join("\n");

    expect(packs.every((pack) => pack.buttons.every((button) => button.canExecuteDirectly === false))).toBe(true);
    expect(packs.every((pack) => pack.safety.directDangerousMutationAllowed === false)).toBe(true);
    expect(source).not.toMatch(/\.(insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/\.(insert|update|delete|upsert)\s*\(/);
  });
});
