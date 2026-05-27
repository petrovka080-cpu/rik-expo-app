import { sourceHasExactPromptLookup } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 no exact prompt lookup", () => {
  it("keeps exact prompt lookup out of the product engine", () => {
    expect(sourceHasExactPromptLookup()).toBe(false);
  });
});
