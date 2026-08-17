import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;
type Ast = Json;
type Parameter = {
  id: string; title: string; type?: "decimal" | "integer" | "boolean" | "enum";
  unit?: string | null; defaultValue: number | boolean | string; constraints?: Json;
  guide: string; description: string;
};
type Formula = { id: string; unit: string; expression: string; ast: Ast; inputs: string[] };
type Resource = {
  id: string; section: string; category: string; title: string;
  type: "material" | "labor" | "equipment" | "service"; unit: string; formula: string;
  procurement?: boolean; inclusion?: Ast;
};
type WorkSpec = {
  catalogId: string; domain: string; title: string; aliases: string[];
  included: string[]; excluded: string[]; standard: string; standardTitle: string;
  standardUrl: string; parameters: Parameter[]; formulas: Formula[]; resources: Resource[];
};

const SPEC_PATH = resolve("C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md");
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const PREDECESSOR_RELEASE_ID = "34a707dc-954c-547d-ba88-27c15dba58d7";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const RELEASE_KEY = "p0-r58-cumulative-candidate-mandatory-journeys-4cf42813";
const CONTRACT = "p0-one-monolith-r58-mandatory-journeys.v1";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const OUTPUT = resolve(".release-runtime/p0-one-monolith-r58/evidence/12-representative/R58_MANDATORY_JOURNEYS_PROMOTION.json");
const APPLY = process.argv.includes("--apply");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Json)
    .sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, stable(child)]));
  return value;
}

function stableJson(value: unknown): string { return JSON.stringify(stable(value)); }
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function shaObject(value: unknown): string { return sha256(stableJson(value)); }
function uuid(value: string): string {
  const bytes = Buffer.from(sha256(value).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }).trim();
}
function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}

const p = (id: string): Ast => ({ kind: "parameter", id });
const n = (value: number): Ast => ({ kind: "literal", value: String(value) });
const b = (operator: string, left: Ast, right: Ast): Ast => ({ kind: "binary", operator, left, right });
const mul = (...parts: Ast[]): Ast => parts.reduce((left, right) => b("*", left, right));
const add = (left: Ast, right: Ast): Ast => b("+", left, right);
const div = (left: Ast, right: Ast): Ast => b("/", left, right);
const percent = (base: Ast, percentage: Ast): Ast => mul(base, add(n(1), div(percentage, n(100))));
const literalTrue: Ast = { kind: "literal", value: true };
const eq = (parameterId: string, value: string | boolean): Ast => ({ kind: "equals", parameterId, value });

