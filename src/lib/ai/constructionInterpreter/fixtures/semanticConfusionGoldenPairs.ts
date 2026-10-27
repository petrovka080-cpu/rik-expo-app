import type {
  ConstructionDomain,
  ConstructionMethod,
  ConstructionObject,
  ConstructionOperation,
  ConstructionWorkKey,
} from "../constructionSemanticTypes";

export type SemanticGoldenRoute = "/request" | "/ai?context=foreman";

export type SemanticGoldenPrompt = {
  id: string;
  route: SemanticGoldenRoute;
  prompt: string;
  expected: {
    workKey: ConstructionWorkKey;
    domain: ConstructionDomain;
    object: ConstructionObject;
    operation: ConstructionOperation;
    method?: ConstructionMethod;
  };
  requiredRows?: string[];
  forbiddenRows?: string[];
  forbiddenWorkKeys?: ConstructionWorkKey[];
  minimumRows?: number;
};

export type SemanticConfusionGoldenPair = {
  id: string;
  rule: string;
  positives: SemanticGoldenPrompt[];
  controls?: SemanticGoldenPrompt[];
};

export const SEMANTIC_CONFUSION_GOLDEN_PAIRS: SemanticConfusionGoldenPair[] = [
  {
    id: "paving_stone_vs_brick_masonry",
    rule: "object noun beats generic verb",
    positives: [
      {
        id: "paving_stone_587_foreman",
        route: "/ai?context=foreman",
        prompt: "смета на укладку брусчатки на 587 кв м",
        expected: {
          workKey: "paving_stone_laying",
          domain: "paving",
          object: "paving_stone_surface",
          operation: "laying",
          method: "layered_paving_base",
        },
        requiredRows: ["брусчатка", "тротуарная плитка", "щебень", "бордюр", "виброуплотнение"],
        forbiddenRows: ["кирпич", "кирпичная кладка", "раствор", "кладочная сетка"],
        forbiddenWorkKeys: ["brick_masonry"],
        minimumRows: 14,
      },
      {
        id: "paving_tile_120_request",
        route: "/request",
        prompt: "уложить тротуарную плитку 120 м2",
        expected: {
          workKey: "paving_stone_laying",
          domain: "paving",
          object: "paving_stone_surface",
          operation: "laying",
          method: "layered_paving_base",
        },
      },
      {
        id: "paving_yard_80_foreman",
        route: "/ai?context=foreman",
        prompt: "мощение брусчаткой двор 80 м2",
        expected: {
          workKey: "paving_stone_laying",
          domain: "paving",
          object: "paving_stone_surface",
          operation: "laying",
          method: "layered_paving_base",
        },
      },
    ],
    controls: [
      {
        id: "brick_masonry_74_request",
        route: "/request",
        prompt: "смета на кладку кирпича 74 кв м",
        expected: {
          workKey: "brick_masonry",
          domain: "masonry",
          object: "brick_wall",
          operation: "masonry",
          method: "masonry_mortar",
        },
        requiredRows: ["кирпич", "раствор", "кладка"],
      },
      {
        id: "brick_wall_foreman",
        route: "/ai?context=foreman",
        prompt: "кладка стены из кирпича",
        expected: {
          workKey: "brick_masonry",
          domain: "masonry",
          object: "brick_wall",
          operation: "masonry",
          method: "masonry_mortar",
        },
      },
      {
        id: "brick_partition_request",
        route: "/request",
        prompt: "кирпичная кладка перегородки",
        expected: {
          workKey: "brick_masonry",
          domain: "masonry",
          object: "brick_wall",
          operation: "masonry",
          method: "masonry_mortar",
        },
      },
    ],
  },
  {
    id: "metal_canopy_not_generic",
    rule: "canopy object requires canopy-specific BOQ rows",
    positives: [
      {
        id: "metal_canopy_647_foreman",
        route: "/ai?context=foreman",
        prompt: "смета на металлический навес на площади 647 кв метров",
        expected: {
          workKey: "metal_canopy_installation",
          domain: "metalworks",
          object: "metal_canopy",
          operation: "installation",
          method: "welded_metal_frame",
        },
        requiredRows: [
          "стойки металлические",
          "фермы",
          "балки",
          "прогоны",
          "связи",
          "раскосы",
          "фундаменты под стойки",
          "закладные",
          "анкера",
          "кровельное покрытие",
          "водосток",
          "антикоррозионная грунтовка",
          "монтаж металлокаркаса",
          "кран",
          "автовышка",
        ],
        forbiddenRows: ["дополнительные материалы", "дополнительные работы"],
        minimumRows: 18,
      },
      {
        id: "metal_canopy_300_request",
        route: "/request",
        prompt: "монтаж навеса из металлоконструкций 300 м2",
        expected: {
          workKey: "metal_canopy_installation",
          domain: "metalworks",
          object: "metal_canopy",
          operation: "installation",
          method: "welded_metal_frame",
        },
      },
      {
        id: "metal_canopy_profiled_sheet_foreman",
        route: "/ai?context=foreman",
        prompt: "навес с металлическим каркасом и профнастилом",
        expected: {
          workKey: "metal_canopy_installation",
          domain: "metalworks",
          object: "metal_canopy",
          operation: "installation",
          method: "welded_metal_frame",
        },
      },
    ],
  },
  {
    id: "gable_roof_not_repair_roof",
    rule: "gable roof installation must not degrade to roof repair",
    positives: [
      {
        id: "gable_roof_67_foreman",
        route: "/ai?context=foreman",
        prompt: "дай смету на установку двухскатной крыши высота конька 2,5 метра и основание 67 кв м",
        expected: {
          workKey: "gable_roof_installation",
          domain: "roofing",
          object: "gable_roof",
          operation: "installation",
          method: "pitched_roof_system",
        },
        requiredRows: [
          "мауэрлат",
          "стропила",
          "коньковый прогон",
          "мембрана",
          "контробрешётка",
          "обрешётка",
          "кровельное покрытие",
          "доборные элементы",
          "монтаж стропильной системы",
          "монтаж кровли",
        ],
        forbiddenRows: ["ремонт кровли", "2 пог.м"],
        minimumRows: 18,
      },
      {
        id: "gable_roof_124_request",
        route: "/request",
        prompt: "устройство двускатной крыши основание 124 кв м высота конька 2 м",
        expected: {
          workKey: "gable_roof_installation",
          domain: "roofing",
          object: "gable_roof",
          operation: "installation",
          method: "pitched_roof_system",
        },
      },
      {
        id: "gable_roof_mounting_foreman",
        route: "/ai?context=foreman",
        prompt: "монтаж двускатной кровли",
        expected: {
          workKey: "gable_roof_installation",
          domain: "roofing",
          object: "gable_roof",
          operation: "installation",
          method: "pitched_roof_system",
        },
      },
    ],
  },
  {
    id: "roof_waterproofing_not_bathroom",
    rule: "roof noun must beat generic waterproofing templates",
    positives: [
      {
        id: "roof_waterproofing_100_foreman",
        route: "/ai?context=foreman",
        prompt: "смета на гидроизоляцию крыши 100 кв м",
        expected: {
          workKey: "roof_waterproofing",
          domain: "roofing",
          object: "roof",
          operation: "waterproofing",
          method: "roof_membrane_or_mastic",
        },
        requiredRows: ["праймер", "кровли", "мембрана", "мастика", "герметизация"],
        forbiddenRows: ["ванная", "санузел", "душевая", "плитка в ванной"],
        forbiddenWorkKeys: ["bathroom_waterproofing"],
        minimumRows: 12,
      },
      {
        id: "roof_waterproofing_250_request",
        route: "/request",
        prompt: "гидроизоляция кровли 250 м2",
        expected: {
          workKey: "roof_waterproofing",
          domain: "roofing",
          object: "roof",
          operation: "waterproofing",
          method: "roof_membrane_or_mastic",
        },
      },
      {
        id: "flat_roof_waterproofing_foreman",
        route: "/ai?context=foreman",
        prompt: "гидроизоляция плоской крыши",
        expected: {
          workKey: "roof_waterproofing",
          domain: "roofing",
          object: "roof",
          operation: "waterproofing",
          method: "roof_membrane_or_mastic",
        },
      },
    ],
    controls: [
      {
        id: "bathroom_waterproofing_20_request",
        route: "/request",
        prompt: "гидроизоляция ванной 20 кв м",
        expected: {
          workKey: "bathroom_waterproofing",
          domain: "waterproofing",
          object: "bathroom",
          operation: "waterproofing",
          method: "wet_area_waterproofing",
        },
      },
      {
        id: "bathroom_waterproofing_foreman",
        route: "/ai?context=foreman",
        prompt: "гидроизоляция санузла",
        expected: {
          workKey: "bathroom_waterproofing",
          domain: "waterproofing",
          object: "bathroom",
          operation: "waterproofing",
          method: "wet_area_waterproofing",
        },
      },
    ],
  },
  {
    id: "linoleum_not_template_gap",
    rule: "known flooring work must produce professional BOQ",
    positives: [
      {
        id: "linoleum_100_request",
        route: "/request",
        prompt: "Хочу уложить линолеум на 100 кв м",
        expected: {
          workKey: "linoleum_laying",
          domain: "flooring",
          object: "linoleum_floor",
          operation: "laying",
          method: "adhesive_flooring",
        },
        requiredRows: [
          "подготовка основания",
          "ремонт локальных дефектов",
          "линолеум",
          "клей",
          "фиксация",
          "плинтус",
          "порожки",
          "раскрой линолеума",
          "укладка линолеума",
          "подрезка примыканий",
        ],
        forbiddenRows: ["template gap", "manual-only review", "unknown work", "generic flooring"],
        minimumRows: 12,
      },
      {
        id: "linoleum_55_foreman",
        route: "/ai?context=foreman",
        prompt: "смета на укладку линолеума 55 м2",
        expected: {
          workKey: "linoleum_laying",
          domain: "flooring",
          object: "linoleum_floor",
          operation: "laying",
          method: "adhesive_flooring",
        },
      },
      {
        id: "linoleum_apartment_request",
        route: "/request",
        prompt: "постелить линолеум в квартире",
        expected: {
          workKey: "linoleum_laying",
          domain: "flooring",
          object: "linoleum_floor",
          operation: "laying",
          method: "adhesive_flooring",
        },
      },
    ],
  },
];

export const SEMANTIC_CONFUSION_GOLDEN_PROMPTS: SemanticGoldenPrompt[] =
  SEMANTIC_CONFUSION_GOLDEN_PAIRS.flatMap((pair) => [...pair.positives, ...(pair.controls ?? [])]);
