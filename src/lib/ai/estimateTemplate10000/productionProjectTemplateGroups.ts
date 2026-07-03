import type {
  ProductionDefaultUnit,
  ProductionTemplateSection,
  ProductionTemplate10000Category,
} from "./productionExpandedWorkCatalog10000";

export type ProductionProjectTemplateGroupChild = {
  childTemplateId: string;
  workKey: string;
  quantityFormula: string;
  unit: ProductionDefaultUnit;
  role:
    | "demolition"
    | "floor_base"
    | "wet_zone"
    | "floor_finish"
    | "wall_finish"
    | "ceiling_finish"
    | "facade_finish"
    | "drywall"
    | "openings"
    | "electrical"
    | "plumbing";
};

export type ProductionProjectTemplateGroupRowOverride = {
  childTemplateId: string;
  sourceSection: ProductionTemplateSection;
  sourceRowCodeSuffix: string;
  rowCode: string;
  titleRu: string;
  quantitySource?: "compiled_row" | "child_quantity" | "project_delivery_trip";
  quantityFormula?: string;
  unit?: ProductionDefaultUnit;
};

export type ProductionProjectTemplateGroup = {
  workKey: string;
  templateKey: string;
  templateFamily: string;
  version: string;
  visibleNameRu: string;
  category: ProductionTemplate10000Category;
  defaultQuantity: number;
  defaultUnit: ProductionDefaultUnit;
  children: readonly ProductionProjectTemplateGroupChild[];
  rowOverrides?: readonly ProductionProjectTemplateGroupRowOverride[];
};

const APARTMENT_CAPITAL_RENOVATION_CHILDREN: readonly ProductionProjectTemplateGroupChild[] = Object.freeze([
  {
    childTemplateId: "demolition_tile",
    workKey: "demolition_interior_tile_remove_standard",
    quantityFormula: "q * 0.65",
    unit: "m2",
    role: "demolition",
  },
  {
    childTemplateId: "demolition_flooring",
    workKey: "demolition_interior_flooring_remove_standard",
    quantityFormula: "q * 0.82",
    unit: "m2",
    role: "demolition",
  },
  {
    childTemplateId: "floor_screed",
    workKey: "flooring_interior_subfloor_lay_standard",
    quantityFormula: "q",
    unit: "m2",
    role: "floor_base",
  },
  {
    childTemplateId: "self_leveling_floor",
    workKey: "flooring_interior_subfloor_finish_standard",
    quantityFormula: "q * 0.82",
    unit: "m2",
    role: "floor_base",
  },
  {
    childTemplateId: "floor_primer",
    workKey: "plaster_paint_interior_primer_prime_standard",
    quantityFormula: "q",
    unit: "m2",
    role: "floor_base",
  },
  {
    childTemplateId: "waterproofing_wet_zones",
    workKey: "waterproofing_interior_wet_zone_apply_standard",
    quantityFormula: "q * 0.72",
    unit: "m2",
    role: "wet_zone",
  },
  {
    childTemplateId: "tile_laying",
    workKey: "tile_stone_interior_ceramic_tile_lay_standard",
    quantityFormula: "q * 0.72",
    unit: "m2",
    role: "wet_zone",
  },
  {
    childTemplateId: "flooring_laminate_spc",
    workKey: "flooring_interior_laminate_lay_standard",
    quantityFormula: "q * 0.82",
    unit: "m2",
    role: "floor_finish",
  },
  {
    childTemplateId: "baseboard_install",
    workKey: "flooring_interior_baseboard_install_standard",
    quantityFormula: "sqrt(q) * 4",
    unit: "linear_m",
    role: "floor_finish",
  },
  {
    childTemplateId: "wall_plaster",
    workKey: "plaster_paint_interior_wall_plaster_apply_standard",
    quantityFormula: "q * 2.5",
    unit: "m2",
    role: "wall_finish",
  },
  {
    childTemplateId: "wall_putty_start",
    workKey: "plaster_paint_interior_wall_putty_apply_standard",
    quantityFormula: "q * 2.5",
    unit: "m2",
    role: "wall_finish",
  },
  {
    childTemplateId: "wall_putty_finish",
    workKey: "plaster_paint_interior_finish_layer_apply_standard",
    quantityFormula: "q * 2.5",
    unit: "m2",
    role: "wall_finish",
  },
  {
    childTemplateId: "wall_primer",
    workKey: "plaster_paint_interior_primer_prime_standard",
    quantityFormula: "q * 2.5",
    unit: "m2",
    role: "wall_finish",
  },
  {
    childTemplateId: "wall_paint",
    workKey: "plaster_paint_interior_paint_wall_apply_standard",
    quantityFormula: "q * 2.5",
    unit: "m2",
    role: "wall_finish",
  },
  {
    childTemplateId: "ceiling_paint",
    workKey: "plaster_paint_interior_paint_ceiling_apply_standard",
    quantityFormula: "q",
    unit: "m2",
    role: "ceiling_finish",
  },
  {
    childTemplateId: "drywall_local_ceiling",
    workKey: "drywall_ceiling_interior_drywall_ceiling_install_standard",
    quantityFormula: "q * 0.25",
    unit: "m2",
    role: "drywall",
  },
  {
    childTemplateId: "door_blocks",
    workKey: "doors_windows_interior_interior_door_install_standard",
    quantityFormula: "ceil(q / 18)",
    unit: "piece",
    role: "openings",
  },
  {
    childTemplateId: "electrical_points",
    workKey: "electrical_interior_socket_install_standard",
    quantityFormula: "ceil(q * 0.83)",
    unit: "point",
    role: "electrical",
  },
  {
    childTemplateId: "cable_routing",
    workKey: "electrical_interior_power_cable_lay_standard",
    quantityFormula: "ceil(q * 0.83)",
    unit: "point",
    role: "electrical",
  },
  {
    childTemplateId: "lighting_points",
    workKey: "electrical_interior_lighting_install_standard",
    quantityFormula: "ceil(q / 9)",
    unit: "point",
    role: "electrical",
  },
  {
    childTemplateId: "plumbing_water_points",
    workKey: "plumbing_interior_water_pipe_install_standard",
    quantityFormula: "8",
    unit: "point",
    role: "plumbing",
  },
  {
    childTemplateId: "plumbing_sewer_points",
    workKey: "plumbing_interior_sewer_install_standard",
    quantityFormula: "6",
    unit: "point",
    role: "plumbing",
  },
  {
    childTemplateId: "plumbing_fixtures",
    workKey: "plumbing_interior_sink_install_standard",
    quantityFormula: "3",
    unit: "point",
    role: "plumbing",
  },
]);

