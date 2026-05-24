import { sourceText } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 no fake stock availability", () => {
  it("does not create fake stock, supplier, or availability constants", () => {
    const source = sourceText();
    expect(source).not.toMatch(/\bconst\s+fakeStock\s*=/);
    expect(source).not.toMatch(/\bconst\s+fakeSupplier\s*=/);
    expect(source).not.toMatch(/\bconst\s+fakeAvailability\s*=/);
  });
});
