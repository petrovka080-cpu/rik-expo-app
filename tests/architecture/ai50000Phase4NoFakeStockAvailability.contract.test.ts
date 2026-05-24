import { sourceText } from "./ai50000Phase4TestHelpers";

describe("AI 50000 Phase 4 no fake stock or availability", () => {
  it("does not introduce fake stock, supplier or availability", () => {
    const source = sourceText();
    expect(source).not.toContain("const fakeStock");
    expect(source).not.toContain("const fakeSupplier");
    expect(source).not.toContain("const fakeAvailability");
  });
});
