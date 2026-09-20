import { normalizeCanonicalEstimateRowCategory } from "./canonicalEstimateRowCategory";

describe("canonical estimate row category normalization", () => {
  it.each([
    ["Механизмы и оборудование", "Механизмы", "equipment"],
    ["Испытания и контроль качества", "Контроль", "service"],
    ["Исполнительная документация", "Документы", "service"],
    ["Работы и труд", "Труд", "work"],
    ["Материалы", "Асфальтобетонная смесь", "material"],
    ["Доставка", "Транспорт", "delivery"],
  ])("maps %s / %s to %s", (section, category, expected) => {
    expect(normalizeCanonicalEstimateRowCategory(section, category)).toBe(expected);
  });
});
