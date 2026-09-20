import {
  parseCanonicalCatalogSearchIntent,
  relaxedCanonicalCatalogSearchTokens,
} from "./catalogSearchIntent";

describe("canonical catalog search intent", () => {
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

  it("does not turn bare geometry into a catalog token", () => {
    const intent = parseCanonicalCatalogSearchIntent("200 × 32 м", null, []);
    expect(intent.tokens).toEqual([]);
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
