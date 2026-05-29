import fs from "node:fs";
import path from "node:path";

describe("universal estimator no useEffect answer rewrite", () => {
  it("does not rewrite AI answers inside useEffect", () => {
    const appSource = fs.readdirSync(path.join(process.cwd(), "app"), { recursive: true })
      .filter((file): file is string => typeof file === "string" && /\.(ts|tsx)$/.test(file))
      .map((file) => fs.readFileSync(path.join(process.cwd(), "app", file), "utf8"))
      .join("\n");
    expect(appSource).not.toMatch(/useEffect[\s\S]{0,500}(answerBuiltInAi|setAnswer|GlobalEstimateResult)/);
  });
});
