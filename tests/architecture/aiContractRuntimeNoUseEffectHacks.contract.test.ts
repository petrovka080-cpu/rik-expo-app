import { readContractRuntimeText } from "./aiContractRuntimeArchitectureTestHelpers";

describe("AI contract runtime no useEffect hacks", () => {
  it("does not hide AI runtime validation in useEffect", () => {
    expect(readContractRuntimeText()).not.toMatch(/\buseEffect\s*\(/);
  });
});
