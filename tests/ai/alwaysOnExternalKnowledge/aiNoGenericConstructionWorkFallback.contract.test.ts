import { resolveConstructionWorkType } from "../../../src/lib/ai/estimateEngine";

describe("AI no generic construction work fallback", () => {
  it("classifies common work types specifically", () => {
    expect(resolveConstructionWorkType("паркет 100 м²")).toBe("parquet_flooring");
    expect(resolveConstructionWorkType("ламинат 100 м²")).toBe("laminate_flooring");
    expect(resolveConstructionWorkType("асфальт 100 м²")).toBe("asphalt_paving");
    expect(resolveConstructionWorkType("штукатурка 200 м²")).toBe("plastering");
  });
});
