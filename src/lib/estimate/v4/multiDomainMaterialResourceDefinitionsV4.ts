import { professionalEstimatePassportId } from "./professionalEstimatePassportV4";
import type {
  ReferenceBoqRowV4,
  ReferenceFormulaNodeV4,
  ReferenceParameterV4,
} from "./multiDomainReferencePassportsV4";

type MaterialSeed = {
  resourceId: string;
  professionalNameRu: string;
  rateUnit: string;
  outputUnit: string;
  defaultRate: number;
};

type WorkMaterialSeed = {
  primaryFormulaId: string;
  resources: readonly MaterialSeed[];
};

export type MaterialResourceDefinitionV4 = {
  parameters: readonly ReferenceParameterV4[];
  formulaGraph: readonly ReferenceFormulaNodeV4[];
  boq: readonly ReferenceBoqRowV4[];
};

export type AtomicMaterialResourceV4 = {
  materialResourceId: string;
  passportId: string;
  semanticKey: string;
  nameRu: string;
  procurementNameRu: string;
  resourceClass: "PERMANENT_MATERIAL" | "CONSUMABLE" | "TEMPORARY_REUSABLE" | "COMMERCIAL_KIT";
  unit: string;
  dimension: string;
  quantityFormulaNodeId: string;
  baseQuantityDriver: string;
  coefficientBindings: readonly string[];
  wasteBinding: string;
  packageRoundingBinding: string;
  materialPresenceSourceClaimId: string;
  quantitySourceClaimIds: readonly string[];
  procurementEligible: true;
  includedInEstimateTotal: true;
  priceSource: "NOT_PRICED";
  assumptions: readonly string[];
  exclusions: readonly string[];
  version: "1.0.0";
};

export type MaterialSourceClaimV4 = {
  claimId: string;
  materialResourceId: string;
  claimType: "MATERIAL_PRESENCE" | "CONSUMPTION_RATE" | "WASTE_RATE" | "PACKAGE_SIZE";
  sourceId: string;
  sourceRole: "CIS_REFERENCE_METHOD" | "PROJECT_INPUT";
  locator: string;
  paraphrasedClaim: string;
  applicability: string;
};

const PRESENCE_SOURCE_BY_WORK: Readonly<Record<string, string>> = {
  building_structure_demolition: "ru_gesn_21", trench_excavation: "engineering_geometry",
  strip_foundation: "ru_gesn_06", monolithic_slab_concreting: "ru_gesn_06",
  masonry_wall: "ru_gesn_08", wall_plaster: "ru_gesn_15", roll_roofing: "ru_gesn_12",
  water_pipe_installation: "ru_gesn_16", sewer_pipe_installation: "ru_gesn_23",
  power_cable_laying: "ru_gesnm_08", heating_appliance_installation: "ru_gesnr_65",
  asphalt_pavement: "ru_gesn_27",
};

const PACKAGE_SIZE_BY_UNIT: Readonly<Record<string, number>> = {
  l: 10, pcs: 1, m2: 10, kg: 25, m: 50, m3: 1, t: 1,
};

export const MULTI_DOMAIN_ATOMIC_MATERIAL_RESOURCES_V4: AtomicMaterialResourceV4[] = [];
export const MULTI_DOMAIN_MATERIAL_SOURCE_CLAIMS_V4: MaterialSourceClaimV4[] = [];

