import fs from "node:fs";

describe("request state no useEffect rewrite", () => {
  it("does not add useEffect answer/payload rewrites to request estimate state files", () => {
    const source = [
      "src/features/consumerRepair/requestEstimateStateMachine.ts",
      "src/features/consumerRepair/requestEstimateDraftReducer.ts",
      "src/features/consumerRepair/buildRequestEstimatePayload.ts",
      "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    ].map((file) => fs.readFileSync(file, "utf8")).join("\n");

    expect(source).not.toMatch(/useEffect\s*\(\s*\(\)\s*=>\s*set/i);
    expect(source).not.toMatch(/setMessages\s*\(\s*prev\s*=>\s*rewrite/i);
  });
});
