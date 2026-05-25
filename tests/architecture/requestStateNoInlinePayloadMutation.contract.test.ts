import fs from "node:fs";

describe("request state no inline payload mutation", () => {
  it("uses immutable reducer and payload builders instead of mutating payload rows", () => {
    const source = [
      "src/features/consumerRepair/requestEstimateDraftReducer.ts",
      "src/features/consumerRepair/buildRequestEstimatePayload.ts",
    ].map((file) => fs.readFileSync(file, "utf8")).join("\n");

    expect(source).not.toMatch(/\.items\.push\(/);
    expect(source).not.toMatch(/payload\.items\[[^\]]+\]\s*=/);
    expect(source).toContain("map((item)");
    expect(source).toContain("filter((item)");
  });
});