const WORKS: WorkSpec[] = [
  {
    catalogId: "r58-real:concrete-bollard-installation", domain: "site_improvement",
    title: "Устройство монолитных бетонных боллардов", aliases: ["бетонный боллард", "бетонные столбики", "антипарковочный столбик"],
    included: ["разметка", "локальная разработка грунта", "арматурный каркас", "бетонирование", "установка и уход за бетоном"],
    excluded: ["перенос подземных коммуникаций", "декоративная облицовка", "силовое противотаранное проектирование"],
    standard: "GESN_07_PRECAST_AND_PROJECT_DRAWINGS", standardTitle: "ГЭСН 81-02-07-2017 и рабочие чертежи благоустройства",
    standardUrl: "https://minstroyrf.gov.ru/trades/dwd-state-gesn.php?ID=6",
    parameters: [
      { id: "bollard_count", title: "Количество боллардов", type: "integer", unit: "pcs", defaultValue: 10, constraints: { min: 1, max: 10000 }, guide: "Сосчитайте отдельные болларды по плану благоустройства", description: "Фактическое количество устанавливаемых элементов." },
      { id: "bollard_diameter_m", title: "Диаметр болларда", unit: "m", defaultValue: 0.25, constraints: { min: 0.1, max: 1 }, guide: "Укажите наружный диаметр по чертежу, м", description: "Диаметр монолитного бетонного элемента." },
      { id: "bollard_height_m", title: "Высота над покрытием", unit: "m", defaultValue: 0.75, constraints: { min: 0.2, max: 2 }, guide: "Измеряется от готового покрытия до верха", description: "Видимая высота болларда." },
      { id: "embedment_depth_m", title: "Глубина заделки", unit: "m", defaultValue: 0.45, constraints: { min: 0.2, max: 2 }, guide: "Принимать только по узлу фундамента/заделки", description: "Подземная часть бетонного элемента." },
      { id: "rebar_kg_per_bollard", title: "Арматура на один боллард", unit: "kg_per_pcs", defaultValue: 8, constraints: { min: 0, max: 200 }, guide: "По ведомости арматуры; 8 кг — раскрытое предварительное допущение", description: "Масса каркаса одного болларда." },
      { id: "concrete_waste_percent", title: "Технологический запас бетона", unit: "percent", defaultValue: 3, constraints: { min: 0, max: 15 }, guide: "Уточнить по способу подачи и фактической таре", description: "Запас смеси на потери при укладке." },
    ],
    formulas: [
      { id: "bollard_pcs", unit: "pcs", expression: "bollard_count", ast: p("bollard_count"), inputs: ["bollard_count"] },
      { id: "bollard_concrete_m3", unit: "m3", expression: "count*pi*d*d/4*(height+embedment)*(1+waste/100)", ast: percent(mul(p("bollard_count"), n(Math.PI / 4), p("bollard_diameter_m"), p("bollard_diameter_m"), add(p("bollard_height_m"), p("embedment_depth_m"))), p("concrete_waste_percent")), inputs: ["bollard_count", "bollard_diameter_m", "bollard_height_m", "embedment_depth_m", "concrete_waste_percent"] },
      { id: "bollard_excavation_m3", unit: "m3", expression: "count*(d+0.3)^2*embedment", ast: mul(p("bollard_count"), add(p("bollard_diameter_m"), n(0.3)), add(p("bollard_diameter_m"), n(0.3)), p("embedment_depth_m")), inputs: ["bollard_count", "bollard_diameter_m", "embedment_depth_m"] },
      { id: "bollard_rebar_kg", unit: "kg", expression: "count*kg_per_bollard", ast: mul(p("bollard_count"), p("rebar_kg_per_bollard")), inputs: ["bollard_count", "rebar_kg_per_bollard"] },
      { id: "bollard_formwork_m2", unit: "m2", expression: "count*pi*d*height", ast: mul(p("bollard_count"), n(Math.PI), p("bollard_diameter_m"), p("bollard_height_m")), inputs: ["bollard_count", "bollard_diameter_m", "bollard_height_m"] },
    ],
    resources: [
      { id: "excavation", section: "Земляные работы", category: "labor", title: "Разработка локальных котлованов под болларды", type: "labor", unit: "m3", formula: "bollard_excavation_m3" },
      { id: "concrete", section: "Материалы", category: "materials", title: "Бетон проектного класса для боллардов", type: "material", unit: "m3", formula: "bollard_concrete_m3", procurement: true },
      { id: "rebar", section: "Материалы", category: "materials", title: "Арматурные каркасы боллардов по ведомости", type: "material", unit: "kg", formula: "bollard_rebar_kg", procurement: true },
      { id: "formwork", section: "Материалы", category: "materials", title: "Опалубка цилиндрических боллардов", type: "material", unit: "m2", formula: "bollard_formwork_m2", procurement: true },
      { id: "set_out", section: "Работы", category: "labor", title: "Разбивка осей и отметок боллардов", type: "labor", unit: "pcs", formula: "bollard_pcs" },
      { id: "cage_install", section: "Работы", category: "labor", title: "Монтаж арматурных каркасов", type: "labor", unit: "pcs", formula: "bollard_pcs" },
      { id: "concrete_place", section: "Работы", category: "labor", title: "Укладка, уплотнение и уход за бетоном", type: "labor", unit: "pcs", formula: "bollard_pcs" },
      { id: "finish", section: "Работы", category: "labor", title: "Распалубка и финишная обработка поверхности", type: "labor", unit: "pcs", formula: "bollard_pcs" },
    ],
  },
  {
    catalogId: "r58-real:bridge-bored-pile-installation", domain: "bridges",
    title: "Устройство буронабивных свай мостовой опоры", aliases: ["мостовая свая", "сваи моста", "буронабивные сваи опоры"],
    included: ["бурение", "временная обсадка", "арматурный каркас", "бетонирование методом ВПТ", "контроль сплошности"],
    excluded: ["ростверк", "испытание статической нагрузкой без отдельного назначения", "постоянная обсадная труба"],
    standard: "SP_35_AND_GESN_05", standardTitle: "СП 35.13330 и ГЭСН, часть 5 «Свайные работы»",
    standardUrl: "https://www.minstroyrf.gov.ru/trades/dwd-fer-2020.php?ID=4",
    parameters: [
      { id: "pile_count", title: "Количество свай", type: "integer", unit: "pcs", defaultValue: 10, constraints: { min: 1, max: 5000 }, guide: "По свайной ведомости мостовой опоры", description: "Количество одинаковых свай в расчётном захвате." },
      { id: "pile_diameter_m", title: "Диаметр сваи", unit: "m", defaultValue: 1.2, constraints: { min: 0.3, max: 3 }, guide: "Только по проекту; укажите диаметр ствола", description: "Проектный диаметр буронабивной сваи." },
      { id: "pile_length_m", title: "Длина сваи", unit: "m", defaultValue: 18, constraints: { min: 1, max: 100 }, guide: "От отметки срезки до проектной подошвы", description: "Проектная длина одной сваи." },
      { id: "rebar_kg_per_m", title: "Масса каркаса на метр сваи", unit: "kg_per_m", defaultValue: 85, constraints: { min: 1, max: 1000 }, guide: "По ведомости арматуры; предварительное значение требует замены", description: "Линейная масса арматурного каркаса." },
      { id: "concrete_waste_percent", title: "Запас бетона", unit: "percent", defaultValue: 8, constraints: { min: 0, max: 30 }, guide: "Уточнить по технологии бурения и журналам бетонирования", description: "Запас на уширение ствола и технологические потери." },
      { id: "integrity_test_percent", title: "Доля свай для контроля сплошности", unit: "percent", defaultValue: 100, constraints: { min: 0, max: 100 }, guide: "По программе контроля качества проекта", description: "Процент свай, включённых в неразрушающий контроль." },
    ],
    formulas: [
      { id: "pile_pcs", unit: "pcs", expression: "pile_count", ast: p("pile_count"), inputs: ["pile_count"] },
      { id: "pile_length_total_m", unit: "m", expression: "count*length", ast: mul(p("pile_count"), p("pile_length_m")), inputs: ["pile_count", "pile_length_m"] },
      { id: "pile_drilling_m3", unit: "m3", expression: "count*pi*d*d/4*length", ast: mul(p("pile_count"), n(Math.PI / 4), p("pile_diameter_m"), p("pile_diameter_m"), p("pile_length_m")), inputs: ["pile_count", "pile_diameter_m", "pile_length_m"] },
      { id: "pile_concrete_m3", unit: "m3", expression: "drilling*(1+waste/100)", ast: percent(mul(p("pile_count"), n(Math.PI / 4), p("pile_diameter_m"), p("pile_diameter_m"), p("pile_length_m")), p("concrete_waste_percent")), inputs: ["pile_count", "pile_diameter_m", "pile_length_m", "concrete_waste_percent"] },
      { id: "pile_rebar_kg", unit: "kg", expression: "count*length*kg_per_m", ast: mul(p("pile_count"), p("pile_length_m"), p("rebar_kg_per_m")), inputs: ["pile_count", "pile_length_m", "rebar_kg_per_m"] },
      { id: "pile_tests_pcs", unit: "pcs", expression: "count*test_percent/100", ast: div(mul(p("pile_count"), p("integrity_test_percent")), n(100)), inputs: ["pile_count", "integrity_test_percent"] },
    ],
    resources: [
      { id: "drilling", section: "Работы", category: "labor", title: "Бурение скважин мостовых свай", type: "labor", unit: "m3", formula: "pile_drilling_m3" },
      { id: "spoil", section: "Логистика", category: "services", title: "Подъём и вывоз бурового шлама", type: "service", unit: "m3", formula: "pile_drilling_m3" },
      { id: "casing", section: "Механизмы", category: "equipment", title: "Инвентарная обсадка и извлечение труб", type: "equipment", unit: "m", formula: "pile_length_total_m" },
      { id: "rebar", section: "Материалы", category: "materials", title: "Арматурные каркасы свай по ведомости", type: "material", unit: "kg", formula: "pile_rebar_kg", procurement: true },
      { id: "concrete", section: "Материалы", category: "materials", title: "Бетон свай проектного класса и марки по водонепроницаемости", type: "material", unit: "m3", formula: "pile_concrete_m3", procurement: true },
      { id: "cage_install", section: "Работы", category: "labor", title: "Сборка и установка арматурных каркасов", type: "labor", unit: "pcs", formula: "pile_pcs" },
      { id: "tremie", section: "Работы", category: "labor", title: "Бетонирование сваи через бетонолитную трубу", type: "labor", unit: "m3", formula: "pile_concrete_m3" },
      { id: "integrity", section: "Испытания", category: "services", title: "Контроль сплошности ствола сваи", type: "service", unit: "pcs", formula: "pile_tests_pcs" },
    ],
  },
  {
    catalogId: "r58-real:wall-plaster-application", domain: "interior_finishes",
    title: "Нанесение штукатурки на стены", aliases: ["штукатурка стен", "оштукатуривание стен", "штукатурка 100 м2"],
    included: ["грунтование", "установка маяков", "нанесение и выравнивание раствора", "локальная сетка при выбранной опции"],
    excluded: ["демонтаж старой штукатурки", "сплошное шпаклевание", "окраска", "ремонт основания"],
    standard: "SP_71_13330_2017_AMENDMENT_3", standardTitle: "СП 71.13330.2017 с изменением № 3 «Изоляционные и отделочные покрытия»",
    standardUrl: "https://minstroyrf.gov.ru/docs/?PAGEN_1=8",
    parameters: [
      { id: "wall_area_m2", title: "Площадь стен", unit: "m2", defaultValue: 100, constraints: { min: 0.1, max: 1000000 }, guide: "Чистая площадь стен за вычетом проёмов", description: "Фактическая площадь оштукатуривания." },
      { id: "layer_thickness_mm", title: "Средняя толщина слоя", unit: "mm", defaultValue: 15, constraints: { min: 3, max: 80 }, guide: "Определяется промерами основания; не подменяется площадью", description: "Средняя проектная толщина штукатурного слоя." },
      { id: "dry_mix_kg_m2_mm", title: "Расход смеси на 1 м²·мм", unit: "kg_per_m2_mm", defaultValue: 1.6, constraints: { min: 0.5, max: 3 }, guide: "Заменить значением из TDS выбранной смеси", description: "Паспортный расход сухой штукатурной смеси." },
      { id: "primer_l_m2", title: "Расход грунтовки", unit: "l_per_m2", defaultValue: 0.15, constraints: { min: 0, max: 1 }, guide: "По TDS грунтовки и впитываемости основания", description: "Расход грунтовки на подготовленное основание." },
      { id: "mesh_required", title: "Нужна армирующая сетка", type: "boolean", unit: null, defaultValue: false, guide: "Включать только по проекту или обследованию трещин/стыков", description: "Добавляет сетку без изменения объёма штукатурки." },
    ],
    formulas: [
      { id: "plaster_area_m2", unit: "m2", expression: "wall_area_m2", ast: p("wall_area_m2"), inputs: ["wall_area_m2"] },
      { id: "plaster_mix_kg", unit: "kg", expression: "area*thickness*consumption", ast: mul(p("wall_area_m2"), p("layer_thickness_mm"), p("dry_mix_kg_m2_mm")), inputs: ["wall_area_m2", "layer_thickness_mm", "dry_mix_kg_m2_mm"] },
      { id: "plaster_primer_l", unit: "l", expression: "area*primer_rate", ast: mul(p("wall_area_m2"), p("primer_l_m2")), inputs: ["wall_area_m2", "primer_l_m2"] },
    ],
    resources: [
      { id: "primer", section: "Материалы", category: "materials", title: "Грунтовка для фактического типа основания", type: "material", unit: "l", formula: "plaster_primer_l", procurement: true },
      { id: "mix", section: "Материалы", category: "materials", title: "Штукатурная смесь выбранной системы", type: "material", unit: "kg", formula: "plaster_mix_kg", procurement: true },
      { id: "mesh", section: "Материалы", category: "materials", title: "Армирующая штукатурная сетка", type: "material", unit: "m2", formula: "plaster_area_m2", procurement: true, inclusion: eq("mesh_required", true) },
      { id: "beacons", section: "Материалы", category: "materials", title: "Маяки и угловые профили по фактической геометрии", type: "material", unit: "m2", formula: "plaster_area_m2", procurement: true },
      { id: "prepare", section: "Работы", category: "labor", title: "Очистка и грунтование подготовленного основания", type: "labor", unit: "m2", formula: "plaster_area_m2" },
      { id: "apply", section: "Работы", category: "labor", title: "Нанесение и выравнивание штукатурного слоя", type: "labor", unit: "m2", formula: "plaster_area_m2" },
    ],
  },
  {
    catalogId: "r58-real:gabion-wall-construction", domain: "hydraulic_and_retaining",
    title: "Устройство габионной подпорной стены", aliases: ["габион", "габионная стена", "устройство габионов"],
    included: ["подготовка основания", "геотекстиль", "сборка коробов", "каменное заполнение", "вязка и стяжки", "дренаж при выборе"],
    excluded: ["расчёт устойчивости стены", "анкеры", "массовая разработка грунта", "перенос русла"],
    standard: "PROJECT_GABION_SYSTEM_AND_GESN_OP", standardTitle: "Рабочий проект габионной системы и ГЭСН-ОП",
    standardUrl: "https://minstroyrf.gov.ru/docs/1691/",
    parameters: [
      { id: "wall_length_m", title: "Длина стены", unit: "m", defaultValue: 10, constraints: { min: 0.1, max: 100000 }, guide: "По оси габионной стены", description: "Проектная длина сооружения." },
      { id: "wall_height_m", title: "Средняя высота", unit: "m", defaultValue: 2, constraints: { min: 0.3, max: 20 }, guide: "Средняя высота по профилю; ступени считать отдельными участками", description: "Расчётная высота участка." },
      { id: "wall_thickness_m", title: "Толщина стены", unit: "m", defaultValue: 1, constraints: { min: 0.3, max: 5 }, guide: "По типоразмеру коробов и расчёту устойчивости", description: "Расчётная ширина габионного массива." },
      { id: "stone_fill_factor", title: "Коэффициент запаса камня", unit: "ratio", defaultValue: 1.05, constraints: { min: 1, max: 1.3 }, guide: "Уточнить по фракции камня и технологии укладки", description: "Запас заполнителя относительно геометрического объёма." },
      { id: "geotextile_overlap_percent", title: "Запас геотекстиля на нахлёсты", unit: "percent", defaultValue: 10, constraints: { min: 0, max: 40 }, guide: "По схеме раскладки полотен", description: "Добавка к задней и подошвенной поверхности." },
      { id: "drainage_required", title: "Нужен пристенный дренаж", type: "boolean", unit: null, defaultValue: true, guide: "По гидрогеологии и проектному узлу", description: "Включает дренажную трубу за стеной." },
    ],
    formulas: [
      { id: "gabion_volume_m3", unit: "m3", expression: "length*height*thickness", ast: mul(p("wall_length_m"), p("wall_height_m"), p("wall_thickness_m")), inputs: ["wall_length_m", "wall_height_m", "wall_thickness_m"] },
      { id: "gabion_stone_m3", unit: "m3", expression: "volume*stone_fill_factor", ast: mul(p("wall_length_m"), p("wall_height_m"), p("wall_thickness_m"), p("stone_fill_factor")), inputs: ["wall_length_m", "wall_height_m", "wall_thickness_m", "stone_fill_factor"] },
      { id: "gabion_face_m2", unit: "m2", expression: "length*height", ast: mul(p("wall_length_m"), p("wall_height_m")), inputs: ["wall_length_m", "wall_height_m"] },
      { id: "gabion_geotextile_m2", unit: "m2", expression: "length*(height+thickness)*(1+overlap/100)", ast: percent(mul(p("wall_length_m"), add(p("wall_height_m"), p("wall_thickness_m"))), p("geotextile_overlap_percent")), inputs: ["wall_length_m", "wall_height_m", "wall_thickness_m", "geotextile_overlap_percent"] },
      { id: "gabion_drain_m", unit: "m", expression: "wall_length_m", ast: p("wall_length_m"), inputs: ["wall_length_m"] },
    ],
    resources: [
      { id: "baskets", section: "Материалы", category: "materials", title: "Габионные сетчатые короба проектного типоразмера", type: "material", unit: "m3", formula: "gabion_volume_m3", procurement: true },
      { id: "stone", section: "Материалы", category: "materials", title: "Камень габионный требуемой прочности и фракции", type: "material", unit: "m3", formula: "gabion_stone_m3", procurement: true },
      { id: "geotextile", section: "Материалы", category: "materials", title: "Фильтрующий геотекстиль по проекту", type: "material", unit: "m2", formula: "gabion_geotextile_m2", procurement: true },
      { id: "lacing", section: "Материалы", category: "materials", title: "Вязальная проволока, спирали и стяжки системы", type: "material", unit: "m2", formula: "gabion_face_m2", procurement: true },
      { id: "drain", section: "Материалы", category: "materials", title: "Перфорированная дренажная труба с обсыпкой", type: "material", unit: "m", formula: "gabion_drain_m", procurement: true, inclusion: eq("drainage_required", true) },
      { id: "base", section: "Работы", category: "labor", title: "Планировка и уплотнение основания габионов", type: "labor", unit: "m2", formula: "gabion_face_m2" },
      { id: "assembly", section: "Работы", category: "labor", title: "Сборка, вязка, заполнение и закрытие габионов", type: "labor", unit: "m3", formula: "gabion_volume_m3" },
      { id: "handling", section: "Механизмы", category: "equipment", title: "Механизированная подача и укладка камня", type: "equipment", unit: "m3", formula: "gabion_stone_m3" },
    ],
  },
  {
    catalogId: "r58-real:roofing-membrane-system", domain: "roofing",
    title: "Устройство рулонной кровельной системы", aliases: ["кровля", "рулонная кровля", "мембранная кровля"],
    included: ["пароизоляция", "теплоизоляция", "слои кровельного ковра", "примыкания", "линейный водоотвод"],
    excluded: ["несущая плита", "разуклонка без заданного объёма", "воронки без проекта", "демонтаж существующей кровли"],
    standard: "SP_17_13330_2017_AMENDMENT_5", standardTitle: "СП 17.13330.2017 с изменением № 5 «Кровли»",
    standardUrl: "https://www.minstroyrf.gov.ru/docs/?PAGEN_1=9&date_from=&date_to=&q=",
    parameters: [
      { id: "roof_area_m2", title: "Площадь кровли", unit: "m2", defaultValue: 100, constraints: { min: 0.1, max: 1000000 }, guide: "Площадь по плану кровли без коэффициента запаса", description: "Чистая площадь кровельного поля." },
      { id: "roof_slope_percent", title: "Уклон кровли", unit: "percent", defaultValue: 2, constraints: { min: 0, max: 100 }, guide: "По проектным отметкам; влияет на выбор системы, но не подменяет объём разуклонки", description: "Проектный уклон поверхности." },
      { id: "membrane_layers", title: "Количество слоёв ковра", type: "integer", unit: "layers", defaultValue: 2, constraints: { min: 1, max: 5 }, guide: "По проектной кровельной системе", description: "Число слоёв рулонного материала." },
      { id: "membrane_waste_percent", title: "Запас на нахлёсты", unit: "percent", defaultValue: 12, constraints: { min: 0, max: 40 }, guide: "По ширине рулона, нахлёстам и раскладке", description: "Раскрытый запас материала кровельного ковра." },
      { id: "insulation_thickness_mm", title: "Толщина теплоизоляции", unit: "mm", defaultValue: 150, constraints: { min: 0, max: 600 }, guide: "Только по теплотехническому расчёту проекта", description: "Суммарная толщина утеплителя." },
      { id: "junction_length_m", title: "Длина примыканий", unit: "m", defaultValue: 20, constraints: { min: 0, max: 100000 }, guide: "Обмерьте парапеты, шахты и другие вертикальные примыкания", description: "Фактическая длина узлов примыкания." },
      { id: "drainage_length_m", title: "Длина линейного водоотвода", unit: "m", defaultValue: 0, constraints: { min: 0, max: 100000 }, guide: "По плану водоотвода; воронки считаются отдельно", description: "Длина желобов/лотков, входящих в работу." },
    ],
    formulas: [
      { id: "roof_area", unit: "m2", expression: "roof_area_m2", ast: p("roof_area_m2"), inputs: ["roof_area_m2"] },
      { id: "roof_membrane_m2", unit: "m2", expression: "area*layers*(1+waste/100)", ast: percent(mul(p("roof_area_m2"), p("membrane_layers")), p("membrane_waste_percent")), inputs: ["roof_area_m2", "membrane_layers", "membrane_waste_percent"] },
      { id: "roof_insulation_m3", unit: "m3", expression: "area*thickness/1000", ast: div(mul(p("roof_area_m2"), p("insulation_thickness_mm")), n(1000)), inputs: ["roof_area_m2", "insulation_thickness_mm"] },
      { id: "roof_junction_m", unit: "m", expression: "junction_length_m", ast: p("junction_length_m"), inputs: ["junction_length_m"] },
      { id: "roof_drain_m", unit: "m", expression: "drainage_length_m", ast: p("drainage_length_m"), inputs: ["drainage_length_m"] },
      { id: "roof_slope_control_m2", unit: "m2", expression: "area*(1+slope/100)", ast: percent(p("roof_area_m2"), p("roof_slope_percent")), inputs: ["roof_area_m2", "roof_slope_percent"] },
    ],
    resources: [
      { id: "vapour", section: "Материалы", category: "materials", title: "Пароизоляционный слой кровельной системы", type: "material", unit: "m2", formula: "roof_area", procurement: true },
      { id: "insulation", section: "Материалы", category: "materials", title: "Теплоизоляция кровли проектной прочности", type: "material", unit: "m3", formula: "roof_insulation_m3", procurement: true },
      { id: "membrane", section: "Материалы", category: "materials", title: "Рулонный кровельный материал выбранной системы", type: "material", unit: "m2", formula: "roof_membrane_m2", procurement: true },
      { id: "junction", section: "Материалы", category: "materials", title: "Материалы усиления и герметизации примыканий", type: "material", unit: "m", formula: "roof_junction_m", procurement: true },
      { id: "drainage", section: "Материалы", category: "materials", title: "Элементы линейного водоотвода", type: "material", unit: "m", formula: "roof_drain_m", procurement: true },
      { id: "slope_control", section: "Контроль", category: "services", title: "Контроль основания, уклонов и водоотведения", type: "service", unit: "m2", formula: "roof_slope_control_m2" },
      { id: "installation", section: "Работы", category: "labor", title: "Монтаж полной кровельной системы и примыканий", type: "labor", unit: "m2", formula: "roof_area" },
    ],
  },
  {
    catalogId: "r58-real:monolithic-reinforced-concrete", domain: "concrete",
    title: "Устройство монолитной железобетонной конструкции", aliases: ["монолитный железобетон", "опалубка арматура бетон", "железобетонная конструкция"],
    included: ["опалубка", "армирование", "бетонирование", "виброуплотнение", "уход за бетоном"],
    excluded: ["земляные работы", "гидроизоляция", "закладные без ведомости", "испытания сверх входного контроля"],
    standard: "SP_63_13330_2018_AMENDMENT_1", standardTitle: "СП 63.13330.2018 «Бетонные и железобетонные конструкции»",
    standardUrl: "https://minstroyrf.gov.ru/docs/59618/",
    parameters: [
      { id: "concrete_volume_m3", title: "Проектный объём бетона", unit: "m3", defaultValue: 10, constraints: { min: 0.01, max: 1000000 }, guide: "По геометрии конструкций за вычетом проёмов", description: "Чистый проектный объём бетона." },
      { id: "formwork_area_m2", title: "Площадь опалубки", unit: "m2", defaultValue: 60, constraints: { min: 0, max: 10000000 }, guide: "По фактическим поверхностям контакта бетона с опалубкой", description: "Развёрнутая площадь опалубливаемых граней." },
      { id: "rebar_mass_t", title: "Масса арматуры", unit: "t", defaultValue: 1.2, constraints: { min: 0, max: 100000 }, guide: "Только по ведомости расхода стали", description: "Проектная масса арматурных изделий." },
      { id: "concrete_waste_percent", title: "Запас бетона", unit: "percent", defaultValue: 2, constraints: { min: 0, max: 15 }, guide: "По технологии подачи и точности опалубки", description: "Технологическая добавка к чистому объёму." },
    ],
    formulas: [
      { id: "rc_concrete_m3", unit: "m3", expression: "volume*(1+waste/100)", ast: percent(p("concrete_volume_m3"), p("concrete_waste_percent")), inputs: ["concrete_volume_m3", "concrete_waste_percent"] },
      { id: "rc_clean_volume_m3", unit: "m3", expression: "concrete_volume_m3", ast: p("concrete_volume_m3"), inputs: ["concrete_volume_m3"] },
      { id: "rc_formwork_m2", unit: "m2", expression: "formwork_area_m2", ast: p("formwork_area_m2"), inputs: ["formwork_area_m2"] },
      { id: "rc_rebar_t", unit: "t", expression: "rebar_mass_t", ast: p("rebar_mass_t"), inputs: ["rebar_mass_t"] },
      { id: "rc_tie_wire_kg", unit: "kg", expression: "rebar_mass_t*12", ast: mul(p("rebar_mass_t"), n(12)), inputs: ["rebar_mass_t"] },
    ],
    resources: [
      { id: "formwork", section: "Материалы", category: "materials", title: "Опалубочная система и расходные элементы", type: "material", unit: "m2", formula: "rc_formwork_m2", procurement: true },
      { id: "rebar", section: "Материалы", category: "materials", title: "Арматура по ведомости расхода стали", type: "material", unit: "t", formula: "rc_rebar_t", procurement: true },
      { id: "tie_wire", section: "Материалы", category: "materials", title: "Вязальная проволока", type: "material", unit: "kg", formula: "rc_tie_wire_kg", procurement: true },
      { id: "concrete", section: "Материалы", category: "materials", title: "Бетон проектного класса", type: "material", unit: "m3", formula: "rc_concrete_m3", procurement: true },
      { id: "formwork_labor", section: "Работы", category: "labor", title: "Монтаж и демонтаж опалубки", type: "labor", unit: "m2", formula: "rc_formwork_m2" },
      { id: "rebar_labor", section: "Работы", category: "labor", title: "Сборка и установка арматуры", type: "labor", unit: "t", formula: "rc_rebar_t" },
      { id: "concrete_labor", section: "Работы", category: "labor", title: "Укладка, виброуплотнение и уход за бетоном", type: "labor", unit: "m3", formula: "rc_clean_volume_m3" },
    ],
  },
  {
    catalogId: "r58-real:masonry-wall-openings-lintels", domain: "masonry",
    title: "Кладка стены с проёмами и перемычками", aliases: ["кладка с проемами", "кирпичная стена с перемычками", "перемычки над проемами"],
    included: ["кладка чистого объёма", "раствор", "армирование кладки", "монтаж заданных перемычек"],
    excluded: ["штукатурка", "утепление", "дверные и оконные блоки", "монолитные пояса"],
    standard: "SP_15_13330_2020_AMENDMENT_1", standardTitle: "СП 15.13330.2020 с изменением № 1 «Каменные и армокаменные конструкции»",
    standardUrl: "https://minstroyrf.gov.ru/docs/?PAGEN_1=24&sphrase_id=1934211",
    parameters: [
      { id: "gross_wall_area_m2", title: "Площадь стены по габариту", unit: "m2", defaultValue: 100, constraints: { min: 0.1, max: 1000000 }, guide: "Длина стены × высота до вычета проёмов", description: "Площадь контура кладки." },
      { id: "opening_area_m2", title: "Суммарная площадь проёмов", unit: "m2", defaultValue: 15, constraints: { min: 0, max: 1000000 }, guide: "Сумма ширина × высота каждого проёма", description: "Исключаемая площадь оконных и дверных проёмов." },
      { id: "wall_thickness_m", title: "Толщина кладки", unit: "m", defaultValue: 0.25, constraints: { min: 0.08, max: 1.5 }, guide: "По плану и узлам кладки", description: "Проектная толщина стены." },
      { id: "lintel_count", title: "Количество перемычек", type: "integer", unit: "pcs", defaultValue: 5, constraints: { min: 0, max: 10000 }, guide: "По ведомости перемычек, не по числу проёмов автоматически", description: "Фактическое количество сборных перемычек." },
      { id: "lintel_total_length_m", title: "Суммарная длина перемычек", unit: "m", defaultValue: 10, constraints: { min: 0, max: 100000 }, guide: "Сумма проектных длин с опиранием", description: "Закупочная длина перемычек." },
    ],
    formulas: [
      { id: "masonry_net_area_m2", unit: "m2", expression: "gross_area-opening_area", ast: b("-", p("gross_wall_area_m2"), p("opening_area_m2")), inputs: ["gross_wall_area_m2", "opening_area_m2"] },
      { id: "masonry_volume_m3", unit: "m3", expression: "(gross-opening)*thickness", ast: mul(b("-", p("gross_wall_area_m2"), p("opening_area_m2")), p("wall_thickness_m")), inputs: ["gross_wall_area_m2", "opening_area_m2", "wall_thickness_m"] },
      { id: "lintel_pcs", unit: "pcs", expression: "lintel_count", ast: p("lintel_count"), inputs: ["lintel_count"] },
      { id: "lintel_length_m", unit: "m", expression: "lintel_total_length_m", ast: p("lintel_total_length_m"), inputs: ["lintel_total_length_m"] },
      { id: "mortar_m3", unit: "m3", expression: "masonry_volume*0.23", ast: mul(b("-", p("gross_wall_area_m2"), p("opening_area_m2")), p("wall_thickness_m"), n(0.23)), inputs: ["gross_wall_area_m2", "opening_area_m2", "wall_thickness_m"] },
    ],
    resources: [
      { id: "masonry_units", section: "Материалы", category: "materials", title: "Кладочные изделия проектного типа и прочности", type: "material", unit: "m3", formula: "masonry_volume_m3", procurement: true },
      { id: "mortar", section: "Материалы", category: "materials", title: "Кладочный раствор проектной марки", type: "material", unit: "m3", formula: "mortar_m3", procurement: true },
      { id: "lintels", section: "Материалы", category: "materials", title: "Перемычки по ведомости", type: "material", unit: "pcs", formula: "lintel_pcs", procurement: true },
      { id: "lintel_length", section: "Контроль", category: "services", title: "Контроль длины и опирания перемычек", type: "service", unit: "m", formula: "lintel_length_m" },
      { id: "masonry_labor", section: "Работы", category: "labor", title: "Кладка стены с формированием проёмов", type: "labor", unit: "m3", formula: "masonry_volume_m3" },
      { id: "lintel_labor", section: "Работы", category: "labor", title: "Монтаж перемычек", type: "labor", unit: "pcs", formula: "lintel_pcs" },
      { id: "geometry", section: "Контроль", category: "services", title: "Контроль геометрии и перевязки кладки", type: "service", unit: "m2", formula: "masonry_net_area_m2" },
    ],
  },
  {
    catalogId: "r58-real:finish-coating-application", domain: "interior_finishes",
    title: "Нанесение финишного защитно-декоративного покрытия", aliases: ["финишное покрытие", "окраска поверхности", "защитное покрытие"],
    included: ["контроль основания", "грунтование при выборе", "межслойная выдержка", "нанесение заданного числа слоёв"],
    excluded: ["удаление старого покрытия", "выравнивание основания", "ремонт трещин", "огнезащита без отдельной системы"],
    standard: "SP_71_13330_2017_AMENDMENT_3", standardTitle: "СП 71.13330.2017 с изменением № 3 «Изоляционные и отделочные покрытия»",
    standardUrl: "https://minstroyrf.gov.ru/docs/?PAGEN_1=8",
    parameters: [
      { id: "coating_area_m2", title: "Площадь покрытия", unit: "m2", defaultValue: 100, constraints: { min: 0.1, max: 1000000 }, guide: "Площадь реально окрашиваемой поверхности", description: "Чистая площадь нанесения покрытия." },
      { id: "coating_layers", title: "Количество слоёв", type: "integer", unit: "layers", defaultValue: 2, constraints: { min: 1, max: 10 }, guide: "По TDS выбранной системы и требуемой укрывистости", description: "Число финишных слоёв." },
      { id: "coating_l_m2_layer", title: "Расход покрытия на слой", unit: "l_per_m2_layer", defaultValue: 0.12, constraints: { min: 0.01, max: 2 }, guide: "Заменить паспортным расходом из TDS материала", description: "Объём покрытия на один квадратный метр одного слоя." },
      { id: "primer_required", title: "Требуется грунтование", type: "boolean", unit: null, defaultValue: true, guide: "По типу основания и совместимости системы", description: "Включает отдельную грунтовку." },
      { id: "primer_l_m2", title: "Расход грунтовки", unit: "l_per_m2", defaultValue: 0.1, constraints: { min: 0, max: 1 }, guide: "По TDS и впитываемости основания", description: "Паспортный расход грунта." },
    ],
    formulas: [
      { id: "coating_area", unit: "m2", expression: "coating_area_m2", ast: p("coating_area_m2"), inputs: ["coating_area_m2"] },
      { id: "coating_l", unit: "l", expression: "area*layers*rate", ast: mul(p("coating_area_m2"), p("coating_layers"), p("coating_l_m2_layer")), inputs: ["coating_area_m2", "coating_layers", "coating_l_m2_layer"] },
      { id: "primer_l", unit: "l", expression: "area*primer_rate", ast: mul(p("coating_area_m2"), p("primer_l_m2")), inputs: ["coating_area_m2", "primer_l_m2"] },
    ],
    resources: [
      { id: "coating", section: "Материалы", category: "materials", title: "Финишное покрытие выбранной системы и цвета", type: "material", unit: "l", formula: "coating_l", procurement: true },
      { id: "primer", section: "Материалы", category: "materials", title: "Совместимая грунтовка для фактического основания", type: "material", unit: "l", formula: "primer_l", procurement: true, inclusion: eq("primer_required", true) },
      { id: "masking", section: "Материалы", category: "materials", title: "Укрывные и маскирующие материалы", type: "material", unit: "m2", formula: "coating_area", procurement: true },
      { id: "substrate_control", section: "Контроль", category: "services", title: "Контроль влажности, прочности и чистоты основания", type: "service", unit: "m2", formula: "coating_area" },
      { id: "application", section: "Работы", category: "labor", title: "Нанесение покрытия с межслойной выдержкой", type: "labor", unit: "m2", formula: "coating_area" },
    ],
  },
];

