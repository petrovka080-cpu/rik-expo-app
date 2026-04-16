import { isCorruptedText, normalizeRuText } from "./encoding";

describe("Russian text encoding normalization", () => {
  it("does not alter valid Russian, Latin, or mixed PDF text", () => {
    const validSamples = [
      "Вернитесь в приложение, когда закончите, или откройте документ ещё раз отсюда.",
      "Документ открыт во внешнем PDF-приложении",
      "Счёт № INV-42",
      "Object A · Этаж 2 · PDF",
    ];

    for (const sample of validSamples) {
      expect(isCorruptedText(sample)).toBe(false);
      expect(normalizeRuText(sample)).toBe(sample);
    }
  });

  it("repairs the selected mojibake regression samples", () => {
    expect(normalizeRuText("РћС‚РєСЂС‹РІР°РµС‚СЃСЏ...")).toBe("Открывается...");
    expect(normalizeRuText("РџРѕРґРµР»РёС‚СЊСЃСЏ")).toBe("Поделиться");
  });
});