const APARTMENT_CAPITAL_RENOVATION_ROW_OVERRIDES: readonly ProductionProjectTemplateGroupRowOverride[] = Object.freeze([
  {
    childTemplateId: "floor_screed",
    sourceSection: "materials",
    sourceRowCodeSuffix: "_materials_01",
    rowCode: "apartment_screed_dry_mix",
    titleRu: "Сухая смесь для цементно-песчаной стяжки 50 мм",
  },
  {
    childTemplateId: "tile_laying",
    sourceSection: "materials",
    sourceRowCodeSuffix: "_materials_01",
    rowCode: "apartment_ceramic_tile_wet_zones",
    titleRu: "Плитка / керамогранит мокрых зон с запасом",
    quantitySource: "child_quantity",
    unit: "m2",
  },
  {
    childTemplateId: "tile_laying",
    sourceSection: "materials",
    sourceRowCodeSuffix: "_materials_02",
    rowCode: "apartment_tile_adhesive",
    titleRu: "Плиточный клей C1/C2",
  },
  {
    childTemplateId: "baseboard_install",
    sourceSection: "materials",
    sourceRowCodeSuffix: "_materials_01",
    rowCode: "apartment_floor_baseboard",
    titleRu: "Плинтус напольный",
    quantitySource: "child_quantity",
    unit: "linear_m",
  },
  {
    childTemplateId: "wall_plaster",
    sourceSection: "materials",
    sourceRowCodeSuffix: "_materials_01",
    rowCode: "apartment_wall_plaster_mix",
    titleRu: "Штукатурная смесь для стен",
  },
  {
    childTemplateId: "wall_putty_start",
    sourceSection: "materials",
    sourceRowCodeSuffix: "_materials_01",
    rowCode: "apartment_base_putty",
    titleRu: "Шпаклевка стартовая",
  },
  {
    childTemplateId: "wall_putty_finish",
    sourceSection: "materials",
    sourceRowCodeSuffix: "_materials_01",
    rowCode: "apartment_finish_putty",
    titleRu: "Шпаклевка финишная",
  },
  {
    childTemplateId: "wall_primer",
    sourceSection: "materials",
    sourceRowCodeSuffix: "_materials_02",
    rowCode: "apartment_wall_primer",
    titleRu: "Грунтовка стен и потолков",
  },
  {
    childTemplateId: "wall_paint",
    sourceSection: "materials",
    sourceRowCodeSuffix: "_materials_01",
    rowCode: "apartment_wall_paint",
    titleRu: "Краска интерьерная для стен",
  },
  {
    childTemplateId: "ceiling_paint",
    sourceSection: "materials",
    sourceRowCodeSuffix: "_materials_01",
    rowCode: "apartment_ceiling_paint",
    titleRu: "Краска для потолков",
  },
  {
    childTemplateId: "electrical_points",
    sourceSection: "components",
    sourceRowCodeSuffix: "_components_07",
    rowCode: "apartment_socket_boxes",
    titleRu: "Подрозетники и монтажные коробки",
  },
  {
    childTemplateId: "electrical_points",
    sourceSection: "components",
    sourceRowCodeSuffix: "_components_08",
    rowCode: "apartment_sockets_switches",
    titleRu: "Розетки и выключатели чистовые",
  },
  {
    childTemplateId: "demolition_tile",
    sourceSection: "logistics",
    sourceRowCodeSuffix: "_logistics_28",
    rowCode: "apartment_debris_removal",
    titleRu: "Вывоз строительного мусора",
  },
  {
    childTemplateId: "flooring_laminate_spc",
    sourceSection: "logistics",
    sourceRowCodeSuffix: "_logistics_28",
    rowCode: "apartment_material_delivery",
    titleRu: "Доставка черновых и финишных материалов",
    quantitySource: "project_delivery_trip",
    quantityFormula: "max(1, ceil(q / 80))",
    unit: "trip",
  },
]);