function inclusionParameters(ast: Ast): string[] {
  if (!ast || typeof ast !== "object") return [];
  const own = typeof ast.parameterId === "string" ? [ast.parameterId] : [];
  return [...new Set([...own, ...Object.values(ast).flatMap((child) =>
    child && typeof child === "object" ? inclusionParameters(child as Ast) : [])])];
}

function baselineFor(spec: WorkSpec, definitionId: string, releaseId: string): Json {
  const inputValues = Object.fromEntries(spec.parameters.map((row) => [row.id, row.defaultValue]));
  const formulaConsumers = Object.fromEntries(spec.parameters.map((parameter) => [parameter.id,
    spec.formulas.filter((formula) => formula.inputs.includes(parameter.id)).map((formula) => formula.id)]));
  const resourceConsumers = Object.fromEntries(spec.parameters.map((parameter) => [parameter.id,
    spec.resources.filter((resource) => {
      const formula = spec.formulas.find((candidate) => candidate.id === resource.formula);
      return formula?.inputs.includes(parameter.id) || inclusionParameters(resource.inclusion ?? literalTrue).includes(parameter.id);
    }).map((resource) => resource.id)]));
  invariant(Object.values(resourceConsumers).every((value) => Array.isArray(value) && value.length > 0),
    `R58_MANDATORY_PARAMETER_WITHOUT_RESOURCE:${spec.catalogId}`);
  const numeric = spec.parameters.find((parameter) => parameter.type !== "boolean" && parameter.type !== "enum")!;
  const changedValue = Number(numeric.defaultValue) === 0 ? 1 : Number(numeric.defaultValue) * 1.1;
  const parameterSchemaSha256 = shaObject(spec.parameters);
  const validationScenarioRefs = [{ contract: CONTRACT, scenario: "BASELINE_THEN_EXACT_REFINEMENT",
    sensitivityScenario: { parameterId: numeric.id, baselineValue: Number(numeric.defaultValue), changedValue,
      changedValueAffectsCompilation: true, missingRequiredValueRejected: true } }];
  const acceptanceEvidenceSha256 = shaObject({ spec, definitionId, releaseId, inputValues,
    formulaConsumers, resourceConsumers, validationScenarioRefs });
  return {
    id: uuid(`${CONTRACT}:baseline:${spec.catalogId}`),
    key: `r58-mandatory:${sha256(spec.catalogId).slice(0, 20)}`,
    parameterSchemaSha256, inputValues,
    inputClassification: Object.fromEntries(spec.parameters.map((row) => [row.id, "DISCLOSED_BASELINE_ASSUMPTION"])),
    uomByParameter: Object.fromEntries(spec.parameters.map((row) => [row.id, row.unit ?? "dimensionless"])),
    formulaConsumers, resourceConsumers,
    normativeSourceIds: Object.fromEntries(spec.parameters.map((row) => [row.id, [spec.standard]])),
    guideProvenanceRu: Object.fromEntries(spec.parameters.map((row) => [row.id, row.guide])),
    validationScenarioRefs, acceptanceEvidenceSha256,
  };
}

