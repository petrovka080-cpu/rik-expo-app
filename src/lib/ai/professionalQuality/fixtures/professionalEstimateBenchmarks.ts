export type ProfessionalEstimateBenchmark = {
  id: string;
  prompt: string;
  expected_domain: string;
  expected_object: string;
  expected_operation: string;
  expected_recipe: string;
  expected_min_rows: number;
  forbidden_objects: string[];
  forbidden_rows: string[];
  required_material_rows: string[];
  required_labor_rows: string[];
  required_equipment_or_warning_rows: string[];
  required_exclusions: string[];
  required_clarifying_questions: string[];
};

const PEDESTAL_BASE = {
  expected_domain: "concrete",
  expected_object: "concrete_pedestal",
  expected_operation: "concrete_pour",
  expected_recipe: "concrete_pedestal_pour",
  expected_min_rows: 18,
  forbidden_objects: ["concrete_slab", "concrete_screed"],
  forbidden_rows: ["бетонная плита", "устройство плиты", "армирование плиты", "стяжка пола", "пол по грунту"],
  required_material_rows: ["бетон", "арматурный каркас", "опалубка", "закладные", "песчано-щебеночная подушка"],
  required_labor_rows: ["разметка", "выемка грунта", "вязка арматуры", "укладка бетона", "уход за бетоном"],
  required_equipment_or_warning_rows: ["вибратор", "доставка материалов"],
  required_exclusions: ["размеры тумб уточнить", "геология/несущая способность грунта не включена"],
  required_clarifying_questions: ["размер одной тумбы", "закладные/анкера", "марка бетона"],
} satisfies Omit<ProfessionalEstimateBenchmark, "id" | "prompt">;

export const PROFESSIONAL_ESTIMATE_BENCHMARKS: readonly ProfessionalEstimateBenchmark[] = [
  {
    id: "concrete_pedestal_exact",
    prompt: "смета на заливку бетонных тумб 12 шт",
    ...PEDESTAL_BASE,
  },
  {
    id: "concrete_postament_equipment",
    prompt: "бетонные постаменты под оборудование 8 шт",
    ...PEDESTAL_BASE,
  },
  {
    id: "concrete_pedestal_columns",
    prompt: "бетонные пьедесталы под колонны 16 шт",
    ...PEDESTAL_BASE,
  },
  {
    id: "concrete_canopy_support_bases",
    prompt: "основания под стойки навеса 20 шт",
    ...PEDESTAL_BASE,
  },
  {
    id: "foundation_sockets",
    prompt: "фундаментные стаканы 6 шт",
    ...PEDESTAL_BASE,
  },
];
