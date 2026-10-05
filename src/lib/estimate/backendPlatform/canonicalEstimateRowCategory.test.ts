import { normalizeCanonicalEstimateRowCategory } from "./canonicalEstimateRowCategory";

describe("canonical estimate row category normalization", () => {
  it.each([
    ["Механизмы и оборудование", "Механизмы", "equipment"],
    ["Испытания и контроль качества", "Контроль", "service"],
    ["Исполнительная документация", "Документы", "service"],
    ["Работы и труд", "Труд", "work"],
    ["Материалы", "Асфальтобетонная смесь", "material"],
    ["Доставка", "Транспорт", "delivery"],
    ["Труд и механизмы C111", "labor", "work"],
    ["Труд и механизмы C111", "equipment", "equipment"],
    ["Доставка и обшивка", "material", "material"],
    ["Работы и контроль", "service", "service"],
  ])("maps %s / %s to %s", (section, category, expected) => {
    expect(normalizeCanonicalEstimateRowCategory(section, category)).toBe(expected);
  });
});
