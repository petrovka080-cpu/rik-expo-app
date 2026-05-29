import { dynamicBoq, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("concrete pedestal BOQ depth", () => {
  it("meets formula-based concrete minimum depth", () => {
    const boq = dynamicBoq(UNIVERSAL_PROMPTS.concretePedestals);
    expect(boq.rows.length).toBeGreaterThanOrEqual(18);
    expect(boq.rows.some((row) => row.name === "бетон" && row.unit === "m3" && row.quantity === 10.5)).toBe(true);
    expect(boq.rows.some((row) => row.name === "опалубка" && row.unit === "sq_m" && row.quantity === 90)).toBe(true);
  });
});
