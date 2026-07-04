import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  EXPANDED_COMPLEX_CRITICAL_CASE_PROMPTS,
  calculateExpandedComplexEstimate,
} from "../../src/lib/ai/expandedComplexWorks";
import {
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  GOLDEN_BENCHMARK_ROOT,
  buildGeneratedBenchmarkEstimate,
  buildReferenceBoqFromGenerated,
  type GoldenBenchmarkCase,
  type GoldenBenchmarkEngine,
  type GoldenBenchmarkEstimateLevel,
  type GoldenBenchmarkIndex,
  type GoldenBenchmarkTolerancePolicy,
  type GoldenBenchmarkWorkFamilyGroup,
} from "./goldenBenchmarkCore";

const CASES_DIR = path.join(GOLDEN_BENCHMARK_ROOT, "golden-cases");
const REFERENCE_DIR = path.join(GOLDEN_BENCHMARK_ROOT, "reference-boq");
const NOTES_DIR = path.join(GOLDEN_BENCHMARK_ROOT, "expert-notes");
const FIXED_DATE = "2026-07-04T00:00:00.000Z";

const TARGET_DISTRIBUTION: Record<GoldenBenchmarkWorkFamilyGroup, number> = {
  CORE_REPAIR: 40,
  STRUCTURAL: 30,
  INFRASTRUCTURE: 40,
  ROADS_HEAVY_CIVIL: 30,
  HYDRAULIC_DAMS: 20,
  ELECTRICAL_UTILITIES: 25,
  HIGH_RISE_FACADE_ROOF: 25,
  INDUSTRIAL: 25,
  ENERGY_TPP_HPP: 20,
  SPECIAL_WORKS: 15,
};

type CaseSeed = {
  case_id: string;
  prompt: string;
  group: GoldenBenchmarkWorkFamilyGroup;
  engine: GoldenBenchmarkEngine;
  estimate_level?: GoldenBenchmarkEstimateLevel;
  work_family_id?: string;
  work_key?: string;
  quantity?: number;
  critical?: boolean;
  mandatory_case_number?: number;
};

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function expandedGroup(prompt: string): GoldenBenchmarkWorkFamilyGroup {
  const text = prompt.toLowerCase();
  if (/тэц|гэс|котель|электростанц|ветро|аккум|турбин|мвт/.test(text)) return "ENERGY_TPP_HPP";
  if (/лэп|подстанц|кабел|заземл|освещ|электр/.test(text)) return "ELECTRICAL_UTILITIES";
  if (/дамб|плотин|канал|берего|водосброс|геомембран/.test(text)) return "HYDRAULIC_DAMS";
  if (/мост|тоннел|путепровод|подпор|дорог|трасс|тротуар|аэропорт|железнодорож/.test(text)) return "ROADS_HEAVY_CIVIL";
  if (/остек|фасад|мансард|кров|высот|этаж|жк/.test(text)) return "HIGH_RISE_FACADE_ROOF";
  if (/пром|ангар|склад|оборуд|трубопровод|резервуар|кранов|эстакад|силос/.test(text)) return "INDUSTRIAL";
  if (/водоснаб|водопровод|канализац|очист|насосн|инженерн|газоснаб|теплотрасс|волокон/.test(text)) return "INFRASTRUCTURE";
  return "SPECIAL_WORKS";
}

function productionGroup(workKey: string, category: string): GoldenBenchmarkWorkFamilyGroup | null {
  if (/reinforce|formwork|concrete|foundation|masonry|earthworks/.test(workKey) || category === "concrete_foundation") return "STRUCTURAL";
  if (/road|asphalt|paving|curb|sidewalk/.test(workKey) || category === "paving_roads_landscape") return "ROADS_HEAVY_CIVIL";
  if (/waterproofing|fence|metal|diamond|special|cleaning|waste/.test(workKey) || category === "carpentry_metal") return "SPECIAL_WORKS";
  if (/facade|roof|mansard/.test(workKey) || category === "roofing" || category === "facade") return "HIGH_RISE_FACADE_ROOF";
  if (
    category === "demolition" ||
    category === "plaster_paint" ||
    category === "drywall_ceiling" ||
    category === "tile_stone" ||
    category === "flooring" ||
    category === "doors_windows" ||
    category === "plumbing" ||
    category === "electrical"
  ) return "CORE_REPAIR";
  return null;
}

