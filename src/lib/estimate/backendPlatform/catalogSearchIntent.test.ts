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

  it.each([
    ["Установка скамеек 10 шт.", "установка скамеек", 10, "шт"],
    ["Установка урн 12 шт., бетонных", "установка урн бетонных", 12, "шт"],
    ["Наружное освещение 20 шт!", "наружное освещение", 20, "шт"],
    ["Тротуарная плитка 500 м².", "тротуарная плитка", 500, "м²"],
    ["Водоотводные лотки 120 м; бетонные", "водоотводные лотки бетонные", 120, "м"],
    ["Площадка 1 500,5 кв. м.", "площадка", 1500.5, "м²"],
    ["Покрытие 25 м2?", "покрытие", 25, "м²"],
    ["Лотки (120 м)", "лотки", 120, "м"],
    ["Скамейки «10 шт»", "скамейки", 10, "шт"],
  ] as const)("keeps a punctuated short scope out of search ranking: %s", (prompt, searchText, quantity, unit) => {
    const intent = parseCanonicalCatalogSearchIntent(prompt, null, []);
    expect(intent).toMatchObject({ searchText, quantity, unit, dimensions: null });
    expect(intent.tokens).toEqual([searchText]);
  });

  it.each(["x", "х", "×", "*"])("accepts punctuation after %s dimensions", (separator) => {
    const intent = parseCanonicalCatalogSearchIntent(`Тротуар 20 ${separator} 3 м.`, null, []);
    expect(intent).toMatchObject({
      searchText: "тротуар", quantity: 60, unit: "м²",
      dimensions: { lengthM: 20, widthM: 3, areaM2: 60 },
    });
    expect(intent.tokens).toEqual(["тротуар"]);
  });

  it.each([
    ["Тротуар 20 x 3.", 60],
    ["Тротуар 20 x 3,5 м.", 70],
  ] as const)("keeps numeric boundaries with decimal or trailing punctuation: %s", (prompt, area) => {
    const intent = parseCanonicalCatalogSearchIntent(prompt, null, []);
    expect(intent.quantity).toBe(area);
    expect(intent.searchText).toBe("тротуар");
  });

  it.each(["120 мм", "120 м³", "120 м3", "120 м/с", "120 м-с", "10 шт/м²", "2 т/м3", "20 x 3 мм", "20 x 30 мм", "20 x 3,5 см", "20 x 3 м/с"])(
    "does not truncate an unsupported unit into a supported scope: %s",
    (scope) => {
      const intent = parseCanonicalCatalogSearchIntent(`Материал ${scope}`, null, []);
      expect(intent.quantity).toBeNull();
      expect(intent.unit).toBeNull();
      expect(intent.dimensions).toBeNull();
    },
  );

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
