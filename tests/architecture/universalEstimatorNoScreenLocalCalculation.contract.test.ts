import fs from "node:fs";
import path from "node:path";

describe("universal estimator no screen-local calculation", () => {
  it("keeps estimator calculation outside screens", () => {
    const appSource = fs.readdirSync(path.join(process.cwd(), "app"), { recursive: true })
      .filter((file): file is string => typeof file === "string" && /\.(ts|tsx)$/.test(file))
      .map((file) => fs.readFileSync(path.join(process.cwd(), "app", file), "utf8"))
      .join("\n");
    expect(appSource).not.toMatch(/compileDynamicProfessionalBoq|buildEstimatorReasoningPlan|resolveEstimatorOutcome/);
  });
});