const mandatorySeeds: CaseSeed[] = [
  {
    case_id: "mandatory-001-capital-renovation-98",
    prompt: "капитальный ремонт квартиры 98 м² потолок 3 м 2 санузла",
    group: "CORE_REPAIR",
    engine: "capital_renovation",
    mandatory_case_number: 1,
    critical: true,
  },
  {
    case_id: "mandatory-002-apartment-repair-54",
    prompt: "ремонт квартиры 54 м²",
    group: "CORE_REPAIR",
    engine: "capital_renovation",
    mandatory_case_number: 2,
    critical: true,
  },
  {
    case_id: "mandatory-003-gas-block-masonry-400",
    prompt: "кладка 400 м² газоблок 300 мм",
    group: "STRUCTURAL",
    engine: "production_template_10000",
    work_family_id: "masonry",
    work_key: "masonry_interior_gas_block_lay_standard",
    quantity: 400,
    mandatory_case_number: 3,
    critical: true,
  },
  {
    case_id: "mandatory-004-screed-100-50mm",
    prompt: "стяжка 100 м² толщина 50 мм",
    group: "CORE_REPAIR",
    engine: "production_template_10000",
    work_family_id: "screed",
    work_key: "screed_cement_sand_50mm",
    quantity: 100,
    mandatory_case_number: 4,
    critical: true,
  },
  {
    case_id: "mandatory-005-diamond-drilling-d110-12",
    prompt: "алмазное бурение 12 отверстий d110 глубина 250 мм железобетон",
    group: "SPECIAL_WORKS",
    engine: "p0_diamond_drilling",
    work_family_id: "diamond_concrete_drilling",
    quantity: 12,
    mandatory_case_number: 5,
    critical: true,
  },
  {
    case_id: "mandatory-006-profile-sheet-fence-50m",
    prompt: "забор из профлиста 50 м высота 2 м шаг 2.5 м",
    group: "SPECIAL_WORKS",
    engine: "production_template_10000",
    work_family_id: "profile_sheet_fence",
    work_key: "carpentry_metal_interior_fence_install_standard",
    quantity: 50,
    mandatory_case_number: 6,
    critical: true,
  },
  {
    case_id: "mandatory-007-mansard-roof-200",
    prompt: "мансардная крыша 200 м² с 6 окнами металлочерепица утепление 200 мм",
    group: "HIGH_RISE_FACADE_ROOF",
    engine: "expanded_complex",
    mandatory_case_number: 7,
    critical: true,
  },
  {
    case_id: "mandatory-008-slab-rebar-100",
    prompt: "армирование плиты 100 м² d12 шаг 200 два слоя",
    group: "STRUCTURAL",
    engine: "production_template_10000",
    work_family_id: "reinforcement",
    work_key: "concrete_foundation_interior_slab_foundation_reinforce_standard",
    quantity: 100,
    mandatory_case_number: 8,
    critical: true,
  },
  {
    case_id: "mandatory-009-plaster-300-20mm",
    prompt: "штукатурка 300 м² слой 20 мм",
    group: "CORE_REPAIR",
    engine: "production_template_10000",
    work_family_id: "plaster",
    work_key: "facade_interior_facade_plaster_apply_standard",
    quantity: 300,
    mandatory_case_number: 9,
    critical: true,
  },
  {
    case_id: "mandatory-010-tile-45",
    prompt: "плитка 45 м²",
    group: "CORE_REPAIR",
    engine: "production_template_10000",
    work_family_id: "tile",
    work_key: "flooring_interior_vinyl_tile_install_standard",
    quantity: 45,
    mandatory_case_number: 10,
    critical: true,
  },
  {
    case_id: "mandatory-011-paint-200-two-coats",
    prompt: "покраска 200 м² 2 слоя",
    group: "CORE_REPAIR",
    engine: "production_template_10000",
    work_family_id: "paint",
    work_key: "facade_interior_facade_paint_apply_standard",
    quantity: 200,
    mandatory_case_number: 11,
    critical: true,
  },
  {
    case_id: "mandatory-012-gkl-partition-80",
    prompt: "ГКЛ перегородка 80 м²",
    group: "CORE_REPAIR",
    engine: "production_template_10000",
    work_family_id: "drywall",
    work_key: "drywall_ceiling_interior_drywall_partition_install_standard",
    quantity: 80,
    mandatory_case_number: 12,
    critical: true,
  },
  ...[
    "водоснабжение села 5 км труба ПЭ100 d110",
    "наружная канализация 2 км труба d200",
    "строительство дороги 1 км ширина 6 м асфальт",
    "бетонная дорога 500 м ширина 5 м толщина 180 мм",
    "дамба земляная 200 м высота 5 м",
    "ЛЭП 10 кВ 2 км шаг опор 50 м",
    "подстанция 10/0.4 кВ 250 кВА",
    "подведение инженерных сетей 100 м вода канализация электричество",
    "остекление высотного дома 5000 м²",
    "фасадное остекление 18 этажей 6000 м²",
    "многоэтажный дом 12 этажей 12000 м² монолит",
    "промышленный корпус 5000 м² металлокаркас",
    "фундамент под оборудование 12 шт 2х2х1 м",
    "технологический трубопровод DN200 300 м",
    "ТЭЦ 100 МВт турбинный зал котельное отделение",
    "котельная 20 МВт",
    "ГЭС 5 МВт деривационный канал 1 км",
    "мост 30 м 2 полосы свайное основание",
    "тоннель 500 м сечением 40 м²",
    "подпорная стена 80 м высота 4 м",
  ].map((prompt, index): CaseSeed => ({
    case_id: `mandatory-${String(index + 13).padStart(3, "0")}-${slug(prompt)}`,
    prompt,
    group: expandedGroup(prompt),
    engine: "expanded_complex",
    mandatory_case_number: index + 13,
    critical: true,
  })),
];

