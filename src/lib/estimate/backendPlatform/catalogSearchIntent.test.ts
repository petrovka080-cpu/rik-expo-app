import {
  parseCanonicalCatalogSearchIntent,
  relaxedCanonicalCatalogSearchTokens,
} from "./catalogSearchIntent";

describe("canonical catalog search intent", () => {
  it.each(['13 m2', '13 m²', '13M2', '13м2'])('recognizes Latin/Cyrillic area %s without losing product identity', measure => {
    const intent = parseCanonicalCatalogSearchIntent('Шпаклевка CT127 ' + measure, null, []);
    expect(intent.quantity).toBe(13);expect(intent.unit).toBe('м²');expect(intent.searchText).toBe('шпаклевка ct127');
  });
  it.each(["x", "х", "×", "*"])("removes %s bridge dimensions from ranking and keeps their area", (separator) => {
    const intent = parseCanonicalCatalogSearchIntent(
      `асфальтирование моста 200 ${separator} 32 м`,
      null,
      [],
    );

    expect(intent.searchText).toBe("асфальтирование моста");
    expect(intent.tokens).toEqual(["асфальтирование моста"]);
    expect(intent.quantity).toBe(6_400);
    expect(intent.unit).toBe("м²");
    expect(intent.dimensions).toEqual({ lengthM: 200, widthM: 32, areaM2: 6_400 });
  });

  it("preserves the existing scalar quantity contract", () => {
    const intent = parseCanonicalCatalogSearchIntent("укладка асфальта 1 500 м²", null, []);

    expect(intent.searchText).toBe("укладка асфальта");
    expect(intent.quantity).toBe(1_500);
    expect(intent.unit).toBe("м²");
    expect(intent.dimensions).toBeNull();
  });

  it("extracts a scalar quantity before ordinary sentence punctuation", () => {
    const intent = parseCanonicalCatalogSearchIntent(
      "Нужна полная смета плитного фундамента 500 м².",
      null,
      [],
    );

    expect(intent.searchText).toBe("нужна полная смета плитного фундамента");
    expect(intent.quantity).toBe(500);
    expect(intent.unit).toBe("м²");
  });

  it("extracts dimensions before ordinary sentence punctuation", () => {
    const intent = parseCanonicalCatalogSearchIntent(
      "асфальтирование площадки 30 × 20 м;",
      null,
      [],
    );

    expect(intent.searchText).toBe("асфальтирование площадки");
    expect(intent.quantity).toBe(600);
    expect(intent.unit).toBe("м²");
    expect(intent.dimensions).toEqual({ lengthM: 30, widthM: 20, areaM2: 600 });
  });

  it("does not turn bare geometry into a catalog token", () => {
    const intent = parseCanonicalCatalogSearchIntent("200 × 32 м", null, []);
    expect(intent.tokens).toEqual([]);
  });

  it("does not interpret a cable core and cross-section designation as geometry", () => {
    const intent = parseCanonicalCatalogSearchIntent(
      "Прокладка силового кабеля ВВГнг(А)-LS 5×6 мм², длина трассы 150 м.",
      null,
      [],
    );

    expect(intent.quantity).toBe(150);
    expect(intent.unit).toBe("м");
    expect(intent.dimensions).toBeNull();
    expect(intent.searchText).toContain("5 6 мм²");
  });

  it("keeps work-identity terms but drops geometry labels and bare values for relaxed suggestions", () => {
    expect(relaxedCanonicalCatalogSearchTokens(
      "Монтаж и заземление серверных шкафов 42U, глубина 1200 мм, количество 6 шт.",
    )).toEqual([
      "монт",
      "зазе",
      "серв",
      "шкаф",
      "42u",
    ]);
  });
});
