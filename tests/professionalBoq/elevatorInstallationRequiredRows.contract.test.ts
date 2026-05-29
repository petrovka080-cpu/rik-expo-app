import { dynamicBoq, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("elevator installation required rows", () => {
  it("contains elevator-specific equipment, labor and handover rows", () => {
    const text = dynamicBoq(UNIVERSAL_PROMPTS.elevator).rows.map((row) => row.name).join("\n").toLocaleLowerCase("ru-RU");
    for (const token of [
      "обследование шахты",
      "обмеры по 14 остановкам",
      "пассажирская кабина",
      "лебёдка / привод",
      "станция управления",
      "двери шахты",
      "направляющие кабины",
      "пнр",
      "инспекция / сдача",
      "доставка / логистика",
    ]) {
      expect(text).toContain(token);
    }
  });
});