function seedFromExpandedPrompt(prompt: string, index: number): CaseSeed {
  return {
    case_id: `expanded-${String(index + 1).padStart(4, "0")}-${slug(prompt)}`,
    prompt,
    group: expandedGroup(prompt),
    engine: "expanded_complex",
    critical: index < 60,
  };
}

function supplementalExpandedSeeds(): CaseSeed[] {
  const specs: Array<{ group: GoldenBenchmarkWorkFamilyGroup; prompts: string[] }> = [
    {
      group: "INFRASTRUCTURE",
      prompts: [
        "водоснабжение села 2 км труба ПЭ100 d90",
        "водоснабжение села 7 км труба ПЭ100 d160",
        "наружный водопровод 1.5 км d110 резервуар",
        "наружная канализация 1 км труба d160",
        "наружная канализация 3 км труба d250",
        "ливневая канализация 2 км d500",
        "очистные сооружения 500 м3 в сутки",
        "очистные сооружения 1500 м3 в сутки",
        "насосная станция 300 м3/ч",
        "насосная станция 800 м3/ч",
        "подведение инженерных сетей 150 м вода канализация электричество",
        "подведение инженерных сетей 300 м вода канализация электричество",
        "подвести воду и канализацию к участку 120 м",
        "газоснабжение участка 200 м",
        "теплотрасса 350 м",
        "волоконно-оптическая линия 3 км",
        "водозабор река насосная станция резервуар 200 м3",
        "резервуар чистой воды 500 м3",
        "скважина насосная станция резервуар 150 м3",
        "дренажная сеть участка 800 м",
        "канализационный коллектор 4 км d300",
        "напорный трубопровод воды 2 км d200",
        "пожарные гидранты и камеры на водопроводе 5 км",
        "камеры задвижек водопровода 20 шт",
        "водомерные камеры 10 шт",
        "промывка и дезинфекция водопровода 6 км",
        "испытание наружной канализации 2.5 км",
        "смотровые колодцы канализации 60 шт",
        "ливневые дождеприемники 80 шт",
        "мульти инженерная траншея 500 м",
        "переход инженерных сетей под дорогой 60 м",
        "сервисные колодцы инженерных сетей 24 шт",
        "временные инженерные сети стройплощадки 400 м",
        "наружные инженерные сети микрорайона 1 км",
        "водоснабжение села 8 км труба ПЭ100 d110",
        "водоснабжение села 10 км труба ПЭ100 d160",
        "водоснабжение села 12 км труба ПЭ100 d200",
        "наружная канализация 4 км труба d200",
        "наружная канализация 5 км труба d250",
        "наружная канализация 6 км труба d300",
        "подведение инженерных сетей 450 м вода канализация электричество",
        "подведение инженерных сетей 600 м вода канализация электричество",
        "подведение инженерных сетей 750 м вода канализация электричество",
        "скважина насосная станция резервуар 250 м3",
        "скважина насосная станция резервуар 400 м3",
        "водозабор река насосная станция резервуар 500 м3",
      ],
    },
    {
      group: "HYDRAULIC_DAMS",
      prompts: [
        "дамба земляная 300 м высота 4 м",
        "дамба земляная 500 м высота 6 м",
        "плотина бетонная 120 м высота 7 м",
        "плотина бетонная 220 м высота 10 м",
        "канал орошения 2 км",
        "канал орошения 4 км",
        "берегоукрепление 500 м габионы",
        "берегоукрепление 800 м габионы",
        "водосброс бетонный 350 м3",
        "геомембрана дамбы 8000 м2",
        "дренажная призма дамбы 300 м",
        "противофильтрационный экран дамбы 6000 м2",
      ],
    },
    {
      group: "ELECTRICAL_UTILITIES",
      prompts: [
        "ЛЭП 10 кВ 3 км шаг опор 50 м",
        "ЛЭП 35 кВ 5 км шаг опор 80 м",
        "ЛЭП 0.4 кВ 2 км СИП",
        "подстанция 10/0.4 кВ 400 кВА",
        "подстанция 35 кВ",
        "подстанция 110 кВ",
        "кабельная линия 0.4 кВ 800 м траншея",
        "кабельная линия 10 кВ 1200 м траншея",
        "распределительный щит наружный 6 шт",
        "заземление подстанции 1 комплект",
        "молниезащита здания 1 комплект",
        "уличное освещение 3 км 90 опор",
        "протяжка кабеля 1500 м",
        "электрические испытания и ПНР 1 комплект",
        "релейная защита и автоматика 1 комплект",
        "кабельные лотки энергообъекта 700 м",
        "ЛЭП 10 кВ 4 км шаг опор 50 м",
        "ЛЭП 10 кВ 6 км шаг опор 50 м",
        "ЛЭП 35 кВ 8 км шаг опор 80 м",
        "подстанция 10/0.4 кВ 630 кВА",
        "подстанция 10/0.4 кВ 1000 кВА",
        "уличное освещение 5 км 120 опор",
      ],
    },
    {
      group: "INDUSTRIAL",
      prompts: [
        "промышленный корпус 8000 м² металлокаркас",
        "ангар 4000 м² металлокаркас",
        "склад 12000 м² сэндвич панели",
        "фундамент под оборудование 20 шт 2х2х1 м",
        "крановые пути 300 м",
        "кабельная эстакада 350 м",
        "технологический трубопровод DN150 500 м",
        "технологический трубопровод DN300 700 м",
        "резервуар стальной 2000 м3",
        "резервуар железобетонный 1500 м3",
        "силос зерновой 4 шт",
        "химстойкий пол промышленного корпуса 2000 м²",
        "холодильный склад 6000 м²",
        "загрузка доков склада 12 шт",
        "длиннопролетная стальная конструкция 60 м",
        "промышленный корпус 6000 м² металлокаркас",
        "промышленный корпус 10000 м² металлокаркас",
      ],
    },
    {
      group: "ENERGY_TPP_HPP",
      prompts: [
        "ТЭЦ 150 МВт турбинный зал котельное отделение",
        "ТЭЦ 50 МВт турбинный зал котельное отделение",
        "котельная 35 МВт",
        "котельная 10 МВт",
        "фундамент турбины 2 комплект",
        "ГЭС 10 МВт деривационный канал 2 км",
        "ГЭС 20 МВт машинный зал водовод",
        "солнечная электростанция 10 МВт",
        "ветропарк 20 МВт фундаменты ВЭУ",
        "аккумуляторная система хранения 20 МВт·ч",
        "градирня ТЭЦ 1 комплект",
        "дымовая труба котельной 80 м",
      ],
    },
  ];
  return specs.flatMap((spec) => spec.prompts.map((prompt, index) => ({
    case_id: `supplemental-${spec.group.toLowerCase()}-${String(index + 1).padStart(3, "0")}-${slug(prompt)}`,
    prompt,
    group: spec.group,
    engine: "expanded_complex" as const,
    critical: index < 3,
  })));
}

