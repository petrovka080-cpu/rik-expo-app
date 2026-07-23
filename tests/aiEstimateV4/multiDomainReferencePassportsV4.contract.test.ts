import { CALCULATION_ARCHETYPES_V4 } from "../../src/lib/estimate/v4/multiDomainProfessionalCorpusV4";
import {
  compileMultiDomainReferencePassportV4,
  MULTI_DOMAIN_REFERENCE_PASSPORTS_V4,
} from "../../src/lib/estimate/v4/multiDomainReferencePassportsV4";

const SAMPLE_INPUTS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  building_structure_demolition: { volume_m3: 10, waste_density_t_m3: 1.5, truck_payload_t: 10 },
  trench_excavation: { length_m: 10, width_m: 1, depth_m: 2, productivity_m3_h: 5 },
  strip_foundation: { length_m: 10, width_m: 0.5, height_m: 1, rebar_rate_kg_m3: 100 },
  monolithic_slab_concreting: { area_m2: 100, thickness_mm: 200, rebar_rate_kg_m3: 100 },
  masonry_wall: { length_m: 10, height_m: 3, thickness_m: 0.25, brick_rate_pcs_m3: 400 },
  wall_plaster: { area_m2: 100, thickness_mm: 10, mix_rate_kg_m2_mm: 1.2 },
  roll_roofing: { area_m2: 100, layers_count: 2, waste_factor: 1.1 },
  water_pipe_installation: { length_m: 100, material_factor: 1.05, support_spacing_m: 1 },
  sewer_pipe_installation: { length_m: 100, material_factor: 1.05, pipe_segment_m: 6 },
  power_cable_laying: { route_length_m: 100, cable_factor: 1.1, fixing_spacing_m: 0.5 },
  heating_appliance_installation: { appliance_count: 10, brackets_per_appliance: 2, valves_per_appliance: 2 },
  asphalt_pavement: { area_m2: 100, thickness_mm: 50, density_t_m3: 2.4 },
};

describe("12 multi-domain ProfessionalEstimatePassportV4 references", () => {
  test("locks twelve unique semantic owners across twelve groups", () => {
    expect(MULTI_DOMAIN_REFERENCE_PASSPORTS_V4).toHaveLength(12);
    expect(new Set(MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map((item) => item.catalogWorkId)).size).toBe(12);
    expect(new Set(MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map((item) => item.group)).size).toBe(12);
    for (const passport of MULTI_DOMAIN_REFERENCE_PASSPORTS_V4) {
      expect(passport.semanticOwner).toBe(passport.professionalEstimatePassportId);
      expect(passport.professionalEstimatePassportId).toContain(passport.catalogWorkId);
    }
  });

  test("covers all ten archetypes", () => {
    const covered = new Set(MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.flatMap(
      (item) => [item.primaryArchetype, ...item.supportingArchetypes]));
    expect(CALCULATION_ARCHETYPES_V4.every((archetype) => covered.has(archetype))).toBe(true);
  });

  test("has explicit P0 inputs without silent defaults and bound formula graphs", () => {
    for (const passport of MULTI_DOMAIN_REFERENCE_PASSPORTS_V4) {
      expect(passport.parameters.length).toBeGreaterThan(0);
      expect(passport.parameters.length).toBeLessThanOrEqual(5);
      const available = new Set(passport.parameters.map((parameter) => parameter.parameterId));
      for (const parameter of passport.parameters) {
        expect(parameter.requiredLevel).toBe("P0");
        expect(parameter.defaultValue).toBeNull();
        expect(parameter.unit).not.toBe("");
      }
      for (const formula of passport.formulaGraph) {
        expect(formula.inputs.every((input) => available.has(input))).toBe(true);
        available.add(formula.output);
      }
    }
  });

  test("compiles only work-owned, formula-bound professional BOQ rows", () => {
    for (const passport of MULTI_DOMAIN_REFERENCE_PASSPORTS_V4) {
      const compilation = compileMultiDomainReferencePassportV4(
        passport.catalogWorkId,
        SAMPLE_INPUTS[passport.catalogWorkId],
      );
      expect(compilation.passportId).toBe(passport.professionalEstimatePassportId);
      expect(compilation.boq.length).toBeGreaterThanOrEqual(3);
      expect(compilation.boq.every((row) =>
        row.semanticOwner === passport.semanticOwner &&
        Number.isFinite(row.quantity) &&
        row.quantity > 0 &&
        row.priceState === "PRICE_REQUIRED")).toBe(true);
      expect(compilation.boq.map((row) => row.professionalNameRu).join(" ")).not.toMatch(
        /Основной материал|Дополнительная услуга|^Работы$|^Оборудование$|^Прочее$/u);
    }
  });

  test("rejects missing, non-positive and unknown inputs", () => {
    expect(() => compileMultiDomainReferencePassportV4("trench_excavation", {})).toThrow("INVALID_P0");
    expect(() => compileMultiDomainReferencePassportV4("trench_excavation", {
      length_m: 0, width_m: 1, depth_m: 1, productivity_m3_h: 1,
    })).toThrow("INVALID_P0");
    expect(() => compileMultiDomainReferencePassportV4("unknown", {})).toThrow("UNKNOWN_REFERENCE_PASSPORT");
  });
});
