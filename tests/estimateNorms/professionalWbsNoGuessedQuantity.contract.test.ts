import { professionalWbsMeasurement } from "../../src/lib/ai/globalEstimate/professionalWbsMeasurementPolicy";

const baseInput = {
  workKey: "metal_frame_install",
  workTitle: "Монтаж металлического каркаса",
  category: "metalworks",
  baseQuantity: 100,
  specKey: "structural_steel_install",
} as const;

describe("professional WBS measurement does not invent quantity rates", () => {
  it("keeps a measured steel length when no section mass takeoff exists", () => {
    expect(professionalWbsMeasurement({
      ...baseInput,
      measuredUnit: "linear_m",
      defaultUnit: "linear_m",
      defaultQuantity: 100,
      role: "materials",
    })).toEqual({ unit: "linear_m", quantity: 100 });
  });

  it("allows the exact tonne-to-kilogram dimensional conversion", () => {
    expect(professionalWbsMeasurement({
      ...baseInput,
      baseQuantity: 2,
      measuredUnit: "ton",
      defaultUnit: "ton",
      defaultQuantity: 2,
      role: "materials",
    })).toMatchObject({ unit: "kg", quantity: 2000 });
  });

  it("keeps concrete area instead of guessing a volume without geometry", () => {
    expect(professionalWbsMeasurement({
      ...baseInput,
      workKey: "concrete_slab",
      workTitle: "Бетонная плита",
      category: "foundation",
      measuredUnit: "sq_m",
      defaultUnit: "sq_m",
      defaultQuantity: 100,
      role: "materials",
      specKey: "concrete_install",
    })).toEqual({ unit: "sq_m", quantity: 100 });
  });
});