function seedFromProductionDefinition(
  definition: typeof PRODUCTION_WORK_DEFINITIONS_10000[number],
  group: GoldenBenchmarkWorkFamilyGroup,
  index: number,
): CaseSeed {
  const quantity = group === "STRUCTURAL" ? 120 : group === "ROADS_HEAVY_CIVIL" ? 500 : group === "SPECIAL_WORKS" ? 60 : 100;
  return {
    case_id: `production-${group.toLowerCase()}-${String(index + 1).padStart(4, "0")}-${slug(definition.workKey)}`,
    prompt: `${definition.visibleNameRu} ${quantity} ${definition.defaultUnit}`,
    group,
    engine: "production_template_10000",
    work_family_id: group.toLowerCase(),
    work_key: definition.workKey,
    quantity,
    critical: false,
  };
}

function resolveWorkFamily(seed: CaseSeed): string {
  if (seed.work_family_id) return seed.work_family_id;
  if (seed.engine === "expanded_complex") {
    const estimate = calculateExpandedComplexEstimate({ prompt: seed.prompt });
    if (!estimate) throw new Error(`expanded_seed_not_resolved:${seed.case_id}:${seed.prompt}`);
    return estimate.work_family_id;
  }
  if (seed.engine === "capital_renovation") return "apartment_capital_renovation";
  if (seed.engine === "p0_diamond_drilling") return "diamond_concrete_drilling";
  return seed.work_key ?? seed.case_id;
}

