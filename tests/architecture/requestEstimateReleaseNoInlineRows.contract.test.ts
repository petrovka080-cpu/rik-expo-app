import { readRequestEstimateRuntimeSource } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate release no inline rows", () => {
  it("does not hardcode BOQ rows inside request UI components", () => {
    expect(readRequestEstimateRuntimeSource()).not.toMatch(/\binline(?:Estimate|Foundation|Boq|BOQ)?Rows\b|\binlineGenericConstructionRows\b/);
  });
});
