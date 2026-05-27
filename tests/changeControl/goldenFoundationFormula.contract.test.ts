import { validatePayload, validFormulaPayload } from "./changeControlTestHelpers";

describe("golden change control - foundation formula", () => {
  it("requires foundation formula to use the approved formula DSL", () => {
    const { run } = validatePayload("FORMULA_RULE", "strip_foundation_volume", validFormulaPayload({
      formula: "length * width * depth",
      safeFormula: true,
    }));
    expect(run.status).toBe("passed");
  });
});