const PAINT_WALL_CEILING_TWO_COATS_CHILDREN: readonly ProductionProjectTemplateGroupChild[] = Object.freeze([
  {
    childTemplateId: "paint_wall_two_coats",
    workKey: "plaster_paint_interior_paint_wall_apply_standard",
    quantityFormula: "q",
    unit: "m2",
    role: "wall_finish",
  },
  {
    childTemplateId: "paint_ceiling_two_coats",
    workKey: "plaster_paint_interior_paint_ceiling_apply_standard",
    quantityFormula: "q",
    unit: "m2",
    role: "ceiling_finish",
  },
]);

const PAINT_FACADE_CHILDREN: readonly ProductionProjectTemplateGroupChild[] = Object.freeze([
  {
    childTemplateId: "paint_facade_two_coats",
    workKey: "facade_interior_facade_paint_apply_standard",
    quantityFormula: "q",
    unit: "m2",
    role: "facade_finish",
  },
]);

const PRIMER_WALL_CEILING_CHILDREN: readonly ProductionProjectTemplateGroupChild[] = Object.freeze([
  {
    childTemplateId: "primer_wall_ceiling",
    workKey: "plaster_paint_interior_primer_prime_standard",
    quantityFormula: "q",
    unit: "m2",
    role: "wall_finish",
  },
]);

const SCREED_CEMENT_SAND_50MM_CHILDREN: readonly ProductionProjectTemplateGroupChild[] = Object.freeze([
  {
    childTemplateId: "screed_cement_sand_50mm",
    workKey: "flooring_interior_subfloor_lay_standard",
    quantityFormula: "q",
    unit: "m2",
    role: "floor_base",
  },
]);

const SELF_LEVELING_FLOOR_5MM_CHILDREN: readonly ProductionProjectTemplateGroupChild[] = Object.freeze([
  {
    childTemplateId: "self_leveling_floor_5mm",
    workKey: "flooring_interior_subfloor_finish_standard",
    quantityFormula: "q",
    unit: "m2",
    role: "floor_base",
  },
]);