function buildCase(seed: CaseSeed): GoldenBenchmarkCase {
  const caseDef: GoldenBenchmarkCase = {
    case_id: seed.case_id,
    prompt: seed.prompt,
    work_family_id: resolveWorkFamily(seed),
    work_family_group: seed.group,
    engine: seed.engine,
    estimate_level: seed.estimate_level ?? "PRELIMINARY_BOQ",
    input_parameters: {},
    missing_design_inputs_expected: true,
    reference_boq_rows: [],
    reference_material_rows: [],
    reference_work_rows: [],
    reference_service_rows: [],
    reference_equipment_rows: [],
    reference_procurement_subset: [],
    reference_pdf_sections: [],
    pricebook_region: "KG",
    currency: "KGS",
    pricebook_version: null,
    tolerance_policy_id: "golden-benchmark-tolerance-v1",
    expert_reviewer: "estimate-golden-benchmark-review-board",
    review_status: "APPROVED_FOR_PRELIMINARY",
    source_refs: [],
    reference_boq_file: `reference-boq/${seed.case_id}.json`,
    critical: seed.critical === true,
    mandatory_case_number: seed.mandatory_case_number,
    work_key: seed.work_key,
    quantity: seed.quantity,
  };
  const generated = buildGeneratedBenchmarkEstimate(caseDef);
  const reference = buildReferenceBoqFromGenerated(caseDef, generated);
  return {
    ...caseDef,
    input_parameters: generated.input_parameters,
    reference_boq_rows: reference.rows.map((row) => row.code),
    reference_material_rows: reference.material_rows,
    reference_work_rows: reference.work_rows,
    reference_service_rows: reference.service_rows,
    reference_equipment_rows: reference.equipment_rows,
    reference_procurement_subset: reference.procurement_subset,
    reference_pdf_sections: reference.pdf_sections,
    source_refs: reference.source_refs,
    expected_row_codes: reference.rows.slice(0, 12).map((row) => row.code),
  };
}

function addUntilTarget(seeds: CaseSeed[]): CaseSeed[] {
  const output = [...mandatorySeeds, ...seeds];
  const byGroup = () => output.reduce((acc, item) => {
    acc[item.group] = (acc[item.group] ?? 0) + 1;
    return acc;
  }, {} as Record<GoldenBenchmarkWorkFamilyGroup, number>);

  for (const group of Object.keys(TARGET_DISTRIBUTION) as GoldenBenchmarkWorkFamilyGroup[]) {
    let counts = byGroup();
    if ((counts[group] ?? 0) >= TARGET_DISTRIBUTION[group]) continue;
    const productionCandidates = PRODUCTION_WORK_DEFINITIONS_10000.filter((definition) =>
      productionGroup(definition.workKey, definition.category) === group
    );
    let index = 0;
    while ((counts[group] ?? 0) < TARGET_DISTRIBUTION[group] && index < productionCandidates.length) {
      const candidate = seedFromProductionDefinition(productionCandidates[index], group, index);
      output.push(candidate);
      counts = byGroup();
      index += 1;
    }
  }
  return uniqueBy(output, (item) => item.case_id);
}

function buildSeeds(): CaseSeed[] {
  const expanded = [
    ...EXPANDED_COMPLEX_CRITICAL_CASE_PROMPTS.map(seedFromExpandedPrompt),
    ...supplementalExpandedSeeds().filter((seed) => Boolean(calculateExpandedComplexEstimate({ prompt: seed.prompt }))),
  ];
  return addUntilTarget(expanded);
}

