import { evaluateReal10000Case } from "../../scripts/e2e/real10000AcceptanceCore";
import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

function firstCase(domain: string) {
  const item = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.find(
    (entry) => entry.domain === domain,
  );
  if (!item) throw new Error(`Missing Real10000 electrical domain ${domain}`);
  return item;
}

describe("real 10000 canonical electrical compatibility", () => {
  it.each([
    "electrical_installation",
    "industrial_electrical",
    "power_lines",
    "street_lighting",
    "high_voltage",
  ])("keeps required professional rows visible for %s", (domain) => {
    const item = firstCase(domain);
    const result = evaluateReal10000Case(item, { includePdf: false });

    expect(result.requiredRowsMissing).toEqual([]);
    expect(result.requiredRowsFound).toEqual(
      expect.arrayContaining([
        "кабельные линии",
        "щит и автоматика",
        "разметка электрических трасс",
        "прокладка кабеля",
        "штроборез",
      ]),
    );
    expect(result.failures).toEqual([]);
  });
});