const MATERIALS: Readonly<Record<string, WorkMaterialSeed>> = {
  building_structure_demolition: {
    primaryFormulaId: "demolished_volume",
    resources: [
      { resourceId: "dust_suppression_water", professionalNameRu: "Техническая вода для пылеподавления при разборке", rateUnit: "l/m3", outputUnit: "l", defaultRate: 12 },
      { resourceId: "demolition_cutting_discs", professionalNameRu: "Отрезные диски для разделки демонтируемых конструкций", rateUnit: "pcs/m3", outputUnit: "pcs", defaultRate: 0.08 },
      { resourceId: "protective_sheeting", professionalNameRu: "Защитное укрывное полотно зоны демонтажа", rateUnit: "m2/m3", outputUnit: "m2", defaultRate: 0.3 },
      { resourceId: "spill_absorbent", professionalNameRu: "Сорбирующий материал для локализации технологических загрязнений", rateUnit: "kg/m3", outputUnit: "kg", defaultRate: 0.1 },
    ],
  },
  trench_excavation: {
    primaryFormulaId: "excavation_volume",
    resources: [
      { resourceId: "trench_marking_tape", professionalNameRu: "Сигнальная лента ограждения траншеи", rateUnit: "m/m3", outputUnit: "m", defaultRate: 0.25 },
      { resourceId: "temporary_shoring_timber", professionalNameRu: "Пиломатериал временного крепления стенок траншеи", rateUnit: "m3/m3", outputUnit: "m3", defaultRate: 0.01 },
      { resourceId: "separation_geotextile", professionalNameRu: "Геотекстиль разделительного слоя траншеи", rateUnit: "m2/m3", outputUnit: "m2", defaultRate: 0.4 },
      { resourceId: "drainage_gravel", professionalNameRu: "Щебень временного дренажа дна траншеи", rateUnit: "t/m3", outputUnit: "t", defaultRate: 0.05 },
    ],
  },
  strip_foundation: {
    primaryFormulaId: "foundation_concrete_volume",
    resources: [
      { resourceId: "blinding_concrete", professionalNameRu: "Бетонная смесь подбетонки ленточного фундамента", rateUnit: "m3/m3", outputUnit: "m3", defaultRate: 0.08 },
      { resourceId: "foundation_waterproofing", professionalNameRu: "Гидроизоляционный материал фундаментной ленты", rateUnit: "m2/m3", outputUnit: "m2", defaultRate: 1.2 },
      { resourceId: "rebar_spacers", professionalNameRu: "Фиксаторы защитного слоя арматуры фундамента", rateUnit: "pcs/m3", outputUnit: "pcs", defaultRate: 8 },
      { resourceId: "rebar_tie_wire", professionalNameRu: "Проволока вязальная арматурного каркаса фундамента", rateUnit: "kg/m3", outputUnit: "kg", defaultRate: 0.8 },
    ],
  },
  monolithic_slab_concreting: {
    primaryFormulaId: "slab_concrete_volume",
    resources: [
      { resourceId: "slab_formwork", professionalNameRu: "Щиты и доборные элементы опалубки монолитной плиты", rateUnit: "m2/m3", outputUnit: "m2", defaultRate: 5 },
      { resourceId: "slab_rebar_spacers", professionalNameRu: "Фиксаторы защитного слоя арматуры монолитной плиты", rateUnit: "pcs/m3", outputUnit: "pcs", defaultRate: 12 },
      { resourceId: "slab_tie_wire", professionalNameRu: "Проволока вязальная армирования монолитной плиты", rateUnit: "kg/m3", outputUnit: "kg", defaultRate: 0.9 },
      { resourceId: "concrete_curing_compound", professionalNameRu: "Плёнкообразующий состав ухода за бетоном плиты", rateUnit: "l/m3", outputUnit: "l", defaultRate: 0.35 },
    ],
  },
  masonry_wall: {
    primaryFormulaId: "masonry_volume",
    resources: [
      { resourceId: "masonry_mortar", professionalNameRu: "Кладочный раствор кирпичной стены", rateUnit: "kg/m3", outputUnit: "kg", defaultRate: 350 },
      { resourceId: "masonry_reinforcement", professionalNameRu: "Армирующая сетка горизонтальных швов кладки", rateUnit: "kg/m3", outputUnit: "kg", defaultRate: 4 },
      { resourceId: "masonry_wall_ties", professionalNameRu: "Гибкие связи кирпичной стены", rateUnit: "pcs/m3", outputUnit: "pcs", defaultRate: 8 },
      { resourceId: "masonry_dpc_membrane", professionalNameRu: "Горизонтальная отсечная гидроизоляция кладки", rateUnit: "m2/m3", outputUnit: "m2", defaultRate: 0.5 },
    ],
  },
  wall_plaster: {
    primaryFormulaId: "plaster_area",
    resources: [
      { resourceId: "plaster_primer", professionalNameRu: "Грунтовочный состав основания под штукатурку", rateUnit: "l/m2", outputUnit: "l", defaultRate: 0.2 },
      { resourceId: "plaster_beacons", professionalNameRu: "Маячковый профиль штукатурного слоя", rateUnit: "m/m2", outputUnit: "m", defaultRate: 0.7 },
      { resourceId: "plaster_reinforcing_mesh", professionalNameRu: "Армирующая сетка штукатурного покрытия", rateUnit: "m2/m2", outputUnit: "m2", defaultRate: 1.05 },
      { resourceId: "plaster_corner_profiles", professionalNameRu: "Углозащитный профиль оштукатуриваемых стен", rateUnit: "m/m2", outputUnit: "m", defaultRate: 0.12 },
    ],
  },
  roll_roofing: {
    primaryFormulaId: "roof_area",
    resources: [
      { resourceId: "roof_primer", professionalNameRu: "Битумный праймер основания рулонной кровли", rateUnit: "l/m2", outputUnit: "l", defaultRate: 0.3 },
      { resourceId: "roof_mastic", professionalNameRu: "Битумно-полимерная мастика кровельных примыканий", rateUnit: "kg/m2", outputUnit: "kg", defaultRate: 0.5 },
      { resourceId: "roof_reinforcement_membrane", professionalNameRu: "Дополнительный рулонный материал усиления примыканий", rateUnit: "m2/m2", outputUnit: "m2", defaultRate: 0.15 },
      { resourceId: "roof_drain_fittings", professionalNameRu: "Комплектующие водоприёмных воронок рулонной кровли", rateUnit: "pcs/m2", outputUnit: "pcs", defaultRate: 0.01 },
    ],
  },
  water_pipe_installation: {
    primaryFormulaId: "installed_pipe_length",
    resources: [
      { resourceId: "water_pipe_fittings", professionalNameRu: "Фасонные детали водопроводной трубы выбранной системы", rateUnit: "pcs/m", outputUnit: "pcs", defaultRate: 0.18 },
      { resourceId: "water_pipe_insulation", professionalNameRu: "Теплоизоляция внутреннего водопроводного трубопровода", rateUnit: "m/m", outputUnit: "m", defaultRate: 1.03 },
      { resourceId: "water_pipe_sleeves", professionalNameRu: "Защитные гильзы проходов водопроводной трубы", rateUnit: "pcs/m", outputUnit: "pcs", defaultRate: 0.04 },
      { resourceId: "water_joint_sealant", professionalNameRu: "Уплотнительный материал соединений водопровода", rateUnit: "kg/m", outputUnit: "kg", defaultRate: 0.03 },
    ],
  },
  sewer_pipe_installation: {
    primaryFormulaId: "installed_sewer_length",
    resources: [
      { resourceId: "sewer_sand_bedding", professionalNameRu: "Песок постели наружной канализационной трубы", rateUnit: "m3/m", outputUnit: "m3", defaultRate: 0.18 },
      { resourceId: "sewer_sealing_rings", professionalNameRu: "Уплотнительные кольца канализационных труб", rateUnit: "pcs/m", outputUnit: "pcs", defaultRate: 0.18 },
      { resourceId: "sewer_warning_tape", professionalNameRu: "Сигнальная лента трассы канализационного трубопровода", rateUnit: "m/m", outputUnit: "m", defaultRate: 1.02 },
      { resourceId: "sewer_geotextile", professionalNameRu: "Геотекстиль основания канализационной трубы", rateUnit: "m2/m", outputUnit: "m2", defaultRate: 1.4 },
    ],
  },
  power_cable_laying: {
    primaryFormulaId: "installed_cable_length",
    resources: [
      { resourceId: "cable_protective_conduit", professionalNameRu: "Защитная труба участков силовой кабельной линии", rateUnit: "m/m", outputUnit: "m", defaultRate: 0.25 },
      { resourceId: "cable_terminals", professionalNameRu: "Кабельные наконечники выбранного сечения", rateUnit: "pcs/m", outputUnit: "pcs", defaultRate: 0.04 },
      { resourceId: "cable_markers", professionalNameRu: "Маркировочные бирки силовой кабельной линии", rateUnit: "pcs/m", outputUnit: "pcs", defaultRate: 0.08 },
      { resourceId: "cable_firestop", professionalNameRu: "Огнезащитный герметик кабельных проходок", rateUnit: "kg/m", outputUnit: "kg", defaultRate: 0.02 },
    ],
  },
  heating_appliance_installation: {
    primaryFormulaId: "installed_appliance_count",
    resources: [
      { resourceId: "radiator_air_vents", professionalNameRu: "Воздухоотводчики отопительных приборов", rateUnit: "pcs/pcs", outputUnit: "pcs", defaultRate: 1 },
      { resourceId: "radiator_connection_kits", professionalNameRu: "Комплекты подключения отопительных приборов", rateUnit: "pcs/pcs", outputUnit: "pcs", defaultRate: 1 },
      { resourceId: "radiator_sealing_material", professionalNameRu: "Уплотнительный материал резьбовых соединений радиаторов", rateUnit: "kg/pcs", outputUnit: "kg", defaultRate: 0.04 },
      { resourceId: "radiator_pipe_insulation", professionalNameRu: "Теплоизоляция подводок отопительных приборов", rateUnit: "m/pcs", outputUnit: "m", defaultRate: 1.5 },
    ],
  },
  asphalt_pavement: {
    primaryFormulaId: "asphalt_area",
    resources: [
      { resourceId: "asphalt_tack_coat", professionalNameRu: "Битумная эмульсия подгрунтовки асфальтобетонного слоя", rateUnit: "l/m2", outputUnit: "l", defaultRate: 0.4 },
      { resourceId: "asphalt_joint_tape", professionalNameRu: "Битумно-полимерная лента продольных сопряжений покрытия", rateUnit: "m/m2", outputUnit: "m", defaultRate: 0.08 },
      { resourceId: "asphalt_joint_sealant", professionalNameRu: "Герметик технологических швов асфальтобетонного покрытия", rateUnit: "kg/m2", outputUnit: "kg", defaultRate: 0.03 },
      { resourceId: "asphalt_joint_dressing", professionalNameRu: "Мелкий минеральный материал присыпки обработанных швов", rateUnit: "kg/m2", outputUnit: "kg", defaultRate: 0.2 },
    ],
  },
};

