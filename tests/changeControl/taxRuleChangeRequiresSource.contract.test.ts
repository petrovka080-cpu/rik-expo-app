import { validatePayload, validTaxPayload } from "./changeControlTestHelpers";

describe("change control - tax rule source", () => {
  it("blocks tax rules without a jurisdiction and source", () => {
    const { run } = validatePayload("TAX_RULE", "kg_standard_warning", validTaxPayload({
      jurisdiction: undefined,
      sourceId: undefined,
      sourceUrl: undefined,
    }));
    expect(run.status).toBe("failed");
    expect(run.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining([
      "TAX_JURISDICTION_MISSING",
      "TAX_SOURCE_MISSING",
    ]));
  });
});
