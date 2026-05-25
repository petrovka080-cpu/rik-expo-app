import fs from "node:fs";

describe("request state no screen-local calculation", () => {
  it("keeps estimate math out of request screen code", () => {
    const screen = fs.readFileSync("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx", "utf8");
    const payloadBuilder = fs.readFileSync("src/features/consumerRepair/buildRequestEstimatePayload.ts", "utf8");

    expect(screen).not.toMatch(/calculateEstimate|concreteVolume|length\s*\*\s*width\s*\*\s*height/i);
    expect(payloadBuilder).toContain("calculateRequestEstimateDraftTotals");
  });
});
