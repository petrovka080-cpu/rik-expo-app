export type UniversalEstimatorKernelBenchmark = {
  id: string;
  prompt: string;
  expectedObject: string;
  expectedOperation: string;
  regulated: boolean;
  formulaFamily: string;
  minimumBoqRows: number;
  requiredRowTokens: string[];
  forbiddenConfusionMappings: string[];
  unitExpectations: string[];
  pdfRequired: boolean;
};

const domains = [
  "elevators",
  "drainage_channels",
  "parametric_concrete",
  "foundation",
  "flooring",
  "paving",
  "roofing",
  "waterproofing",
  "metal_structures",
  "canopies",
  "masonry",
  "asphalt",
  "drywall",
  "tiling",
  "painting",
  "plumbing",
  "ventilation",
  "electrical",
  "solar",
  "hydropower",
  "well_drilling",
  "apartment_renovation",
  "commercial_fit_out",
  "demolition",
  "fencing",
  "sewerage",
  "hvac",
  "fire_alarm",
  "low_voltage",
  "doors",
  "windows",
  "ceilings",
  "facade",
  "insulation",
  "earthworks",
  "landscaping",
  "heating",
  "gas_systems",
  "boilers",
  "industrial_cranes",
  "escalators",
  "hazardous_materials",
  "structural_repair",
  "road_marking",
  "retaining_walls",
  "site_preparation",
  "water_supply",
  "industrial_equipment",
  "restoration",
  "carpentry",
] as const;

function promptFor(domain: string, variant: number): string {
  if (domain === "elevators") return `смета на установку лифта пассажирского на ${10 + variant} этажей`;
  if (domain === "drainage_channels") return `смета на дренажные каналы ${100 + variant} метров`;
  if (domain === "parametric_concrete") return `смета на заливку тумб ширина 0,4 высота 5 метров длина 0,5 метров и надо ${10 + variant} штук`;
  if (domain === "electrical") return `смета на электромонтаж ${80 + variant} м2`;
  if (domain === "canopies") return `смета на металлический навес ${200 + variant} кв м`;
  if (domain === "hydropower") return `смета на установку турбины на ГЭС ${50 + variant} кВт`;
  return `estimate ${domain.replace(/_/g, " ")} measurable construction work ${variant + 1} set`;
}

function benchmarkFor(domain: string, variant: number): UniversalEstimatorKernelBenchmark {
  const regulated = /elevator|hydropower|fire_alarm|gas|boiler|crane|escalator|hazardous|structural/.test(domain);
  return {
    id: `${domain}_${String(variant + 1).padStart(2, "0")}`,
    prompt: promptFor(domain, variant),
    expectedObject:
      domain === "elevators" ? "passenger_elevator" :
        domain === "drainage_channels" ? "drainage_channel" :
          domain === "parametric_concrete" ? "concrete_pedestal" :
            domain,
    expectedOperation:
      domain === "parametric_concrete" ? "concrete_pour" :
        domain === "drainage_channels" ? "installation" :
          "installation",
    regulated,
    formulaFamily:
      domain === "elevators" ? "passenger_elevator_floor_count_preliminary_estimate" :
        domain === "drainage_channels" ? "drainage_channel_length_based_estimate" :
          domain === "parametric_concrete" ? "rectangular_concrete_element_volume" :
            domain === "electrical" ? "electrical_area_points_preliminary_estimate" :
              domain === "hydropower" ? "hydropower_required_inputs" :
                "generic_parsable_work_quantity",
    minimumBoqRows: regulated ? 35 : domain === "parametric_concrete" || domain === "drainage_channels" ? 18 : 12,
    requiredRowTokens:
      domain === "elevators" ? ["пассажирская кабина", "ПНР"] :
        domain === "drainage_channels" ? ["дренажные лотки", "проверка проливом"] :
          domain === "parametric_concrete" ? ["бетон", "опалубка"] :
            [],
    forbiddenConfusionMappings: ["template gap", "Строительные работы", "материал / работы / монтаж"],
    unitExpectations: ["materials_have_own_units", "equipment_not_area_only"],
    pdfRequired: variant % 2 === 0,
  };
}

export const UNIVERSAL_ESTIMATOR_KERNEL_BENCHMARKS: readonly UniversalEstimatorKernelBenchmark[] =
  domains.flatMap((domain) => Array.from({ length: 6 }, (_, variant) => benchmarkFor(domain, variant)));

export const UNIVERSAL_ESTIMATOR_KERNEL_DOMAIN_COUNT = domains.length;
