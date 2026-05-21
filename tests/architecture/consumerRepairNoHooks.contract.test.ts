import * as fs from "fs";
import * as path from "path";

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("consumer repair no hooks architecture contract", () => {
  it("does not add hook-driven consumer UI hacks", () => {
    const source = [
      "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
      "src/features/consumerRepair/ConsumerRepairDraftPanel.tsx",
      "src/features/consumerRepair/ConsumerRepairMediaButtons.tsx",
    ].map(read).join("\n");

    expect(source).not.toMatch(/\buseEffect\b/);
    expect(source).not.toMatch(/\buseState\b/);
    expect(source).not.toMatch(/\buseMemo\b/);
    expect(source).not.toMatch(/\buseCallback\b/);
  });
});
