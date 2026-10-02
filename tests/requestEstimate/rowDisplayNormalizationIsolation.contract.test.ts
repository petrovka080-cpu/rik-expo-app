import { consumerRepairRowCategorySignals } from "../../src/features/consumerRepair/consumerRepairRowMetadata";
import * as registry from "../../src/lib/estimate/professionalUnitRegistry";
import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate/formatEstimateUnitLabel";

describe("bounded current row display normalization, not quantity or source admission", () => {
  it("does not normalize every unchanged category again for a one-row quantity edit", () => {
    const rows = Array.from({ length: 43 }, (_, index) => ({
      id: `category-normalization-${index}`, quantity: 10,
      sourceParameters: { rowKind: " MATERIAL ", section: " Основание " },
    }));
    const normalize = jest.spyOn(String.prototype, "toLocaleLowerCase");
    try {
      rows.forEach(row => expect(consumerRepairRowCategorySignals(row)).toEqual(["material", "основание"]));
      normalize.mockClear();
      const edited = rows.map((row, index) => index === 2 ? { ...row, quantity: 11 } : row);
      edited.forEach(row => expect(consumerRepairRowCategorySignals(row)).toEqual(["material", "основание"]));
      expect(normalize).toHaveBeenCalledTimes(2);
      normalize.mockClear();
      edited.forEach(row => consumerRepairRowCategorySignals(row));
      expect(normalize).not.toHaveBeenCalled();
    } finally { normalize.mockRestore(); }
  });

  it("invalidates current categories, including legacy in-place nested source changes", () => {
    const smart = { category: "Механизмы" };
    const source: Record<string, unknown> = { rowKind: "Material", smartEstimateProjectionV2: smart };
    const row = { category: "Труд", sourceParameters: source };
    expect(consumerRepairRowCategorySignals(row)).toEqual(["material", "механизмы", "труд"]);
    smart.category = "Доставка";
    source.rowKind = "Service";
    row.category = "Работы";
    expect(consumerRepairRowCategorySignals(row)).toEqual(["service", "доставка", "работы"]);
    delete source.rowKind;
    source.smartEstimateProjectionV2 = null;
    expect(consumerRepairRowCategorySignals(row)).toEqual(["работы"]);
  });

  it("cannot let a caller mutate the cached categories of a live row", () => {
    const row = { sourceParameters: { rowKind: "MATERIAL", section: "Materials" } };
    const first = consumerRepairRowCategorySignals(row);
    first[0] = "delivery";
    first.push("service");
    expect(consumerRepairRowCategorySignals(row)).toEqual(["material", "materials"]);
  });

  it("preserves all seven signals and their order without collapsing false, zero or duplicate signals", () => {
    const row = { category: " Materials ", sourceParameters: {
      rowKind: "MATERIALS", row_kind: false, section: 0, sectionType: " Работы ",
      asphaltV4ProfessionalCategory: "Контроль", smartEstimateProjectionV2: { category: "Доставка" },
    } };
    expect(consumerRepairRowCategorySignals(row)).toEqual(["materials", "false", "0", "работы", "контроль", "доставка", "materials"]);
    expect(consumerRepairRowCategorySignals({ sourceParameters: {} })).toEqual([]);
  });

  it("resolves a repeated rendered unit alias only once, retaining the existing registry precedence", () => {
    const resolve = jest.spyOn(registry, "resolveProfessionalUnitDefinition");
    try {
      Array.from({ length: 43 }, () => expect(formatEstimateUnitLabel("  М³  ")).toBe("м³"));
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(formatEstimateUnitLabel("m")).toBe("м");
      expect(formatEstimateUnitLabel("worker_h")).toBe("чел.-ч");
      expect(formatEstimateUnitLabel("machine_h")).toBe("маш.-ч");
      expect(formatEstimateUnitLabel("t_km")).toBe("т·км");
      expect(formatEstimateUnitLabel(null)).toBe("");
    } finally { resolve.mockRestore(); }
  });

  it("bounds the exact-input label cache and does not retain arbitrarily long labels", () => {
    const resolve = jest.spyOn(registry, "resolveProfessionalUnitDefinition");
    try {
      expect(formatEstimateUnitLabel("isolation-old-custom-unit")).toBe("isolation-old-custom-unit");
      resolve.mockClear();
      expect(formatEstimateUnitLabel("isolation-old-custom-unit")).toBe("isolation-old-custom-unit");
      expect(resolve).not.toHaveBeenCalled();
      for (let index = 0; index < 130; index += 1) {
        expect(formatEstimateUnitLabel(`isolation-unit-${index}`)).toBe(`isolation-unit-${index}`);
      }
      resolve.mockClear();
      expect(formatEstimateUnitLabel("isolation-old-custom-unit")).toBe("isolation-old-custom-unit");
      expect(resolve).toHaveBeenCalledTimes(1);
      resolve.mockClear();
      const long = "independent-unit-".repeat(15);
      expect(formatEstimateUnitLabel(long)).toBe(long);
      expect(formatEstimateUnitLabel(long)).toBe(long);
      expect(resolve).toHaveBeenCalledTimes(2);
    } finally { resolve.mockRestore(); }
  });
});