export const MULTI_DOMAIN_MATERIAL_RESOURCE_DEFINITIONS_V4: Readonly<Record<string, MaterialResourceDefinitionV4>> =
  Object.fromEntries(Object.entries(MATERIALS).map(([workId, seed]) => {
    const parameters = seed.resources.map((resource) => ({
      parameterId: `${workId}_${resource.resourceId}_rate`,
      labelRu: `Расход: ${resource.professionalNameRu}`,
      quantityType: "ratio" as const,
      unit: resource.rateUnit,
      requiredLevel: "P1" as const,
      minimum: 0.000001,
      maximum: 1_000_000,
      defaultValue: resource.defaultRate,
      defaultSource: "transparent_editable_assumption",
      formulaConsumers: [`${workId}_${resource.resourceId}_net_quantity`],
      validationRules: ["FINITE", "GREATER_THAN_ZERO", "VISIBLE_EDITABLE_ASSUMPTION"],
    })).flatMap((rateParameter, index) => {
      const resource = seed.resources[index];
      return [
        rateParameter,
        {
          parameterId: `${workId}_${resource.resourceId}_waste_rate`,
          labelRu: `Отход материала: ${resource.professionalNameRu}`,
          quantityType: "ratio" as const, unit: "ratio", requiredLevel: "P2" as const,
          minimum: 0, maximum: 1, defaultValue: 0.05, defaultSource: "project_material_waste_input",
          formulaConsumers: [`${workId}_${resource.resourceId}_waste_quantity`],
          validationRules: ["FINITE", "MIN_ZERO", "MAX_ONE", "VISIBLE_EDITABLE_ASSUMPTION"],
        },
        {
          parameterId: `${workId}_${resource.resourceId}_package_size`,
          labelRu: `Размер закупочной упаковки: ${resource.professionalNameRu}`,
          quantityType: "ratio" as const, unit: resource.outputUnit, requiredLevel: "P1" as const,
          minimum: 0.000001, maximum: 1_000_000,
          defaultValue: PACKAGE_SIZE_BY_UNIT[resource.outputUnit] ?? 1,
          defaultSource: "supplier_package_input",
          formulaConsumers: [`${workId}_${resource.resourceId}_package_count`, `${workId}_${resource.resourceId}_purchase_quantity`],
          validationRules: ["FINITE", "GREATER_THAN_ZERO", "SUPPLIER_EDITABLE"],
        },
      ];
    });
    const formulaGraph = seed.resources.flatMap((resource): ReferenceFormulaNodeV4[] => {
      const prefix = `${workId}_${resource.resourceId}`;
      const common = {
        coefficient: 1,
        coefficientSource: "USER_INPUT" as const,
        applicability: "Атомарный материал выбранной технологии; rate, waste и package видимы",
      };
      return [
        { ...common, formulaNodeId: `${prefix}_net_quantity`, operation: "MULTIPLY", inputs: [seed.primaryFormulaId, `${prefix}_rate`], output: `${prefix}_net_quantity`, outputUnit: resource.outputUnit, roundingPolicy: "ROUND_6" },
        { ...common, formulaNodeId: `${prefix}_waste_quantity`, operation: "MULTIPLY", inputs: [`${prefix}_net_quantity`, `${prefix}_waste_rate`], output: `${prefix}_waste_quantity`, outputUnit: resource.outputUnit, roundingPolicy: "ROUND_6" },
        { ...common, formulaNodeId: `${prefix}_gross_quantity`, operation: "ADD", inputs: [`${prefix}_net_quantity`, `${prefix}_waste_quantity`], output: `${prefix}_gross_quantity`, outputUnit: resource.outputUnit, roundingPolicy: "ROUND_6" },
        { ...common, formulaNodeId: `${prefix}_package_count`, operation: "CEIL_DIVIDE", inputs: [`${prefix}_gross_quantity`, `${prefix}_package_size`], output: `${prefix}_package_count`, outputUnit: "pcs", roundingPolicy: "CEIL_INTEGER" },
        { ...common, formulaNodeId: `${prefix}_purchase_quantity`, operation: "MULTIPLY", inputs: [`${prefix}_package_count`, `${prefix}_package_size`], output: `${prefix}_purchase_quantity`, outputUnit: resource.outputUnit, roundingPolicy: "ROUND_6" },
      ];
    });
    const boq = seed.resources.map((resource): ReferenceBoqRowV4 => ({
      rowDefinitionId: `${workId}_${resource.resourceId}`,
      semanticOwner: professionalEstimatePassportId(workId),
      category: "materials",
      professionalNameRu: resource.professionalNameRu,
      unit: resource.outputUnit,
      formulaNodeId: `${workId}_${resource.resourceId}_purchase_quantity`,
      sourceId: "transparent_editable_assumption",
      sourceClaimId: `${workId}_${resource.resourceId}:presence`,
      semanticKey: `${workId}.${resource.resourceId}`,
      inclusionReason: "Отдельный профессиональный ресурс выбранной технологии; расход видим и редактируем",
      priceState: "PRICE_REQUIRED",
    }));
    for (const resource of seed.resources) {
      const materialResourceId = `${workId}:${resource.resourceId}`;
      const presenceClaimId = `${workId}_${resource.resourceId}:presence`;
      const consumptionClaimId = `${workId}_${resource.resourceId}:consumption`;
      const wasteClaimId = `${workId}_${resource.resourceId}:waste`;
      const packageClaimId = `${workId}_${resource.resourceId}:package`;
      MULTI_DOMAIN_ATOMIC_MATERIAL_RESOURCES_V4.push({
        materialResourceId,
        passportId: professionalEstimatePassportId(workId),
        semanticKey: `${workId}.${resource.resourceId}`,
        nameRu: resource.professionalNameRu,
        procurementNameRu: resource.professionalNameRu,
        resourceClass: "CONSUMABLE",
        unit: resource.outputUnit,
        dimension: resource.outputUnit,
        quantityFormulaNodeId: `${workId}_${resource.resourceId}_purchase_quantity`,
        baseQuantityDriver: seed.primaryFormulaId,
        coefficientBindings: [`${workId}_${resource.resourceId}_rate`],
        wasteBinding: `${workId}_${resource.resourceId}_waste_rate`,
        packageRoundingBinding: `${workId}_${resource.resourceId}_package_size`,
        materialPresenceSourceClaimId: presenceClaimId,
        quantitySourceClaimIds: [consumptionClaimId, wasteClaimId, packageClaimId],
        procurementEligible: true,
        includedInEstimateTotal: true,
        priceSource: "NOT_PRICED",
        assumptions: ["Rate, waste and package values remain visible and revision-bound."],
        exclusions: ["Market price is not inferred.", "Foreign reference is not KG law."],
        version: "1.0.0",
      });
      MULTI_DOMAIN_MATERIAL_SOURCE_CLAIMS_V4.push(
        { claimId: presenceClaimId, materialResourceId, claimType: "MATERIAL_PRESENCE", sourceId: PRESENCE_SOURCE_BY_WORK[workId], sourceRole: "CIS_REFERENCE_METHOD", locator: "work-specific open reference", paraphrasedClaim: "Материал применим к выбранной технологии.", applicability: workId },
        { claimId: consumptionClaimId, materialResourceId, claimType: "CONSUMPTION_RATE", sourceId: "project_material_rate_input", sourceRole: "PROJECT_INPUT", locator: `${workId}_${resource.resourceId}_rate`, paraphrasedClaim: "Расход является видимым редактируемым параметром проекта.", applicability: workId },
        { claimId: wasteClaimId, materialResourceId, claimType: "WASTE_RATE", sourceId: "project_material_waste_input", sourceRole: "PROJECT_INPUT", locator: `${workId}_${resource.resourceId}_waste_rate`, paraphrasedClaim: "Отход задаётся отдельно и применяется один раз.", applicability: workId },
        { claimId: packageClaimId, materialResourceId, claimType: "PACKAGE_SIZE", sourceId: "supplier_package_input", sourceRole: "PROJECT_INPUT", locator: `${workId}_${resource.resourceId}_package_size`, paraphrasedClaim: "Размер упаковки хранится отдельно и редактируется по поставщику.", applicability: workId },
      );
    }
    return [workId, { parameters, formulaGraph, boq }];
  }));
