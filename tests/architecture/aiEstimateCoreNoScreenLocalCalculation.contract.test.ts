import fs from "node:fs";
import path from "node:path";

describe("AI estimate screen calculation boundary", () => {
  it("does not calculate estimates locally in screen code", () => {
    const candidates = ["app/chat", "app/ai", "app/request", "src/features/consumerRepair"];
    const source = candidates
      .filter((item) => fs.existsSync(path.join(process.cwd(), item)))
      .flatMap((item) => fs.readdirSync(path.join(process.cwd(), item), { recursive: true }).map(String).map((file) => path.join(item, file)))
      .filter((file) => /\.(ts|tsx)$/.test(file) && fs.statSync(path.join(process.cwd(), file)).isFile())
      .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
      .join("\n");
    expect(source).not.toMatch(/screenLocalEstimate|localEstimateRows|fakeEstimateRows/i);
  });
});
