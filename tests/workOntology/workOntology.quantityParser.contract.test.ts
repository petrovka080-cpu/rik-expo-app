import { parseWorkOntologyQuantityUnit } from "./workOntologyTestHelpers";

describe("work ontology quantity parser", () => {
  it("extracts supported construction units without changing work type", () => {
    expect(parseWorkOntologyQuantityUnit("120 \u043c2")).toEqual({ quantity: 120, unit: "m2" });
    expect(parseWorkOntologyQuantityUnit("30 \u043c3")).toEqual({ quantity: 30, unit: "m3" });
    expect(parseWorkOntologyQuantityUnit("18 \u043f\u043e\u0433. \u043c")).toEqual({ quantity: 18, unit: "linear_m" });
    expect(parseWorkOntologyQuantityUnit("15 \u0448\u0442")).toEqual({ quantity: 15, unit: "piece" });
    expect(parseWorkOntologyQuantityUnit("1 \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442")).toEqual({ quantity: 1, unit: "set" });
  });
});
