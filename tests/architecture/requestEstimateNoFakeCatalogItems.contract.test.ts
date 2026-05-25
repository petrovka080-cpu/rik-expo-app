import { readRequestEstimateRuntimeSource } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate no fake catalog items", () => {
  it("does not invent stock, suppliers, availability or fake catalog rows", () => {
    const source = readRequestEstimateRuntimeSource();
    expect(source).not.toMatch(/fakeStock(?!Found)|fakeAvailability(?!Found)|fakeSupplier(?!Found)|const\s+fakeSources|fake catalog/i);
    expect(source).not.toMatch(/stock\s*:/);
    expect(source).not.toMatch(/availability\s*:/);
  });
});