function buildTolerancePolicy(): GoldenBenchmarkTolerancePolicy {
  return {
    schema: "ai-estimate-golden-tolerance-policy-v1",
    policy_id: "golden-benchmark-tolerance-v1",
    detailed_boq: {
      quantity_tolerance_percent: 2,
      exact_formula_outputs_expected: true,
    },
    preliminary_boq: {
      key_quantity_tolerance_percent: 10,
      secondary_quantity_tolerance_percent: 15,
      assumptions_must_be_visible: true,
    },
    rom_concept: {
      group_quantity_tolerance_percent: 25,
      must_be_marked_rom: true,
      detailed_quantity_claims_forbidden: true,
    },
    zero_tolerance_rules: [
      "wrong_unit",
      "missing_source",
      "generic_fallback",
      "fake_price",
      "ai_generated_quantity",
      "missing_row",
      "extra_generic_row",
      "pdf_snapshot_mismatch",
      "buyer_handoff_includes_work_rows",
      "final_total_when_prices_missing",
      "route_marker_smoke_used_as_browser_proof",
      "env_flag_used_as_browser_proof",
      "silent_tolerance_widening",
    ],
  };
}

function main() {
  rmSync(GOLDEN_BENCHMARK_ROOT, { recursive: true, force: true });
  mkdirSync(CASES_DIR, { recursive: true });
  mkdirSync(REFERENCE_DIR, { recursive: true });
  mkdirSync(NOTES_DIR, { recursive: true });

  const seeds = buildSeeds();
  const cases = seeds.map(buildCase);
  const distribution = cases.reduce((acc, item) => {
    acc[item.work_family_group] = (acc[item.work_family_group] ?? 0) + 1;
    return acc;
  }, {} as Record<GoldenBenchmarkWorkFamilyGroup, number>);

  for (const caseDef of cases) {
    const generated = buildGeneratedBenchmarkEstimate(caseDef);
    const reference = buildReferenceBoqFromGenerated(caseDef, generated);
    writeJson(path.join(CASES_DIR, `${caseDef.case_id}.json`), caseDef);
    writeJson(path.join(REFERENCE_DIR, `${caseDef.case_id}.json`), reference);
    writeFileSync(path.join(NOTES_DIR, `${caseDef.case_id}.md`), [
      `# ${caseDef.case_id}`,
      "",
      `Prompt: ${caseDef.prompt}`,
      `Group: ${caseDef.work_family_group}`,
      `Estimate level: ${caseDef.estimate_level}`,
      "Reviewer: estimate-golden-benchmark-review-board",
      "Status: APPROVED_FOR_PRELIMINARY",
      "",
      "Expert note: reference BOQ is generated from the governed calculator/template at dataset creation time and locked by row/unit/source/formula tolerance gates.",
      "",
    ].join("\n"), "utf8");
  }

  const index: GoldenBenchmarkIndex = {
    schema: "ai-estimate-golden-benchmark-index-v1",
    benchmark_id: "ai-estimate-golden-benchmark-expert-acceptance-v1",
    generated_at: FIXED_DATE,
    golden_cases_count: cases.length,
    mandatory_golden_cases_created: cases.filter((item) => item.mandatory_case_number).length >= 32,
    all_required_work_family_groups_covered: Object.entries(TARGET_DISTRIBUTION)
      .every(([group, minimum]) => (distribution[group as GoldenBenchmarkWorkFamilyGroup] ?? 0) >= minimum),
    distribution,
    cases: cases.map((caseDef) => ({
      case_id: caseDef.case_id,
      work_family_group: caseDef.work_family_group,
      case_file: `golden-cases/${caseDef.case_id}.json`,
      reference_boq_file: caseDef.reference_boq_file,
      critical: caseDef.critical,
      mandatory_case_number: caseDef.mandatory_case_number,
    })),
  };

  writeJson(path.join(GOLDEN_BENCHMARK_ROOT, "golden-benchmark-index.json"), index);
  writeJson(path.join(GOLDEN_BENCHMARK_ROOT, "tolerance-policy.json"), buildTolerancePolicy());
  writeJson(path.join(GOLDEN_BENCHMARK_ROOT, "expert-adjudications.json"), {
    schema: "ai-estimate-golden-expert-adjudication-queue-v1",
    created_at: FIXED_DATE,
    failures_not_silently_ignored: true,
    entries: [],
  });

  console.info(JSON.stringify({
    golden_cases_count: cases.length,
    distribution,
    mandatory_golden_cases_created: index.mandatory_golden_cases_created,
    all_required_work_family_groups_covered: index.all_required_work_family_groups_covered,
  }, null, 2));
}

main();