export const PRODUCTION_PROJECT_TEMPLATE_GROUPS_10000: readonly ProductionProjectTemplateGroup[] = Object.freeze([
  {
    workKey: "apartment_capital_renovation",
    templateKey: "apartment_capital_renovation_project_template_group_v1",
    templateFamily: "residential_apartment_project_boq_group",
    version: "1.0.0",
    visibleNameRu: "Apartment capital renovation project template group",
    category: "special_repair",
    defaultQuantity: 54,
    defaultUnit: "m2",
    children: APARTMENT_CAPITAL_RENOVATION_CHILDREN,
    rowOverrides: APARTMENT_CAPITAL_RENOVATION_ROW_OVERRIDES,
  },
  {
    workKey: "paint_wall_ceiling_2_coats",
    templateKey: "paint_wall_ceiling_2_coats_project_template_group_v1",
    templateFamily: "paint_dedicated_project_boq_group",
    version: "1.0.0",
    visibleNameRu: "Dedicated wall and ceiling painting, two coats",
    category: "plaster_paint",
    defaultQuantity: 200,
    defaultUnit: "m2",
    children: PAINT_WALL_CEILING_TWO_COATS_CHILDREN,
  },
  {
    workKey: "paint_facade",
    templateKey: "paint_facade_project_template_group_v1",
    templateFamily: "paint_dedicated_project_boq_group",
    version: "1.0.0",
    visibleNameRu: "Dedicated facade painting",
    category: "facade",
    defaultQuantity: 200,
    defaultUnit: "m2",
    children: PAINT_FACADE_CHILDREN,
  },
  {
    workKey: "primer_wall_ceiling",
    templateKey: "primer_wall_ceiling_project_template_group_v1",
    templateFamily: "paint_dedicated_project_boq_group",
    version: "1.0.0",
    visibleNameRu: "Dedicated wall and ceiling primer",
    category: "plaster_paint",
    defaultQuantity: 200,
    defaultUnit: "m2",
    children: PRIMER_WALL_CEILING_CHILDREN,
  },
  {
    workKey: "screed_cement_sand_50mm",
    templateKey: "screed_cement_sand_50mm_project_template_group_v1",
    templateFamily: "floor_base_dedicated_project_boq_group",
    version: "1.0.0",
    visibleNameRu: "Dedicated cement-sand screed 50 mm",
    category: "flooring",
    defaultQuantity: 100,
    defaultUnit: "m2",
    children: SCREED_CEMENT_SAND_50MM_CHILDREN,
  },
  {
    workKey: "self_leveling_floor_5mm",
    templateKey: "self_leveling_floor_5mm_project_template_group_v1",
    templateFamily: "floor_base_dedicated_project_boq_group",
    version: "1.0.0",
    visibleNameRu: "Dedicated self-leveling floor 5 mm",
    category: "flooring",
    defaultQuantity: 100,
    defaultUnit: "m2",
    children: SELF_LEVELING_FLOOR_5MM_CHILDREN,
  },
]);

const PROJECT_TEMPLATE_GROUP_BY_WORK_KEY = new Map(
  PRODUCTION_PROJECT_TEMPLATE_GROUPS_10000.map((group) => [group.workKey, group]),
);

export function getProductionProjectTemplateGroup10000(workKey: string): ProductionProjectTemplateGroup | undefined {
  return PROJECT_TEMPLATE_GROUP_BY_WORK_KEY.get(workKey);
}

export function isProductionProjectTemplateGroup10000(workKey: string): boolean {
  return PROJECT_TEMPLATE_GROUP_BY_WORK_KEY.has(workKey);
}

export function evaluateProductionProjectTemplateGroupQuantityFormula(formula: string, q: number): number {
  const compact = formula.replace(/\s+/g, "");
  if (compact === "q") return q;
  const literal = compact.match(/^\d+(?:\.\d+)?$/);
  if (literal) return Number(literal[0]);
  const multiply = compact.match(/^q\*(\d+(?:\.\d+)?)$/);
  if (multiply) return q * Number(multiply[1]);
  const divide = compact.match(/^q\/(\d+(?:\.\d+)?)$/);
  if (divide) return q / Number(divide[1]);
  const ceilMultiply = compact.match(/^ceil\(q\*(\d+(?:\.\d+)?)\)$/);
  if (ceilMultiply) return Math.ceil(q * Number(ceilMultiply[1]));
  const ceilDivide = compact.match(/^ceil\(q\/(\d+(?:\.\d+)?)\)$/);
  if (ceilDivide) return Math.ceil(q / Number(ceilDivide[1]));
  const sqrtMultiply = compact.match(/^sqrt\(q\)\*(\d+(?:\.\d+)?)$/);
  if (sqrtMultiply) return Math.sqrt(q) * Number(sqrtMultiply[1]);
  throw new Error(`UNSUPPORTED_PROJECT_TEMPLATE_GROUP_QUANTITY_FORMULA:${formula}`);
}
