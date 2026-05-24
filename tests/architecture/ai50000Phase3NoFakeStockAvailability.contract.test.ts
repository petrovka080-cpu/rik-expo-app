import { sourceText } from "./ai50000Phase3TestHelpers";

describe("AI 50000 Phase 3 no fake stock or availability", () => {
  it("does not add fake stock/supplier/availability fields", () => {
    expect(sourceText()).not.toContain("const fakeStock =");
    expect(sourceText()).not.toContain("const fakeSupplier =");
    expect(sourceText()).not.toContain("const fakeAvailability =");
  });
});