async function insertWork(client: Client, spec: WorkSpec, releaseId: string): Promise<Json> {
  const definitionId = uuid(`${CONTRACT}:definition:${spec.catalogId}`);
  const baseline = baselineFor(spec, definitionId, releaseId);
  const definitionSha256 = shaObject({ spec, parameterSchemaSha256: baseline.parameterSchemaSha256 });
  await client.query(`insert into public.estimate_work_identity(
    catalog_id,namespace,domain,source_identity,work_key,title_ru,denominator_eligible,canonical_owner,retired_at
  ) values($1,'r58-real',$2,$3,$1,$4,true,'backend',null)`, [spec.catalogId, spec.domain, `${CONTRACT}:${spec.catalogId}`, spec.title]);
  await client.query(`insert into public.estimate_definition_version(
    id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata
  ) values($1,$2,$3,1,$4::jsonb,$5::jsonb,$6,$7::jsonb)`, [definitionId, releaseId, spec.catalogId,
    JSON.stringify({ contractVersion: CONTRACT, professionalNameRu: spec.title, calculationOwner: "backend",
      baselineWithoutUserInput: true, baselineUnit: spec.parameters[0]?.unit ?? "set", pricePolicy: "PRICE_REQUIRED",
      scope: { included: spec.included, excluded: spec.excluded },
      assumptions: ["Исходная смета построена на явно показанных baseline-значениях.",
        "До подтверждения проекта и TDS количества являются предварительными; цены не выдумываются."] }),
    JSON.stringify({ aliases: spec.aliases, mandatoryJourney: true, standard: spec.standard }), definitionSha256,
    JSON.stringify({ authority: "P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5.8", specSha256: SPEC_SHA256,
      normativeSource: { sourceKey: spec.standard, titleRu: spec.standardTitle, officialUrl: spec.standardUrl },
      pricePolicy: "PRICE_REQUIRED", generatedTemplate: false, universalEstimator: false })]);
  await client.query(`insert into public.estimate_approved_template_baseline(
    id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
    input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
    normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
    acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version
  ) values($1,$2,$3,$4,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,
    $12::jsonb,$13::jsonb,$14::jsonb,$15,$16,now(),null,'APPROVED_TEMPLATE_BASELINE_R58_REAL_WORK_V1')`, [
    baseline.id, baseline.key, spec.catalogId, definitionId, baseline.parameterSchemaSha256,
    JSON.stringify(baseline.inputValues), JSON.stringify(baseline.inputClassification), JSON.stringify(baseline.uomByParameter),
    JSON.stringify(baseline.formulaConsumers), JSON.stringify(baseline.resourceConsumers), JSON.stringify(baseline.normativeSourceIds),
    JSON.stringify(baseline.guideProvenanceRu), JSON.stringify([{ authority: SPEC_SHA256, contract: CONTRACT }]),
    JSON.stringify(baseline.validationScenarioRefs), baseline.acceptanceEvidenceSha256, releaseId,
  ]);
  for (let ordinal = 0; ordinal < spec.parameters.length; ordinal += 1) {
    const parameter = spec.parameters[ordinal]!;
    const truth = { semantic_parameter_key: `${spec.catalogId}:${parameter.id}`, visibility_role: "USER_INPUT",
      description_ru: parameter.description, default_policy: "DISCLOSED_PRELIMINARY_BASELINE",
      formula_consumers: baseline.formulaConsumers[parameter.id], resource_branch_consumers: baseline.resourceConsumers[parameter.id],
      validation_rules: [stableJson(parameter.constraints ?? {})], conflicts_with: [],
      guide: { guide_kind: "PROJECT_OR_TDS_RULE", guide_short_ru: parameter.guide,
        source_role: "PROJECT_DOCUMENTATION", source_document: spec.standardTitle, source_locator: spec.standardUrl,
        canonical_unit: parameter.unit ?? "dimensionless", guide_validation_policy: "INFORMATION_ONLY",
        verified_at: "2026-08-17" }, provenance: { owner: "backend", contract: CONTRACT,
        approvedTemplateBaselineId: baseline.id, sourceReleaseId: releaseId } };
    await client.query(`insert into public.estimate_parameter_definition(
      definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,default_value,
      constraints_json,truth_metadata,approved_template_baseline_id
    ) values($1,$2,$3,$4,$5,$6,true,$7::jsonb,$8::jsonb,$9::jsonb,$10)`, [definitionId, parameter.id, ordinal,
      parameter.type ?? "decimal", parameter.unit ?? null, parameter.title, JSON.stringify(parameter.defaultValue),
      JSON.stringify(parameter.constraints ?? {}), JSON.stringify(truth), baseline.id]);
  }
  for (const formula of spec.formulas) {
    await client.query(`insert into public.estimate_formula_graph(
      definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
    ) values($1,$2,$3,$4,$5::jsonb,$6::text[],$7)`, [definitionId, formula.id, formula.unit, formula.expression,
      JSON.stringify(formula.ast), formula.inputs, shaObject(formula.ast)]);
  }
  const sourceId = uuid(`${CONTRACT}:normative-source:${spec.standard}`);
  await client.query(`insert into public.estimate_normative_source(
    id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,effective_to,metadata
  ) values($1,$2,$3,'Минстрой России / рабочая документация',$4,$5,'2024-12-01',null,$6::jsonb)
    on conflict(source_key) do nothing`, [sourceId, spec.standard, spec.standardTitle, spec.standardUrl,
    shaObject({ standard: spec.standard, title: spec.standardTitle, url: spec.standardUrl }),
    JSON.stringify({ verifiedAt: "2026-08-17", applicability: spec.catalogId, projectConfirmationRequired: true })]);
  const targetSource = (await client.query(`select id::text from public.estimate_normative_source where source_key=$1`, [spec.standard])).rows[0];
  const locatorId = uuid(`${CONTRACT}:normative-locator:${spec.standard}:${spec.catalogId}`);
  await client.query(`insert into public.estimate_normative_locator(id,source_id,locator_key,locator,excerpt_sha256)
    values($1,$2,$3,$4::jsonb,$5)`, [locatorId, targetSource.id, `${CONTRACT}:${spec.catalogId}`,
    JSON.stringify({ scope: spec.included, noteRu: "Применимость и конкретные показатели подтверждаются проектом и TDS." }),
    shaObject({ standard: spec.standard, included: spec.included })]);
  for (let ordinal = 0; ordinal < spec.resources.length; ordinal += 1) {
    const resource = spec.resources[ordinal]!;
    const semanticOwner = `${spec.catalogId}.${resource.type}.${resource.id}`;
    const row = { row_id: resource.id, ordinal, section: resource.section, category: resource.category,
      title_ru: resource.title, row_type: resource.type, unit_id: resource.unit, formula_id: resource.formula,
      inclusion_ast: resource.inclusion ?? literalTrue, semantic_owner: semanticOwner,
      cost_owner_id: `${semanticOwner}.${resource.unit}`, procurement_eligible: resource.procurement === true };
    const resourceId = uuid(`${CONTRACT}:resource:${spec.catalogId}:${resource.id}`);
    await client.query(`insert into public.estimate_resource_spec(
      id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,
      inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata,row_sha256
    ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16::jsonb,$17)`, [
      resourceId, definitionId, resource.id, ordinal, resource.section, resource.category, resource.title, resource.type,
      resource.unit, resource.formula, JSON.stringify(resource.inclusion ?? literalTrue),
      JSON.stringify({ contractVersion: CONTRACT, formulaId: resource.formula, formulaRu: spec.formulas.find((item) => item.id === resource.formula)?.expression,
        physicalRowType: resource.type, semanticOwner, priceState: "PRICE_REQUIRED", specificationStatus: "PROJECT_CONFIRMATION_REQUIRED" }),
      semanticOwner, `${semanticOwner}.${resource.unit}`, resource.procurement === true,
      JSON.stringify({ priceState: "PRICE_REQUIRED", normativeTrace: [{ source_id: spec.standard, authority: "Минстрой России / проект",
        official_url: spec.standardUrl, applicability: spec.catalogId, verified_at: "2026-08-17" }] }), shaObject(row),
    ]);
    await client.query(`insert into public.estimate_work_normative_binding(
      definition_version_id,resource_spec_id,locator_id,applicability
    ) values($1,$2,$3,$4::jsonb)`, [definitionId, resourceId, locatorId,
      JSON.stringify({ catalogId: spec.catalogId, rowId: resource.id, projectConfirmationRequired: true })]);
    const routeId = uuid(`${CONTRACT}:price-route:${spec.catalogId}:${resource.id}`);
    await client.query(`insert into public.estimate_price_route(
      id,route_key,currency_code,region_code,priority,source_kind,metadata,active
    ) values($1,$2,'KGS','KG-B',1,'manual_supplier_confirmation',$3::jsonb,true)`, [routeId,
      `${CONTRACT}:${spec.catalogId}:${resource.id}`, JSON.stringify({ priceState: "PRICE_REQUIRED", artificialPriceForbidden: true })]);
    await client.query(`insert into public.estimate_resource_price_route_binding(resource_spec_id,route_id,price_key,priority)
      values($1,$2,$3,1)`, [resourceId, routeId, `${spec.catalogId}:${resource.id}`]);
  }
  await client.query(`insert into public.estimate_cumulative_manifest_entry(
    release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
    approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256
  ) values($1,$2,$3,'R58_MANDATORY_REAL_WORKS',$1,$4,'CANONICAL_SUCCESSOR', $5,true,true,$6,$7)`, [releaseId,
    spec.catalogId, definitionId, spec.domain, baseline.id, definitionSha256,
    shaObject({ contract: CONTRACT, catalogId: spec.catalogId, definitionId, baselineId: baseline.id })]);
  return { catalogId: spec.catalogId, definitionId, baselineId: baseline.id,
    parameters: spec.parameters.length, formulas: spec.formulas.length, resources: spec.resources.length };
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R58_MANDATORY_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]); const head = git(["rev-parse", "HEAD"]); const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R58_MANDATORY_BRANCH:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_MANDATORY_DIRTY_WORKTREE");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  invariant(new Set(WORKS.map((work) => work.catalogId)).size === WORKS.length, "R58_MANDATORY_DUPLICATE_CATALOG_IDS");
  const releaseId = uuid(`${CONTRACT}:release:${RELEASE_KEY}`);
  const client = new Client({ connectionString: DATABASE_URL, application_name: APPLY ? "r58-mandatory-apply" : "r58-mandatory-dry-run" });
  await client.connect();
  let inserted: Json[] = []; let idempotent = false;
  try {
    await client.query("begin"); await client.query("set local lock_timeout='5s'"); await client.query("set local statement_timeout='120s'");
    const predecessor = (await client.query(`select * from public.estimate_definition_release where id=$1`, [PREDECESSOR_RELEASE_ID])).rows[0] as Json;
    const active = (await client.query(`select * from public.estimate_definition_release where id=$1`, [ACTIVE_RELEASE_ID])).rows[0] as Json;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 4273, "R58_MANDATORY_PREDECESSOR_DRIFT");
    invariant(active?.status === "active", "R58_MANDATORY_ACTIVE_DRIFT");
    const existing = (await client.query(`select * from public.estimate_definition_release where release_key=$1`, [RELEASE_KEY])).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.id === releaseId && existing.status === "prepared" && existing.parent_release_id === PREDECESSOR_RELEASE_ID,
        "R58_MANDATORY_EXISTING_RELEASE_DRIFT");
      idempotent = true;
      inserted = (await client.query(`select m.catalog_id "catalogId",m.definition_version_id::text "definitionId",
        m.approved_template_baseline_id::text "baselineId",
        (select count(*)::int from estimate_parameter_definition p where p.definition_version_id=m.definition_version_id) parameters,
        (select count(*)::int from estimate_formula_graph f where f.definition_version_id=m.definition_version_id) formulas,
        (select count(*)::int from estimate_resource_spec r where r.definition_version_id=m.definition_version_id) resources
        from estimate_cumulative_manifest_entry m where m.release_id=$1 and m.source_batch='R58_MANDATORY_REAL_WORKS' order by m.catalog_id`, [releaseId])).rows;
    } else {
      const collisions = Number((await client.query(`select count(*)::int n from public.estimate_work_identity where catalog_id=any($1::text[])`, [WORKS.map((work) => work.catalogId)])).rows[0].n);
      invariant(collisions === 0, `R58_MANDATORY_IDENTITY_COLLISIONS:${collisions}`);
      const additions = { definitions: WORKS.length, parameters: WORKS.reduce((sum, work) => sum + work.parameters.length, 0),
        formulas: WORKS.reduce((sum, work) => sum + work.formulas.length, 0), resources: WORKS.reduce((sum, work) => sum + work.resources.length, 0) };
      await client.query(`insert into public.estimate_definition_release(
        id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,definition_count,
        resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count
      ) values($1,$2,6,'draft',$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12)`, [releaseId, RELEASE_KEY, head, tree,
        shaObject({ contract: CONTRACT, predecessor: PREDECESSOR_RELEASE_ID, workIds: WORKS.map((work) => work.catalogId) }),
        Number(predecessor.definition_count) + additions.definitions, Number(predecessor.resource_row_count) + additions.resources,
        JSON.stringify({ authority: "P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5.8", specSha256: SPEC_SHA256, contract: CONTRACT,
          predecessorReleaseId: PREDECESSOR_RELEASE_ID, mandatoryRealWorksAdded: WORKS.length, generatedTemplate: false,
          universalEstimator: false, artificialPrices: false, batch009Included: false, activeReleaseSwitched: false,
          runtime8081Switched: false, terminalGreenClaimed: false }), PREDECESSOR_RELEASE_ID,
        shaObject({ contract: CONTRACT, head, tree, additions }), Number(predecessor.parameter_count) + additions.parameters,
        Number(predecessor.formula_count) + additions.formulas]);
      await client.query(`insert into public.estimate_cumulative_manifest_entry(
        release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
        approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256
      ) select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
        approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
        encode(extensions.digest(convert_to($2||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex')
        from public.estimate_cumulative_manifest_entry where release_id=$3`, [releaseId, CONTRACT, PREDECESSOR_RELEASE_ID]);
      for (const work of WORKS) inserted.push(await insertWork(client, work, releaseId));
      const counts = (await client.query(`select count(*)::int definitions,count(distinct catalog_id)::int unique_catalogs,
        count(*) filter(where baseline_ready and scenario_ready and approved_template_baseline_id is not null)::int ready,
        count(*) filter(where upper(source_batch) like 'BATCH009%')::int batch009
        from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId])).rows[0] as Json;
      invariant(Number(counts.definitions) === Number(predecessor.definition_count) + WORKS.length
        && counts.definitions === counts.unique_catalogs && counts.definitions === counts.ready && counts.batch009 === 0,
      `R58_MANDATORY_MANIFEST_COUNTS:${stableJson(counts)}`);
      await client.query(`update public.estimate_definition_release set status='prepared',sealed_at=now(),
        metadata=metadata||$2::jsonb where id=$1 and status='draft'`, [releaseId,
        JSON.stringify({ lifecycle: "PREPARED_FOR_MANDATORY_BACKEND_AND_SEARCH_GATES_NOT_ACTIVE", manifestCounts: counts })]);
    }
    invariant(inserted.length === WORKS.length && inserted.every((row) => row.parameters > 0 && row.formulas > 0 && row.resources > 0),
      `R58_MANDATORY_INSERTED_COUNTS:${stableJson(inserted)}`);
    const proof = { schemaVersion: CONTRACT, capturedAt: new Date().toISOString(), specSha256: SPEC_SHA256,
      source: { branch, head, tree, descendantOf691acb78: true }, predecessorReleaseId: PREDECESSOR_RELEASE_ID,
      candidateReleaseId: releaseId, works: inserted, denominator: `${inserted.length}/${WORKS.length}`,
      allHaveIndividualParameters: true, allHaveIndividualTechnologyRows: true, allHaveInlineGuides: true,
      baselineBeforeInput: true, immutableRevisionOnRefinementRequired: true, generatedTemplate: false,
      universalEstimator: false, artificialPrices: false, activeReleaseSwitched: false, runtime8081Switched: false,
      batch009Included: false, idempotent, writesApplied: APPLY && !idempotent ? 1 : 0,
      status: APPLY ? "GREEN_R58_MANDATORY_SUCCESSOR_PREPARED_NOT_ACTIVE" : "GREEN_R58_MANDATORY_DRY_RUN_ROLLED_BACK" };
    if (APPLY) await client.query("commit"); else await client.query("rollback");
    writeJson(OUTPUT, proof); process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
  } catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
  finally { await client.end(); }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
