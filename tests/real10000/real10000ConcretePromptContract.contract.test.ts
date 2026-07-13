import { evaluateReal10000Case } from "../../scripts/e2e/real10000AcceptanceCore";
import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

const genericConcreteDomains = new Set([
  "non_residential_industrial_floors",
  "small_bridge_works",
  "industrial_floors",
]);

function caseById(caseId: string) {
  const item = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.find((entry) => entry.caseId === caseId);
  if (!item) throw new Error(`Missing Real10000 case ${caseId}`);
  return item;
}

test("real 10000 generic concrete prompts do not describe concrete slabs", () => {
  const genericConcreteCases = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) =>
    genericConcreteDomains.has(item.domain) &&
    item.expectedObject === "concrete_element" &&
    item.expectedMethod === "concrete_rebar_formwork",
  );

  expect(genericConcreteCases).toHaveLength(300);
  expect(genericConcreteCases.map((item) => item.promptRu)).not.toEqual(
    expect.arrayContaining([
      expect.stringMatching(/бетонн[а-яё]*\s+плит|плита\s+\d/i),
    ]),
  );
});

test("real 10000 generic concrete samples resolve to the generic concrete contract", () => {
  for (const item of [
    caseById("real10000_01801_non_residential_industrial_floors_001"),
    caseById("real10000_05001_small_bridge_works_001"),
    caseById("real10000_08101_industrial_floors_001"),
  ]) {
    const result = evaluateReal10000Case(item, { includePdf: false });
    expect(result.object).toBe("concrete_element");
    expect(result.method).toBe("concrete_rebar_formwork");
    expect(result.requiredRowsMissing).toEqual([]);
    expect(result.failures).toEqual([]);
  }
});

test("real 10000 concrete pedestal prompts use the pedestal-specific contract", () => {
  const item = caseById("real10000_01601_concrete_pedestals_001");
  const result = evaluateReal10000Case(item, { includePdf: false });

  expect(item.expectedObject).toBe("concrete_pedestal");
  expect(item.expectedOperation).toBe("pour");
  expect(item.expectedMethod).toBe("concrete_pedestal_pour");
  expect(item.requiredRowTokens).toEqual(expect.arrayContaining([
    "арматурный каркас",
    "подача / укладка бетона",
  ]));
  expect(result.object).toBe("concrete_pedestal");
  expect(result.operation).toBe("pour");
  expect(result.method).toBe("concrete_pedestal_pour");
  expect(result.requiredRowsMissing).toEqual([]);
  expect(result.failures).toEqual([]);
});
