import { isCorruptedText, normalizeRuText } from "./encoding";

describe("Russian text encoding normalization", () => {
  it("does not alter valid Russian, Latin, or mixed PDF text", () => {
    const validSamples = [
      "Вернитесь в приложение, когда закончите, или откройте документ ещё раз отсюда.",
      "Документ открыт во внешнем PDF-приложении",
      "Счёт № INV-42",
      "Object A · Этаж 2 · PDF",
    ];

    validSamples.push(
      "\u041d\u0414\u0421 \u041a\u044b\u0440\u0433\u044b\u0437\u0441\u0442\u0430\u043d",
      "1\u00a0160\u00a0343 \u0441\u043e\u043c",
    );

    for (const sample of validSamples) {
      expect(isCorruptedText(sample)).toBe(false);
      expect(normalizeRuText(sample)).toBe(sample);
    }
  });

  it("repairs the selected mojibake regression samples", () => {
    expect(normalizeRuText("РћС‚РєСЂС‹РІР°РµС‚СЃСЏ...")).toBe("Открывается...");
    expect(normalizeRuText("РџРѕРґРµР»РёС‚СЊСЃСЏ")).toBe("Поделиться");
  });
  it("repairs mojibake where the D0 A0 byte pair is rendered with NBSP", () => {
    const samples = [
      {
        input:
          "\u0420\u00a0\u0420\u00b0\u0421\u0403\u0421\u2026\u0420\u0455\u0420\u0491\u0420\u0405\u0420\u0451\u0420\u0454\u0420\u0451",
        expected: "\u0420\u0430\u0441\u0445\u043e\u0434\u043d\u0438\u043a\u0438",
      },
      {
        input:
          "\u0420\u00a0\u0420\u00b0\u0420\u00b7\u0421\u0402\u0420\u00b0\u0420\u00b1\u0420\u0455\u0421\u201a\u0420\u0454\u0420\u00b0",
        expected: "\u0420\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u043a\u0430",
      },
    ];

    for (const sample of samples) {
      expect(isCorruptedText(sample.input)).toBe(true);
      expect(normalizeRuText(sample.input)).toBe(sample.expected);
      expect(normalizeRuText(sample.input)).not.toContain("\ufffd");
    }
  });
});
