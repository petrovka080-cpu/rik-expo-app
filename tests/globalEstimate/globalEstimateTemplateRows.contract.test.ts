import { GLOBAL_ESTIMATE_TEMPLATE_ROWS } from "../../src/lib/ai/globalEstimate";

describe("global estimate template rows", () => {
  it("keeps professional BOQ line rows outside prompt text", () => {
    const laminateRows = GLOBAL_ESTIMATE_TEMPLATE_ROWS.filter((row) => row.workKey === "laminate_laying");
    expect(laminateRows.map((row) => row.rowNumber)).toEqual(expect.arrayContaining(["1.1", "1.2", "2.1", "2.3"]));
    expect(laminateRows.every((row) => row.rateKey && row.quantityFormula && row.names.en)).toBe(true);
  });
});
