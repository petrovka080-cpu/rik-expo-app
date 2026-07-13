import { normalizeConstructionWorkAlias } from "../../src/lib/constructionWork/normalizeConstructionWorkAlias";
import { readArtifactJson, readText } from "./constructionWorkOntologyTestHelpers";

it("normalizes construction work aliases without AI calls", () => {
  const matrix = readArtifactJson<Record<string, unknown>>("normalization_matrix.json");
  const normalizerSource = readText("src/lib/constructionWork/normalizeConstructionWorkAlias.ts");

  expect(normalizeConstructionWorkAlias("  Ж/Б-плита, 25 м² ")).toBe("жб плита 25 м2");
  expect(normalizeConstructionWorkAlias("Кладка 10 кв. м")).toBe("кладка 10 м2");
  expect(normalizeConstructionWorkAlias("Труба 4 м.п.")).toBe("труба 4 пог м");
  expect(normalizeConstructionWorkAlias("3 штуки светильников")).toBe("3 шт светильников");
  expect(normalizeConstructionWorkAlias("Ёмкость--монтажные работы")).toBe("емкость монтаж");
  expect(normalizerSource).not.toMatch(/fetch\(|openai|anthropic|llm|semantic/i);
  expect(matrix).toEqual(
    expect.objectContaining({
      normalization_green: true,
      ai_call_used: false,
      fake_green_claimed: false,
    }),
  );
});
