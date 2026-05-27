import { buildWorldEngineEstimate, expectNoForbiddenWorldRows, expectTokens, rowText, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("roof waterproofing BOQ", () => {
  it("contains roof-specific waterproofing rows and excludes bathroom-only work", () => {
    const estimate = buildWorldEngineEstimate(WORLD_PROMPTS.roofWaterproofing);

    expectNoForbiddenWorldRows(estimate);
    expectTokens(estimate, [
      "очистка кровли",
      "ремонт локальных дефектов основания",
      "праймер",
      "рулонная гидроизоляция",
      "мембрана",
      "примыкания",
      "воронки",
      "герметизация узлов",
      "проверка герметичности",
      "доставка",
      "вывоз мусора",
      "резерв",
    ], 8);
    expect(rowText(estimate)).not.toMatch(/ванн|сануз|душев|плитка в ванной/i);
  });
});
