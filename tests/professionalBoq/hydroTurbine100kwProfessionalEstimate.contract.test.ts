import { buildWorldEngineEstimate, expectNoForbiddenWorldRows, expectTokens, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("hydro turbine 100 kW BOQ", () => {
  it("contains professional hydropower equipment, electrical, logistics and commissioning rows", () => {
    const estimate = buildWorldEngineEstimate(WORLD_PROMPTS.hydroTurbine);

    expectNoForbiddenWorldRows(estimate);
    expectTokens(estimate, [
      "обследование площадки",
      "гидравлический расчёт",
      "турбина",
      "генератор",
      "рама",
      "муфта",
      "виброопоры",
      "шкаф управления",
      "PLC",
      "синхронизация",
      "щит 0,4",
      "силовые кабели",
      "такелаж",
      "монтаж",
      "ПНР",
      "обучение",
      "резерв",
    ], 12);
    expect(estimate.clarifyingQuestions.join("\n")).toMatch(/напор|расход|труба|трансформатор|лэп/i);
  });
});
