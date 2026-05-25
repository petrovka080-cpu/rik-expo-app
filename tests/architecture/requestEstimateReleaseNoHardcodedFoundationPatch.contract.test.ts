import { readRequestEstimateRuntimeSource } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate release no hardcoded foundation patch", () => {
  it("does not contain a foundation-only UI patch marker", () => {
    expect(readRequestEstimateRuntimeSource()).not.toMatch(/\bhardcodedFoundation(?:Only)?Patch\b|\bfoundationOnlyPatch\b/);
  });
});
