import type { GlobalUnitInput, GlobalWorkAlias, GlobalWorkCategory, GlobalWorkTypeDefinition } from "../globalEstimate/globalEstimateTypes";

export type BuiltInAi1000Case = {
  id: string;
  category: string;
  workKey: string;
  titleRu: string;
  promptRu: string;
  volume: number;
  unit: string;
  expectedTitleContains: string[];
  expectedRowsContain: string[];
  forbiddenRowsContain: string[];
  dangerousWork?: boolean;
  productSearchCompanion?: boolean;
};

type CategoryPack = {
  manifestCategory: string;
  workCategory: GlobalWorkCategory;
  expectedRowsContain: string[];
};

const CATEGORY_PACKS: Record<string, CategoryPack> = {
  flooring: {
    manifestCategory: "flooring",
    workCategory: "flooring",
    expectedRowsContain: ["материал покрытия", "подготовка основания", "монтаж", "расходные материалы"],
  },
  tile: {
    manifestCategory: "tile",
    workCategory: "tile",
    expectedRowsContain: ["плитка", "клей", "затирка", "подготовка", "укладка"],
  },
  walls: {
    manifestCategory: "wall_finishing",
    workCategory: "wall_finishing",
    expectedRowsContain: ["материал отделки", "грунтовка", "подготовка", "нанесение"],
  },
  ceiling: {
    manifestCategory: "ceiling_drywall",
    workCategory: "ceiling",
    expectedRowsContain: ["каркас", "панели или листы", "крепёж", "монтаж"],
  },
  doors_windows: {
    manifestCategory: "doors_windows",
    workCategory: "doors_windows",
    expectedRowsContain: ["блок или изделие", "фурнитура", "демонтаж", "монтаж", "герметизация"],
  },
  plumbing: {
    manifestCategory: "plumbing",
    workCategory: "plumbing",
    expectedRowsContain: ["трубы или приборы", "фитинги", "монтаж", "опрессовка"],
  },
  electrical: {
    manifestCategory: "electrical",
    workCategory: "electrical",
    expectedRowsContain: ["кабель", "устройства", "защита", "монтаж", "проверка"],
  },
  hvac: {
    manifestCategory: "heating_hvac",
    workCategory: "heating_hvac",
    expectedRowsContain: ["оборудование", "трубы или воздуховоды", "монтаж", "пусконаладка"],
  },
  roofing: {
    manifestCategory: "roofing",
    workCategory: "roofing",
    expectedRowsContain: ["кровельное покрытие", "мембрана", "крепёж", "монтаж"],
  },
  facade: {
    manifestCategory: "facade",
    workCategory: "facade",
    expectedRowsContain: ["фасадный материал", "грунтовка или подсистема", "монтаж", "защита"],
  },
  concrete: {
    manifestCategory: "concrete_foundation",
    workCategory: "concrete",
    expectedRowsContain: ["бетон", "арматура", "опалубка", "подготовка", "заливка"],
  },
  masonry: {
    manifestCategory: "masonry",
    workCategory: "masonry",
    expectedRowsContain: ["кирпич или блок", "раствор", "армирование", "кладка"],
  },
  waterproofing: {
    manifestCategory: "waterproofing_insulation",
    workCategory: "waterproofing",
    expectedRowsContain: ["праймер", "мембрана или утеплитель", "лента или крепёж", "нанесение"],
  },
  demolition: {
    manifestCategory: "demolition",
    workCategory: "demolition",
    expectedRowsContain: ["защита", "демонтаж", "погрузка", "вывоз"],
  },
  roadworks: {
    manifestCategory: "roadworks_landscaping",
    workCategory: "roadworks",
    expectedRowsContain: ["основание", "геотекстиль или песок", "уплотнение", "техника"],
  },
  metalworks: {
    manifestCategory: "metalworks",
    workCategory: "metalworks",
    expectedRowsContain: ["металл", "расходники", "сварка или сборка", "покрытие"],
  },
  carpentry: {
    manifestCategory: "carpentry",
    workCategory: "carpentry",
    expectedRowsContain: ["древесина", "крепёж", "защитное покрытие", "монтаж"],
  },
  commercial: {
    manifestCategory: "commercial_fitout",
    workCategory: "wall_finishing",
    expectedRowsContain: ["подготовка", "материалы по разделам", "монтаж", "уборка"],
  },
  documentation: {
    manifestCategory: "documentation",
    workCategory: "documents_design",
    expectedRowsContain: ["обмеры", "чертежи или расчёты", "сметный пакет", "передача"],
  },
  logistics: {
    manifestCategory: "logistics_product",
    workCategory: "delivery_equipment",
    expectedRowsContain: ["позиции", "количество", "источник", "статус цены"],
  },
};

const BLOCK_BY_ID = [
  { from: 1, to: 50, pack: "flooring" },
  { from: 51, to: 100, pack: "tile" },
  { from: 101, to: 150, pack: "walls" },
  { from: 151, to: 200, pack: "ceiling" },
  { from: 201, to: 250, pack: "doors_windows" },
  { from: 251, to: 300, pack: "plumbing" },
  { from: 301, to: 350, pack: "electrical" },
  { from: 351, to: 400, pack: "hvac" },
  { from: 401, to: 450, pack: "roofing" },
  { from: 451, to: 500, pack: "facade" },
  { from: 501, to: 550, pack: "concrete" },
  { from: 551, to: 600, pack: "masonry" },
  { from: 601, to: 650, pack: "waterproofing" },
  { from: 651, to: 700, pack: "demolition" },
  { from: 701, to: 750, pack: "roadworks" },
  { from: 751, to: 800, pack: "metalworks" },
  { from: 801, to: 850, pack: "carpentry" },
  { from: 851, to: 900, pack: "commercial" },
  { from: 901, to: 950, pack: "documentation" },
  { from: 951, to: 1000, pack: "logistics" },
] as const;

const PRODUCT_SEARCH_START_ID = 972;
const PROMPT_OVERRIDES_BY_ID: Record<number, string> = {
  20: "смета на водяной тёплый пол как напольную систему 100 м²",
  358: "смета на водяной тёплый пол отопления 100 м²",
  428: "смета на кровельные мансардные окна 4 шт",
  627: "смета на шумоизоляцию стены как утепление 25 м²",
  628: "смета на шумоизоляцию пола как утепление 80 м²",
  629: "смета на шумоизоляцию потолка как утепление 60 м²",
  656: "смета на демонтаж и снятие обоев 100 м²",
  668: "смета на демонтаж кирпичной стены с вывозом 30 м²",
  824: "смета на огнезащиту деревянных конструкций 100 м²",
  863: "смета на коммерческую отделку мансарды 80 м²",
  935: "смета на исполнительную документацию as-built docs 1 компл.",
};

function packForId(id: number): CategoryPack {
  const block = BLOCK_BY_ID.find((item) => id >= item.from && id <= item.to);
  if (!block) throw new Error(`BUILT_IN_AI_1000_UNKNOWN_BLOCK:${id}`);
  return CATEGORY_PACKS[block.pack];
}

function normalizeUnit(unitText: string): GlobalUnitInput["normalizedUnit"] | "month" | "shift" | "trip" {
  const lower = unitText.toLowerCase();
  if (/м²|м2|кв/.test(lower)) return "sq_m";
  if (/м³|м3/.test(lower)) return "m3";
  if (/пог/.test(lower) || /^м$/.test(lower)) return "linear_m";
  if (/кг/.test(lower)) return "kg";
  if (/т\b|тонн/.test(lower)) return "ton";
  if (/смен/.test(lower)) return "shift";
  if (/мес|месяц/.test(lower)) return "month";
  if (/рейс/.test(lower)) return "trip";
  if (/компл|услуг/.test(lower)) return "set";
  return "pcs";
}

function unitForDefinition(unit: string): GlobalUnitInput["normalizedUnit"] {
  return unit === "month" || unit === "shift" || unit === "trip" ? "set" : unit as GlobalUnitInput["normalizedUnit"];
}

function parseVolumeAndUnit(title: string): { volume: number; unit: string } {
  const multiplication = title.match(/(\d+(?:[.,]\d+)?)\s+на\s+(\d+(?:[.,]\d+)?)\s*м\b/i);
  if (multiplication) {
    return {
      volume: Number(multiplication[1].replace(",", ".")) * Number(multiplication[2].replace(",", ".")),
      unit: "sq_m",
    };
  }
  const match = title.match(/(\d+(?:[.,]\d+)?)\s*(м²|м2|м³|м3|кв\.?\s*м|пог\.?\s*м|кг|тонн?|т\b|шт|свай|отверстий|линий|камер|точек|секций|компл\.?|услуга|смена|мес|месяц|рейс)/i);
  if (!match) return { volume: 1, unit: "set" };
  return {
    volume: Number(match[1].replace(",", ".")),
    unit: normalizeUnit(match[2]),
  };
}

function titleWithoutVolume(title: string): string {
  return title
    .replace(/\s+\d+(?:[.,]\d+)?\s+на\s+\d+(?:[.,]\d+)?\s*м\b/gi, "")
    .replace(/\s+\d+(?:[.,]\d+)?\s*(?:м²|м2|м³|м3|кв\.?\s*м|пог\.?\s*м|кг|тонн?|т\b|шт|свай|отверстий|линий|камер|точек|секций|компл\.?|услуга|смена|мес|месяц|рейс)\.?$/i, "")
    .trim();
}

function promptForCase(id: number, title: string): string {
  if (PROMPT_OVERRIDES_BY_ID[id]) return PROMPT_OVERRIDES_BY_ID[id];
  if (id >= PRODUCT_SEARCH_START_ID) return title;
  if (/смет/i.test(title)) return title;
  return `смета на ${title}`;
}

function expectedTitleContains(titleRu: string): string[] {
  return titleRu
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 3)
    .slice(0, 4);
}

function isDangerousCase(pack: CategoryPack, workKey: string): boolean {
  if (/waterproofing|soundproofing/.test(workKey)) return false;
  if (["heating_hvac", "concrete", "roadworks"].includes(pack.workCategory)) {
    return /load|asbestos|hazard|fire|gas|boiler|chimney/.test(workKey);
  }
  return ["electrical", "heating_hvac", "roofing", "concrete", "demolition", "roadworks", "metalworks"].includes(pack.workCategory) ||
    /load|опасн|asbestos|hazard|fire|gas|boiler|chimney|(?:^|_)roof(?:_|$)|roofing|demolition|электр|газ|кот/.test(workKey);
}

function parseManifestLine(line: string): BuiltInAi1000Case {
  const match = line.match(/^(\d{3,4})\s+([a-z0-9_]+)\s+—\s+(.+)$/);
  if (!match) throw new Error(`BUILT_IN_AI_1000_INVALID_LINE:${line}`);
  const idNumber = Number(match[1]);
  const id = match[1].padStart(4, "0");
  const workKey = match[2];
  const rawTitle = match[3].trim();
  const pack = packForId(idNumber);
  const parsed = parseVolumeAndUnit(rawTitle);
  const titleRu = titleWithoutVolume(rawTitle);
  const productSearchCompanion = idNumber >= PRODUCT_SEARCH_START_ID;
  return {
    id,
    category: pack.manifestCategory,
    workKey,
    titleRu,
    promptRu: promptForCase(idNumber, rawTitle),
    volume: parsed.volume,
    unit: parsed.unit,
    expectedTitleContains: expectedTitleContains(titleRu),
    expectedRowsContain: pack.expectedRowsContain,
    forbiddenRowsContain: ["паркет", "ламинат"].filter(() => pack.workCategory === "tile"),
    dangerousWork: isDangerousCase(pack, workKey),
    productSearchCompanion,
  };
}

const RAW_BUILT_IN_AI_1000_CASES = `
001 laminate_laying — укладка ламината 100 м²
002 parquet_laying — укладка паркета 80 м²
003 engineered_wood_flooring — укладка инженерной доски 70 м²
004 solid_wood_flooring — укладка массивной доски 60 м²
005 vinyl_flooring — укладка винилового пола 120 м²
006 pvc_tile_flooring — укладка ПВХ-плитки 90 м²
007 linoleum_laying — укладка линолеума 60 м²
008 carpet_laying — укладка ковролина 100 м²
009 carpet_tile_laying — укладка ковровой плитки 150 м²
010 rubber_flooring — укладка резинового покрытия 80 м²
011 epoxy_flooring — эпоксидный пол 200 м²
012 polyurethane_flooring — полиуретановый пол 200 м²
013 microcement_floor — микроцементный пол 70 м²
014 polished_concrete_floor — полированный бетонный пол 150 м²
015 floor_screed — цементная стяжка пола 90 м²
016 semi_dry_screed — полусухая стяжка пола 120 м²
017 self_leveling_floor — наливной пол 50 м²
018 dry_screed — сухая стяжка пола 80 м²
019 heated_floor_electric — электрический тёплый пол 30 м²
020 heated_floor_water — водяной тёплый пол 100 м²
021 subfloor_plywood — настил фанеры под пол 100 м²
022 osb_floor_base — настил OSB под пол 100 м²
023 floor_soundproofing — шумоизоляция пола 80 м²
024 floor_insulation — утепление пола 100 м²
025 raised_floor_installation — монтаж фальшпола 200 м²
026 baseboard_installation — монтаж плинтуса 120 пог. м
027 threshold_installation — монтаж порогов 10 шт
028 floor_demolition — демонтаж напольного покрытия 100 м²
029 parquet_sanding — шлифовка паркета 80 м²
030 parquet_varnishing — лакировка паркета 80 м²
031 floor_oil_finish — покрытие пола маслом 80 м²
032 concrete_floor_repair — ремонт бетонного пола 100 м²
033 floor_crack_repair — ремонт трещин пола 40 пог. м
034 garage_floor_coating — покрытие пола гаража 60 м²
035 industrial_floor_marking — разметка промышленного пола 300 пог. м
036 anti_slip_floor_coating — противоскользящее покрытие пола 100 м²
037 sports_flooring — спортивное покрытие пола 200 м²
038 gym_rubber_tiles — резиновая плитка для спортзала 150 м²
039 dance_floor_installation — монтаж танцевального пола 100 м²
040 terrace_flooring — террасное покрытие 50 м²
041 balcony_flooring — пол на балконе 12 м²
042 floor_leveling_under_tile — подготовка пола под плитку 45 м²
043 floor_priming — грунтование пола 150 м²
044 floor_waterproofing — гидроизоляция пола 60 м²
045 laminate_repair — ремонт ламината 20 м²
046 parquet_repair — ремонт паркета 20 м²
047 carpet_removal — снятие ковролина 100 м²
048 linoleum_removal — снятие линолеума 100 м²
049 floor_transition_profiles — переходные профили 20 пог. м
050 floor_cleaning_after_install — уборка после устройства пола 100 м²
051 ceramic_tile_floor_laying — укладка кафельной плитки на пол 174 м²
052 ceramic_tile_wall_laying — укладка кафельной плитки на стены 80 м²
053 porcelain_tile_laying — укладка керамогранита 120 м²
054 bathroom_tile_full — плиточные работы в ванной 35 м²
055 toilet_tile_full — плиточные работы в санузле 20 м²
056 kitchen_backsplash_tile — кухонный фартук плиткой 8 м²
057 shower_tile_waterproofing — плитка и гидроизоляция душевой 12 м²
058 mosaic_tile_laying — укладка мозаики 15 м²
059 large_format_tile_laying — крупноформатная плитка 60 м²
060 marble_tile_laying — мраморная плитка 40 м²
061 granite_tile_laying — гранитная плитка 50 м²
062 stone_tile_laying — каменная плитка 50 м²
063 outdoor_tile_laying — уличная плитка 100 м²
064 terrace_tile_laying — плитка на террасе 80 м²
065 balcony_tile_laying — плитка на балконе 15 м²
066 stair_tile_laying — облицовка лестницы плиткой 25 м²
067 pool_tile_laying — плитка бассейна 80 м²
068 sauna_tile_laying — плитка в сауне 20 м²
069 grout_renewal — обновление затирки 30 м²
070 epoxy_grout — эпоксидная затирка 30 м²
071 tile_demolition — демонтаж старой плитки 60 м²
072 bathroom_tile_demolition — демонтаж плитки в ванной 35 м²
073 tile_base_preparation — подготовка основания под плитку 50 м²
074 tile_floor_leveling — выравнивание пола под плитку 45 м²
075 waterproofing_under_tile — гидроизоляция под плитку 30 м²
076 tile_corner_profiles — монтаж плиточных профилей 40 пог. м
077 tile_skirt_board — плиточный плинтус 30 пог. м
078 tile_cutting_complex — сложная резка плитки 50 м²
079 tile_niche_install — облицовка ниш плиткой 5 м²
080 tile_access_hatch — монтаж ревизионного люка под плитку 3 шт
081 heated_floor_under_tile — тёплый пол под плитку 20 м²
082 tile_repair_spot — локальный ремонт плитки 10 м²
083 tile_joint_sealing — герметизация швов плитки 40 пог. м
084 shower_tray_tile — плиточный душевой поддон 1 шт
085 slope_tile_to_drain — уклоны плитки к трапу 12 м²
086 linear_drain_install — монтаж душевого трапа 2 шт
087 tile_wall_alignment — выравнивание стен под плитку 40 м²
088 tile_acoustic_underlay — подложка под плитку 50 м²
089 clinker_tile_facade — клинкерная плитка фасада 100 м²
090 clinker_tile_steps — клинкерная плитка ступеней 20 м²
091 tile_adhesive_reinforced — усиленный клей для плитки 100 м²
092 tile_svp_system — система выравнивания плитки 100 м²
093 tile_layout_design — раскладка плитки 1 компл.
094 tile_material_takeoff — расчёт материалов плитки 100 м²
095 tile_cleaning_after_grout — очистка плитки после затирки 100 м²
096 tile_skirting_demolition — демонтаж плиточного плинтуса 40 пог. м
097 ceramic_granite_polishing — полировка керамогранита 50 м²
098 tile_slip_resistant_treatment — противоскользящая обработка плитки 50 м²
099 tile_expansion_joints — деформационные швы в плитке 60 пог. м
100 tile_full_bathroom_turnkey — ванная под ключ плиточные работы 40 м²
101 wall_plastering — штукатурка стен 120 м²
102 gypsum_plastering — гипсовая штукатурка стен 120 м²
103 cement_plastering — цементная штукатурка стен 120 м²
104 facade_wall_plastering_internal — грубая штукатурка стен 150 м²
105 wall_putty — шпаклёвка стен 100 м²
106 finish_putty — финишная шпаклёвка стен 100 м²
107 wall_sanding — шлифовка стен 100 м²
108 wall_priming — грунтование стен 150 м²
109 wall_painting — покраска стен 80 м²
110 decorative_painting — декоративная покраска стен 50 м²
111 texture_painting — фактурная покраска стен 50 м²
112 wallpaper_installation — поклейка обоев 70 м²
113 vinyl_wallpaper — виниловые обои 70 м²
114 nonwoven_wallpaper — флизелиновые обои 70 м²
115 photo_wallpaper — фотообои 20 м²
116 wallpaper_removal — снятие обоев 100 м²
117 decorative_plaster — декоративная штукатурка 50 м²
118 venetian_plaster — венецианская штукатурка 40 м²
119 microcement_wall — микроцемент на стенах 40 м²
120 wall_panel_installation — монтаж стеновых панелей 40 м²
121 acoustic_wall_panels — акустические панели на стены 50 м²
122 wood_wall_cladding — деревянная обшивка стен 50 м²
123 mdf_wall_panels — МДФ панели на стены 50 м²
124 pvc_wall_panels — ПВХ панели на стены 50 м²
125 wall_soundproofing — шумоизоляция стены 25 м²
126 internal_wall_insulation — внутреннее утепление стены 35 м²
127 plaster_mesh_reinforcement — армирование штукатурки сеткой 100 м²
128 wall_crack_repair — ремонт трещин стен 50 пог. м
129 wall_chasing_patch — заделка штроб 80 пог. м
130 wall_corner_beads — монтаж угловых маяков 100 пог. м
131 wall_leveling_compound — выравнивание стен смесью 80 м²
132 wall_mold_treatment — обработка стен от плесени 50 м²
133 wall_anti_moisture_coating — влагозащитное покрытие стен 50 м²
134 wall_fireproof_coating — огнезащита стен 80 м²
135 wall_tile_preparation — подготовка стен под плитку 50 м²
136 wall_lath_installation — обрешётка стен 50 м²
137 wall_fiberglass_mesh — стеклохолст на стены 80 м²
138 wall_glass_fiber_painting — окраска стеклохолста 80 м²
139 wall_trim_molding — декоративные молдинги 60 пог. м
140 wall_reveals_finishing — отделка откосов стен 30 пог. м
141 wall_niche_finishing — отделка ниш 10 м²
142 wall_partition_finish — отделка перегородок 60 м²
143 wall_primer_deep — грунтовка глубокого проникновения 150 м²
144 wall_repair_after_leak — ремонт стен после протечки 30 м²
145 wall_surface_disinfection — дезинфекция стен 100 м²
146 wall_full_paint_cycle — полный цикл подготовки и покраски стен 100 м²
147 wall_full_wallpaper_cycle — полный цикл подготовки и обоев 100 м²
148 wall_full_plaster_putty_paint — штукатурка+шпаклёвка+покраска 100 м²
149 wall_repair_local_patch — локальный ремонт стены 10 м²
150 wall_finishing_turnkey — отделка стен под ключ 100 м²
151 drywall_partition — перегородка из гипсокартона 60 м²
152 double_drywall_partition — двойная перегородка ГКЛ 60 м²
153 fireproof_drywall_partition — огнестойкая перегородка ГКЛ 60 м²
154 moisture_drywall_partition — влагостойкая перегородка ГКЛ 60 м²
155 drywall_ceiling — потолок из гипсокартона 45 м²
156 multi_level_drywall_ceiling — многоуровневый потолок ГКЛ 45 м²
157 drywall_box — короб из гипсокартона 20 пог. м
158 drywall_niche — ниша из гипсокартона 10 м²
159 drywall_arch — арка из гипсокартона 1 шт
160 drywall_wall_cladding — обшивка стен ГКЛ 80 м²
161 suspended_ceiling — подвесной потолок Армстронг 100 м²
162 acoustic_ceiling — акустический потолок 80 м²
163 mineral_ceiling_tiles — минераловатные потолочные плиты 100 м²
164 cassette_ceiling — кассетный потолок 100 м²
165 rack_ceiling — реечный потолок 50 м²
166 stretch_ceiling — натяжной потолок 40 м²
167 stretch_ceiling_lights — натяжной потолок со светильниками 40 м²
168 ceiling_painting — покраска потолка 70 м²
169 ceiling_plastering — штукатурка потолка 50 м²
170 ceiling_putty — шпаклёвка потолка 60 м²
171 ceiling_sanding — шлифовка потолка 60 м²
172 ceiling_priming — грунтовка потолка 70 м²
173 ceiling_insulation — утепление потолка 90 м²
174 ceiling_soundproofing — шумоизоляция потолка 60 м²
175 ceiling_vapor_barrier — пароизоляция потолка 90 м²
176 ceiling_demolition — демонтаж потолка 70 м²
177 old_stretch_ceiling_removal — демонтаж натяжного потолка 40 м²
178 armstrong_ceiling_removal — демонтаж Армстронга 100 м²
179 ceiling_crack_repair — ремонт трещин потолка 30 пог. м
180 ceiling_after_leak_repair — ремонт потолка после протечки 30 м²
181 ceiling_molding_install — потолочные плинтуса 100 пог. м
182 ceiling_cornice_install — карниз потолочный 50 пог. м
183 ceiling_light_openings — отверстия под светильники 30 шт
184 ceiling_access_hatch — ревизионный люк потолочный 5 шт
185 ceiling_grid_install — монтаж потолочной решётки 100 м²
186 drywall_seam_taping — заделка швов ГКЛ 100 пог. м
187 drywall_putty_finish — шпаклёвка ГКЛ 80 м²
188 drywall_painting — покраска ГКЛ 80 м²
189 drywall_repair — ремонт гипсокартона 20 м²
190 drywall_demolition — демонтаж гипсокартона 60 м²
191 ceiling_fireproofing — огнезащита потолка 100 м²
192 ceiling_wood_cladding — деревянная обшивка потолка 50 м²
193 ceiling_pvc_panels — ПВХ панели потолок 50 м²
194 ceiling_mdf_panels — МДФ панели потолок 50 м²
195 ceiling_skylight_finish — отделка потолочного окна 5 шт
196 ceiling_sloped_attic_finish — отделка мансардного потолка 60 м²
197 ceiling_full_finish_cycle — потолок подготовка+покраска 70 м²
198 drywall_full_room — ГКЛ стены+потолок комната 80 м²
199 office_suspended_ceiling_turnkey — офисный подвесной потолок 200 м²
200 ceiling_turnkey_finish — отделка потолка под ключ 100 м²
201 window_installation — установка пластикового окна 1.5 на 1.5 м
202 window_replacement — замена 3 окон 1.5 на 1.5 м
203 pvc_window_turnkey — ПВХ окно под ключ 2.25 м²
204 aluminum_window_install — алюминиевое окно 2 м²
205 wooden_window_install — деревянное окно 2 м²
206 panoramic_window_install — панорамное окно 6 м²
207 glazing_replacement — замена стеклопакета 4 м²
208 window_sill_installation — подоконники 8 пог. м
209 window_slope_finishing — оконные откосы 20 пог. м
210 exterior_window_slopes — наружные откосы 30 пог. м
211 window_drip_edge_install — монтаж отливов 20 пог. м
212 window_hardware_repair — ремонт фурнитуры окон 10 шт
213 mosquito_screen_install — москитные сетки 10 шт
214 balcony_block_installation — балконный блок 1 компл.
215 balcony_glazing — остекление балкона 12 м²
216 loggia_glazing — остекление лоджии 15 м²
217 warm_balcony_glazing — тёплое остекление балкона 12 м²
218 cold_balcony_glazing — холодное остекление балкона 12 м²
219 balcony_insulation_finish — утепление и отделка балкона 12 м²
220 interior_door_installation — установка 5 межкомнатных дверей
221 entrance_door_installation — установка входной двери 1 шт
222 door_replacement — замена 10 дверей
223 sliding_door_installation — раздвижная дверь 2 шт
224 glass_door_installation — стеклянная дверь 2 шт
225 fire_door_installation — противопожарная дверь 2 шт
226 metal_door_installation — металлическая дверь 2 шт
227 door_frame_installation — дверные коробки 10 шт
228 door_hardware_installation — фурнитура дверей 10 компл.
229 door_trim_installation — наличники дверей 50 пог. м
230 door_threshold_install — пороги дверные 10 шт
231 door_demolition — демонтаж дверей 10 шт
232 garage_door_installation — гаражные ворота 1 шт
233 sectional_gate_installation — секционные ворота 1 шт
234 roller_shutter_installation — рольставни 5 шт
235 automatic_gate_install — автоматика ворот 1 компл.
236 storefront_glazing — витринное остекление 20 м²
237 glass_partition_install — стеклянная перегородка 30 м²
238 shower_glass_partition — стеклянная перегородка душа 1 шт
239 mirror_installation — монтаж зеркал 10 м²
240 interior_glass_installation — интерьерное стекло 10 м²
241 window_film_install — тонировка окон плёнкой 30 м²
242 sun_protection_film — солнцезащитная плёнка 30 м²
243 security_film_install — защитная плёнка окон 30 м²
244 window_repair_sealing — герметизация окон 20 пог. м
245 window_foam_replacement — замена монтажной пены окон 10 шт
246 window_reveal_repair — ремонт оконных проёмов 10 шт
247 skylight_installation — мансардные окна 4 шт
248 roof_window_flashing — оклад мансардного окна 4 шт
249 door_opening_expansion — расширение дверного проёма 5 шт
250 window_opening_preparation — подготовка оконного проёма 5 шт
251 pipe_replacement — замена труб 40 пог. м
252 water_pipe_installation — монтаж водопровода 60 пог. м
253 sewer_pipe_installation — монтаж канализации 30 пог. м
254 plumbing_rough_in — черновая сантехника квартиры 1 компл.
255 bathroom_plumbing_turnkey — сантехника ванной под ключ 1 компл.
256 faucet_installation — установка смесителей 3 шт
257 toilet_installation — установка унитазов 2 шт
258 sink_installation — установка раковин 2 шт
259 bathtub_installation — установка ванны 1 шт
260 shower_cabin_installation — душевая кабина 1 шт
261 shower_tray_installation — душевой поддон 1 шт
262 bidet_installation — биде 1 шт
263 urinal_installation — писсуар 2 шт
264 water_heater_installation — бойлер 100 л 1 шт
265 instantaneous_water_heater — проточный водонагреватель 1 шт
266 water_filter_installation — фильтр воды 1 компл.
267 collector_installation — сантехнический коллектор 1 компл.
268 pump_installation — насос водоснабжения 1 шт
269 pressure_reducer_install — редуктор давления 2 шт
270 water_meter_installation — водомеры 2 шт
271 leak_protection_install — система защиты от протечек 1 компл.
272 plumbing_fixture_demolition — демонтаж сантехники 5 шт
273 pipe_chasing — штробление под трубы 40 пог. м
274 pipe_insulation — теплоизоляция труб 60 пог. м
275 pipe_pressure_test — опрессовка труб 1 компл.
276 sanitary_cabinet_install — сантехнический шкаф 1 шт
277 toilet_installation_frame — инсталляция унитаза 1 шт
278 concealed_mixer_install — скрытый смеситель 1 шт
279 floor_drain_install — трапы 3 шт
280 siphon_installation — сифоны 5 шт
281 washing_machine_connection — подключение стиральной машины 1 шт
282 dishwasher_connection — подключение посудомойки 1 шт
283 kitchen_sink_connection — подключение кухонной мойки 1 шт
284 drain_cleanout_install — ревизия канализации 3 шт
285 outdoor_water_supply — наружный водопровод 50 пог. м
286 well_pump_connection — подключение скважинного насоса 1 компл.
287 septic_connection — подключение септика 1 компл.
288 drainage_pipe_install — дренажные трубы 100 пог. м
289 stormwater_pipe_install — ливневая канализация 100 пог. м
290 plumbing_repair_leak — ремонт протечки труб 1 услуга
291 riser_replacement — замена стояка 10 пог. м
292 bathroom_riser_box — короб стояка 5 пог. м
293 hidden_plumbing_access — ревизионные люки сантехники 3 шт
294 bath_screen_install — экран под ванну 1 шт
295 sanitary_sealant_renewal — замена герметика 20 пог. м
296 hydromassage_bath_install — гидромассажная ванна 1 шт
297 towel_warmer_install — полотенцесушитель 1 шт
298 water_softener_install — умягчитель воды 1 шт
299 plumbing_commissioning — пусконаладка сантехники 1 компл.
300 plumbing_turnkey_apartment — сантехника квартиры под ключ 1 компл.
301 electrical_wiring — электропроводка квартиры 80 м²
302 electrical_rough_in — черновая электрика 80 м²
303 socket_installation — установка 20 розеток
304 switch_installation — установка 10 выключателей
305 lighting_installation — монтаж 25 светильников
306 chandelier_installation — монтаж люстр 5 шт
307 led_strip_installation — LED-лента 50 пог. м
308 distribution_panel_installation — электрощит 1 шт
309 panel_replacement — замена электрощита 1 шт
310 breaker_installation — автоматы 20 шт
311 rcd_installation — УЗО 10 шт
312 grounding_installation — заземление частного дома 1 компл.
313 lightning_protection — молниезащита 1 компл.
314 cable_tray_installation — кабель-канал 100 пог. м
315 cable_ladder_installation — кабельные лотки 100 пог. м
316 conduit_installation — гофра/трубы под кабель 200 пог. м
317 wall_chasing_electric — штробление под электрику 100 пог. м
318 underfloor_electric_heating — электрический тёплый пол 20 м²
319 outdoor_lighting — уличное освещение 12 точек
320 landscape_lighting — ландшафтная подсветка 20 точек
321 low_voltage_network — слаботочка 30 точек
322 ethernet_network — интернет-розетки 30 точек
323 cctv_installation — видеонаблюдение 8 камер
324 intercom_installation — домофон 1 компл.
325 access_control_install — СКУД 1 компл.
326 fire_alarm_installation — пожарная сигнализация 1 компл.
327 security_alarm_installation — охранная сигнализация 1 компл.
328 smart_home_basic — умный дом базовый 1 компл.
329 thermostat_installation — термостаты 5 шт
330 electric_meter_install — электросчётчик 1 шт
331 generator_connection — подключение генератора 1 компл.
332 ups_installation — ИБП 1 компл.
333 ev_charger_installation — зарядка электромобиля 1 шт
334 server_rack_installation — серверный шкаф 1 шт
335 audio_system_wiring — аудиопроводка 1 компл.
336 tv_mount_wiring — ТВ-зона с проводкой 5 точек
337 kitchen_appliance_wiring — электрика кухни 1 компл.
338 bathroom_electric_safety — электрика ванной 1 компл.
339 electric_fault_diagnosis — диагностика электрики 1 услуга
340 electrical_demolition — демонтаж электрики 100 пог. м
341 cable_testing — тестирование кабельных линий 30 линий
342 emergency_lighting — аварийное освещение 20 точек
343 facade_lighting — фасадная подсветка 20 точек
344 pool_electrics — электрика бассейна 1 компл.
345 sauna_electrics — электрика сауны 1 компл.
346 garage_electrics — электрика гаража 1 компл.
347 workshop_electrics — электрика мастерской 1 компл.
348 electrical_commissioning — пусконаладка электрики 1 компл.
349 electrical_project — проект электрики 80 м²
350 electrical_turnkey — электрика под ключ 80 м²
351 heating_radiator_installation — монтаж радиаторов 8 шт
352 radiator_replacement — замена радиаторов 6 шт
353 heating_pipe_installation — трубы отопления 60 пог. м
354 boiler_installation — установка котла 1 шт
355 gas_boiler_installation — газовый котёл 1 шт
356 electric_boiler_installation — электрический котёл 1 шт
357 boiler_room_piping — обвязка котельной 1 компл.
358 water_underfloor_heating — водяной тёплый пол 100 м²
359 heating_manifold_install — коллектор отопления 1 компл.
360 circulation_pump_install — циркуляционный насос 2 шт
361 expansion_tank_install — расширительный бак 1 шт
362 heating_pressure_test — опрессовка отопления 1 компл.
363 heating_balancing — балансировка отопления 1 компл.
364 ventilation_installation — вентиляция 120 м²
365 supply_ventilation — приточная вентиляция 1 компл.
366 exhaust_ventilation — вытяжная вентиляция 1 компл.
367 heat_recovery_ventilation — рекуперация 1 компл.
368 duct_installation — воздуховоды 80 пог. м
369 duct_insulation — утепление воздуховодов 80 пог. м
370 air_conditioner_installation — кондиционеры 4 шт
371 split_system_install — сплит-система 1 шт
372 multi_split_install — мультисплит 1 компл.
373 vrf_system_install — VRF система 1 компл.
374 heat_pump_installation — тепловой насос 1 компл.
375 fan_coil_installation — фанкойлы 6 шт
376 chiller_installation — чиллер 1 компл.
377 exhaust_fan_installation — вытяжные вентиляторы 6 шт
378 kitchen_hood_installation — кухонная вытяжка 1 шт
379 bathroom_fan_installation — вентиляторы ванной 3 шт
380 chimney_installation — дымоход 8 пог. м
381 flue_liner_installation — гильзование дымохода 8 пог. м
382 fireplace_installation — камин 1 шт
383 stove_installation — печь 1 шт
384 sauna_heater_install — печь сауны 1 шт
385 hvac_control_automation — автоматика HVAC 1 компл.
386 thermostat_wiring — проводка термостатов 5 шт
387 refrigerant_line_install — трасса кондиционера 40 пог. м
388 condensate_drain_install — дренаж кондиционера 40 пог. м
389 hvac_commissioning — пусконаладка HVAC 1 компл.
390 hvac_service — сервис HVAC 1 компл.
391 radiator_painting — покраска радиаторов 6 шт
392 heating_demolition — демонтаж отопления 1 компл.
393 ventilation_demolition — демонтаж вентиляции 1 компл.
394 air_conditioner_demolition — демонтаж кондиционеров 4 шт
395 boiler_demolition — демонтаж котла 1 шт
396 floor_heating_repair — ремонт тёплого пола 1 услуга
397 heat_meter_install — теплосчётчик 1 шт
398 heating_project — проект отопления 100 м²
399 ventilation_project — проект вентиляции 100 м²
400 hvac_turnkey — HVAC под ключ 100 м²
401 gable_roof_installation — двускатная крыша основание 100 м²
402 metal_roofing — кровля металлочерепицей 180 м²
403 corrugated_roofing — кровля профнастилом 180 м²
404 soft_roofing — мягкая кровля 150 м²
405 flat_roof_membrane — плоская мембранная кровля 200 м²
406 bitumen_roofing — битумная кровля 150 м²
407 standing_seam_roof — фальцевая кровля 120 м²
408 slate_roofing — шиферная кровля 120 м²
409 tile_roofing — керамическая черепица 120 м²
410 composite_tile_roof — композитная черепица 120 м²
411 roof_repair — ремонт крыши 70 м²
412 roof_leak_repair — ремонт протечки крыши 1 услуга
413 roof_insulation — утепление крыши 120 м²
414 roof_waterproofing — гидроизоляция кровли 100 м²
415 roof_vapor_barrier — пароизоляция кровли 120 м²
416 roof_underlayment — подкровельная мембрана 120 м²
417 rafter_system_installation — стропильная система 100 м²
418 roof_batten_install — обрешётка крыши 120 м²
419 roof_counter_batten — контробрешётка крыши 120 м²
420 ridge_installation — конёк кровли 30 пог. м
421 roof_flashing_install — доборные элементы кровли 80 пог. м
422 roof_valley_install — ендова 20 пог. м
423 roof_snow_guard — снегозадержатели 60 пог. м
424 roof_ladder_install — кровельная лестница 1 компл.
425 gutter_installation — водосточная система 60 пог. м
426 roof_drain_install — воронки плоской кровли 10 шт
427 roof_parapet_flashing — парапеты кровли 50 пог. м
428 roof_skylight_install — мансардные окна 4 шт
429 roof_chimney_flashing — примыкание дымохода 4 шт
430 roof_vent_pipe_flashing — проходки вентиляции 6 шт
431 roof_demolition — демонтаж старой кровли 120 м²
432 roof_decking_osb — настил OSB под кровлю 120 м²
433 roof_sheathing_plywood — фанера под кровлю 120 м²
434 roof_soffit_install — подшивка карнизов 80 пог. м
435 roof_eaves_install — карнизные планки 80 пог. м
436 roof_heat_cable — антиобледенение кровли 80 пог. м
437 roof_maintenance — обслуживание кровли 1 услуга
438 roof_cleaning — очистка кровли 120 м²
439 roof_moss_treatment — обработка кровли от мха 120 м²
440 roof_painting — покраска кровли 120 м²
441 roof_fireproofing — огнезащита стропил 100 м²
442 roof_antiseptic_treatment — антисептик стропил 100 м²
443 roof_attic_finish — отделка мансарды 80 м²
444 mansard_roof_install — мансардная крыша 120 м²
445 hip_roof_install — вальмовая крыша 150 м²
446 shed_roof_install — односкатная крыша 80 м²
447 canopy_roofing — кровля навеса 30 м²
448 garage_roofing — кровля гаража 60 м²
449 roof_project — проект кровли 120 м²
450 roof_turnkey — кровля под ключ 120 м²
451 facade_insulation — утепление фасада 200 м²
452 facade_plaster — штукатурка фасада 180 м²
453 facade_painting — покраска фасада 250 м²
454 ventilated_facade — вентилируемый фасад 300 м²
455 siding_installation — монтаж сайдинга 150 м²
456 facade_cladding_composite — композитные панели фасада 200 м²
457 facade_cladding_hpl — HPL панели фасада 200 м²
458 facade_cladding_fiber_cement — фиброцементные панели 200 м²
459 brick_cladding — облицовочный кирпич фасада 100 м²
460 clinker_tile_facade — клинкерная плитка фасада 100 м²
461 stone_cladding — облицовка камнем 80 м²
462 facade_mesh_reinforcement — армирование фасада сеткой 200 м²
463 facade_primer — грунтовка фасада 250 м²
464 facade_crack_repair — ремонт трещин фасада 50 пог. м
465 facade_scaffolding — строительные леса фасад 300 м²
466 facade_washing — мойка фасада 300 м²
467 facade_sandblasting — пескоструй фасада 200 м²
468 facade_hydrophobic_treatment — гидрофобизация фасада 200 м²
469 facade_sealant_joints — герметизация фасадных швов 100 пог. м
470 facade_expansion_joints — деформационные швы фасада 80 пог. м
471 exterior_window_slopes — наружные откосы 30 пог. м
472 facade_molding_install — фасадный декор 80 пог. м
473 facade_lighting_install — подсветка фасада 20 точек
474 facade_repair_local — локальный ремонт фасада 50 м²
475 facade_demolition — демонтаж фасадной облицовки 200 м²
476 facade_fireproofing — огнезащита фасада 200 м²
477 facade_insulation_rockwool — утепление фасада минватой 200 м²
478 facade_insulation_eps — утепление фасада пенополистиролом 200 м²
479 facade_subsystem_install — подсистема вентфасада 300 м²
480 facade_cassette_install — фасадные кассеты 200 м²
481 facade_corrugated_sheet — профлист фасад 200 м²
482 plinth_cladding — облицовка цоколя 50 м²
483 plinth_insulation — утепление цоколя 50 м²
484 plinth_waterproofing — гидроизоляция цоколя 50 м²
485 exterior_stairs_finish — наружная лестница отделка 20 м²
486 porch_cladding — облицовка крыльца 20 м²
487 entrance_group_finish — отделка входной группы 30 м²
488 awning_installation — козырёк входа 1 шт
489 facade_banner_frame — рама под вывеску 1 шт
490 facade_sign_install — монтаж вывески 1 шт
491 facade_restoration — реставрация фасада 100 м²
492 historical_facade_repair — ремонт исторического фасада 100 м²
493 facade_thermal_panels — термопанели фасада 150 м²
494 facade_full_wet_system — мокрый фасад под ключ 200 м²
495 facade_full_vent_system — вентфасад под ключ 300 м²
496 facade_color_design — цветовой проект фасада 1 компл.
497 facade_measurement — обмер фасада 1 компл.
498 facade_project — проект фасада 1 компл.
499 facade_material_takeoff — расчёт материалов фасада 200 м²
500 facade_turnkey — фасад под ключ 200 м²
501 strip_foundation — ленточный фундамент 50 пог. м
502 slab_foundation — плитный фундамент 100 м²
503 pile_foundation — свайный фундамент 30 свай
504 pile_grillage_foundation — свайно-ростверковый фундамент 30 свай
505 column_foundation — столбчатый фундамент 20 шт
506 foundation_excavation — земляные работы под фундамент 100 м³
507 foundation_sand_base — песчаная подушка фундамента 100 м²
508 foundation_gravel_base — щебёночное основание фундамента 100 м²
509 foundation_formwork — опалубка фундамента 100 м²
510 foundation_rebar — армирование фундамента 2 т
511 foundation_concrete_pour — заливка фундамента 30 м³
512 foundation_waterproofing — гидроизоляция фундамента 80 м²
513 foundation_insulation — утепление фундамента 80 м²
514 concrete_slab — бетонная плита 200 м²
515 concrete_floor_slab — бетонная плита пола 200 м²
516 rebar_installation — армирование каркаса дома высота 5 м
517 rebar_cage_columns — арматурные каркасы колонн 16 шт
518 concrete_columns — бетонные колонны 16 шт высота 5 м
519 concrete_beams — бетонные балки 40 пог. м
520 concrete_ring_beam — армопояс 40 пог. м
521 monolithic_stairs — монолитная лестница 1 шт
522 monolithic_wall — монолитная стена 50 м²
523 retaining_wall_concrete — подпорная стена 20 пог. м
524 concrete_ramp — бетонный пандус 30 м²
525 concrete_driveway — бетонный заезд 120 м²
526 concrete_path — бетонные дорожки 100 м²
527 concrete_patio — бетонная площадка 80 м²
528 concrete_curbs — бетонные бордюры 100 пог. м
529 concrete_core_drilling — алмазное бурение бетона 20 отверстий
530 concrete_saw_cutting — резка бетона 50 пог. м
531 concrete_demolition — демонтаж бетона 20 м³
532 concrete_repair — ремонт бетона 50 м²
533 concrete_crack_injection — инъектирование трещин бетона 50 пог. м
534 concrete_surface_hardener — топпинг бетонного пола 200 м²
535 concrete_polishing — полировка бетона 150 м²
536 concrete_grinding — шлифовка бетона 150 м²
537 concrete_sealer — пропитка бетона 150 м²
538 concrete_anchors_install — анкера в бетон 100 шт
539 concrete_embed_plates — закладные детали 50 шт
540 formwork_installation — устройство опалубки 100 м²
541 formwork_demolition — демонтаж опалубки 100 м²
542 concrete_pump_service — бетононасос 1 смена
543 concrete_delivery — доставка бетона 30 м³
544 concrete_vibration — вибрирование бетона 30 м³
545 concrete_curing — уход за бетоном 200 м²
546 foundation_drainage — дренаж фундамента 100 пог. м
547 foundation_backfill — обратная засыпка фундамента 100 м³
548 geotextile_foundation — геотекстиль под основание 100 м²
549 foundation_project — проект фундамента 1 компл.
550 concrete_structure_turnkey — монолитные работы под ключ 1 компл.
551 brick_masonry — кладка кирпича 74 м²
552 brick_partition_masonry — перегородка в полкирпича 50 м²
553 facing_brick_masonry — лицевая кирпичная кладка 100 м²
554 rough_brick_masonry — черновая кирпичная кладка 100 м²
555 block_masonry — кладка блока 120 м²
556 aerated_block_masonry — кладка газоблока 100 м²
557 foam_block_masonry — кладка пеноблока 100 м²
558 ceramic_block_masonry — кладка керамического блока 100 м²
559 cinder_block_masonry — кладка шлакоблока 100 м²
560 stone_masonry — каменная кладка 40 м²
561 rubble_masonry — бутовая кладка 40 м²
562 chimney_brickwork — кирпичный дымоход 8 м
563 fireplace_brickwork — кладка камина 1 шт
564 stove_brickwork — кладка печи 1 шт
565 bbq_brickwork — кладка барбекю 1 шт
566 masonry_reinforcement — армирование кладки 100 м²
567 masonry_mesh_install — кладочная сетка 100 м²
568 lintel_installation — перемычки 12 шт
569 masonry_openings — проёмы в кладке 10 шт
570 masonry_demolition — демонтаж кирпичной стены 30 м²
571 block_wall_demolition — демонтаж блока 50 м²
572 brick_repointing — расшивка швов кирпича 60 м²
573 mortar_joint_repair — ремонт швов кладки 60 м²
574 masonry_crack_repair — ремонт трещин кладки 30 пог. м
575 masonry_cleaning — очистка кладки 100 м²
576 masonry_hydrophobic — гидрофобизация кладки 100 м²
577 masonry_plaster_preparation — подготовка кладки под штукатурку 100 м²
578 masonry_scaffolding — леса для кладки 100 м²
579 masonry_delivery_lifting — доставка и подъём кирпича 10 т
580 brick_material_takeoff — расчёт кирпича 74 м²
581 block_material_takeoff — расчёт блоков 100 м²
582 masonry_wall_1_2_brick — кладка в полкирпича 74 м²
583 masonry_wall_1_brick — кладка в один кирпич 74 м²
584 masonry_wall_1_5_brick — кладка в полтора кирпича 74 м²
585 masonry_wall_2_brick — кладка в два кирпича 74 м²
586 masonry_columns — кирпичные столбы 10 шт
587 masonry_fence_posts — кирпичные столбы забора 20 шт
588 brick_fence — кирпичный забор 100 пог. м
589 block_fence — забор из блоков 100 пог. м
590 stone_fence — каменный забор 100 пог. м
591 masonry_parapet — кирпичный парапет 50 пог. м
592 masonry_plinth — кирпичный цоколь 50 м²
593 masonry_arch — кирпичная арка 3 шт
594 masonry_vault — кирпичный свод 1 шт
595 masonry_repair_local — локальный ремонт кладки 20 м²
596 masonry_turnkey_wall — кладка стены под ключ 100 м²
597 masonry_turnkey_partition — кладка перегородок под ключ 100 м²
598 masonry_quality_control — контроль кладочных работ 1 компл.
599 masonry_project — проект кладки 1 компл.
600 masonry_full_package — кладочные работы под ключ 1 компл.
601 bathroom_waterproofing — гидроизоляция ванной 30 м²
602 shower_waterproofing — гидроизоляция душевой 12 м²
603 floor_waterproofing — гидроизоляция пола 60 м²
604 balcony_waterproofing — гидроизоляция балкона 15 м²
605 terrace_waterproofing — гидроизоляция террасы 50 м²
606 foundation_waterproofing — гидроизоляция фундамента 80 м²
607 basement_waterproofing — гидроизоляция подвала 100 м²
608 pool_waterproofing — гидроизоляция бассейна 60 м²
609 roof_membrane_waterproofing — мембранная гидроизоляция 150 м²
610 liquid_membrane_waterproofing — жидкая гидроизоляция 100 м²
611 bitumen_mastic_waterproofing — битумная мастика 100 м²
612 injection_waterproofing — инъекционная гидроизоляция 50 пог. м
613 expansion_joint_waterproofing — гидроизоляция деформационных швов 50 пог. м
614 waterproofing_tape_install — гидроизоляционная лента 100 пог. м
615 vapor_barrier_installation — пароизоляция 150 м²
616 windproof_membrane_install — ветрозащита 150 м²
617 facade_insulation_rockwool — фасад минвата 200 м²
618 facade_insulation_eps — фасад пенополистирол 200 м²
619 roof_insulation — утепление крыши 120 м²
620 attic_insulation — утепление чердака 100 м²
621 floor_insulation — утепление пола 100 м²
622 wall_insulation_internal — утепление стен изнутри 80 м²
623 basement_insulation — утепление подвала 100 м²
624 foundation_insulation — утепление фундамента 80 м²
625 pipe_insulation — изоляция труб 60 пог. м
626 duct_insulation — изоляция воздуховодов 80 пог. м
627 soundproof_wall — шумоизоляция стены 25 м²
628 soundproof_floor — шумоизоляция пола 80 м²
629 soundproof_ceiling — шумоизоляция потолка 60 м²
630 acoustic_room_treatment — акустическая обработка комнаты 30 м²
631 fireproofing_steel — огнезащита металла 100 м²
632 fireproofing_wood — огнезащита дерева 100 м²
633 fireproofing_cable — огнезащита кабелей 100 пог. м
634 thermal_bridge_repair — устранение мостиков холода 50 пог. м
635 insulation_demolition — демонтаж утеплителя 100 м²
636 waterproofing_demolition — демонтаж гидроизоляции 100 м²
637 insulation_material_takeoff — расчёт утеплителя 200 м²
638 waterproofing_material_takeoff — расчёт гидроизоляции 100 м²
639 waterproofing_repair_local — локальный ремонт гидроизоляции 20 м²
640 basement_leak_repair — устранение протечек подвала 1 услуга
641 foundation_drainage_membrane — профилированная мембрана фундамента 80 м²
642 roof_vapor_barrier — пароизоляция кровли 120 м²
643 roof_windproofing — ветрозащита кровли 120 м²
644 balcony_thermal_break — утепление балконного узла 10 пог. м
645 wet_zone_turnkey_waterproofing — гидроизоляция мокрых зон под ключ 50 м²
646 technical_room_waterproofing — гидроизоляция техпомещения 80 м²
647 parking_waterproofing — гидроизоляция паркинга 300 м²
648 green_roof_waterproofing — гидроизоляция зелёной кровли 100 м²
649 waterproofing_project — проект гидроизоляции 1 компл.
650 insulation_turnkey — утепление под ключ 200 м²
651 flooring_demolition — демонтаж пола 100 м²
652 wall_demolition_non_load — демонтаж перегородки 40 м²
653 wall_demolition_load_warning — демонтаж несущей стены 10 м²
654 tile_demolition — демонтаж плитки 60 м²
655 plaster_demolition — снятие штукатурки 100 м²
656 wallpaper_demolition — снятие обоев 100 м²
657 paint_removal — снятие краски 100 м²
658 ceiling_demolition — демонтаж потолка 70 м²
659 drywall_demolition — демонтаж гипсокартона 60 м²
660 door_demolition — демонтаж дверей 10 шт
661 window_demolition — демонтаж окон 10 шт
662 plumbing_demolition — демонтаж сантехники 1 компл.
663 electrical_demolition — демонтаж электрики 100 пог. м
664 heating_demolition — демонтаж отопления 1 компл.
665 roof_demolition — демонтаж кровли 120 м²
666 facade_demolition — демонтаж фасада 200 м²
667 concrete_demolition — демонтаж бетона 20 м³
668 brick_wall_demolition — демонтаж кирпичной стены 30 м²
669 block_wall_demolition — демонтаж блоков 50 м²
670 asphalt_demolition — демонтаж асфальта 500 м²
671 excavation_demolition — разработка грунта 100 м³
672 site_clearing — расчистка участка 1000 м²
673 tree_removal — удаление деревьев 20 шт
674 stump_removal — корчевание пней 20 шт
675 debris_removal — вывоз строительного мусора 10 т
676 container_rental — контейнер под мусор 10 м³
677 manual_loading — ручная погрузка мусора 10 т
678 mechanical_loading — механизированная погрузка 50 т
679 dust_protection — пылезащита помещения 100 м²
680 temporary_protection — временная защита поверхностей 100 м²
681 floor_protection — защита пола 100 м²
682 elevator_protection — защита лифта 1 компл.
683 site_fencing_temporary — временное ограждение 100 пог. м
684 temporary_lighting — временное освещение 20 точек
685 temporary_power — временное электропитание 1 компл.
686 temporary_water — временная вода 1 компл.
687 construction_cleaning_rough — черновая уборка 300 м²
688 construction_cleaning_final — финишная уборка 300 м²
689 post_renovation_cleaning — уборка после ремонта 300 м²
690 facade_cleaning_after_work — уборка фасада после работ 300 м²
691 pressure_washing — мойка высокого давления 300 м²
692 snow_removal_site — уборка снега участка 1000 м²
693 demolition_project — проект демонтажа 1 компл.
694 demolition_permit_docs — документы на демонтаж 1 компл.
695 waste_disposal_docs — документы утилизации 1 компл.
696 hazardous_material_removal — удаление опасных материалов 1 услуга
697 asbestos_warning_removal — демонтаж асбестосодержащих материалов 1 услуга
698 mold_remediation — удаление плесени 50 м²
699 fire_damage_cleanup — уборка после пожара 100 м²
700 water_damage_cleanup — уборка после затопления 100 м²
701 asphalt_paving — прокладка асфальта 10000 м²
702 asphalt_parking_lot — асфальтирование парковки 3500 м²
703 asphalt_driveway — асфальтирование заезда 120 м²
704 asphalt_patch_repair — ямочный ремонт асфальта 300 м²
705 asphalt_milling — фрезеровка асфальта 1000 м²
706 asphalt_overlay — верхний слой асфальта 1000 м²
707 asphalt_base_layer — нижний слой асфальта 1000 м²
708 gravel_road_base — щебёночное основание дороги 1000 м²
709 sand_road_base — песчаное основание дороги 1000 м²
710 geotextile_road_base — геотекстиль дороги 1000 м²
711 road_compaction — уплотнение дорожного основания 1000 м²
712 curb_installation — установка бордюра 200 пог. м
713 road_curb_demolition — демонтаж бордюра 200 пог. м
714 paving_slabs — тротуарная плитка 500 м²
715 paving_stone_driveway — брусчатка заезда 300 м²
716 concrete_paving — бетонное мощение 300 м²
717 gravel_path — щебёночная дорожка 300 м²
718 garden_path_paving — садовая дорожка 200 м²
719 drainage_lot — ливнёвка парковки 1000 м²
720 stormwater_channel — водоотводные лотки 200 пог. м
721 catch_basin_install — дождеприёмники 20 шт
722 manhole_installation — колодцы 10 шт
723 road_marking — дорожная разметка 1000 пог. м
724 speed_bump_install — лежачие полицейские 10 шт
725 road_sign_install — дорожные знаки 20 шт
726 parking_bollards — парковочные столбики 50 шт
727 wheel_stops — колесоотбойники 50 шт
728 parking_barrier_install — парковочные барьеры 20 шт
729 site_grading — планировка участка 1000 м²
730 landscaping_leveling — планировка участка 800 м²
731 topsoil_spreading — плодородный грунт 500 м²
732 lawn_installation — газон 500 м²
733 roll_lawn_installation — рулонный газон 500 м²
734 irrigation_system — автополив 500 м²
735 garden_drainage — дренаж участка 100 пог. м
736 retaining_wall_landscape — подпорная стенка участка 30 пог. м
737 fence_installation — забор 100 пог. м
738 gate_installation — ворота 1 шт
739 wicket_gate_installation — калитка 1 шт
740 playground_base — основание детской площадки 200 м²
741 rubber_playground_surface — резиновое покрытие площадки 200 м²
742 sports_court_surface — спортивная площадка 500 м²
743 outdoor_stairs_landscape — наружные ступени 20 м²
744 ramp_outdoor — наружный пандус 30 м²
745 landscape_lighting — освещение участка 20 точек
746 pergola_installation — пергола 1 шт
747 gazebo_installation — беседка 1 шт
748 retaining_drainage — дренаж подпорной стены 30 пог. м
749 site_cleanup_landscape — уборка участка 1000 м²
750 landscape_turnkey — благоустройство участка под ключ 1000 м²
751 welded_frame — сварной каркас 500 кг
752 metal_stairs — металлическая лестница 1 шт
753 metal_railing — металлические перила 50 пог. м
754 balcony_railing — балконные перила 30 пог. м
755 steel_canopy — металлический навес 30 м²
756 canopy_installation — навес 30 м²
757 metal_fence — металлический забор 100 пог. м
758 chain_link_fence — сетка-рабица 100 пог. м
759 profiled_sheet_fence — забор из профлиста 100 пог. м
760 metal_gate — металлические ворота 1 шт
761 sliding_gate_metal — откатные ворота 1 шт
762 metal_door — металлическая дверь 1 шт
763 steel_beam_installation — монтаж стальных балок 2 т
764 steel_column_installation — монтаж стальных колонн 2 т
765 metal_truss_installation — фермы металлические 2 т
766 metal_roof_frame — металлический каркас крыши 2 т
767 warehouse_steel_frame — металлокаркас склада 10 т
768 steel_platform — металлическая площадка 2 т
769 steel_mezzanine — антресоль металлическая 5 т
770 metal_decking_install — профнастил перекрытия 200 м²
771 welding_repair — сварочный ремонт 1 услуга
772 welding_on_site — сварочные работы на объекте 1 смена
773 metal_cutting — резка металла 500 кг
774 metal_drilling — сверление металла 100 отверстий
775 metal_painting — покраска металлоконструкций 100 м²
776 anti_corrosion_coating — антикоррозийная обработка металла 100 м²
777 fireproofing_steel — огнезащита металлоконструкций 100 м²
778 galvanized_sheet_install — оцинкованный лист 100 м²
779 metal_cladding — металлическая облицовка 100 м²
780 stainless_railing — нержавеющие перила 30 пог. м
781 glass_metal_railing — стеклянно-металлические перила 30 пог. м
782 metal_shelves — металлические стеллажи 20 шт
783 metal_ladder — металлическая лестница приставная 1 шт
784 emergency_stairs_metal — пожарная лестница 1 шт
785 bollard_installation — металлические болларды 20 шт
786 barrier_installation — шлагбаум 1 шт
787 metal_grating_install — металлические решётки 50 м²
788 floor_grating_install — настил решётчатый 50 м²
789 metal_handrail — поручни металлические 50 пог. м
790 pipe_supports_metal — опоры труб 50 шт
791 cable_tray_metal — металлические лотки 100 пог. м
792 metal_partition — металлическая перегородка 50 м²
793 container_modification — модификация контейнера 1 шт
794 garage_metal_frame — металлокаркас гаража 1 шт
795 carport_metal_frame — каркас навеса для авто 1 шт
796 steel_structure_project — проект металлоконструкций 1 компл.
797 steel_structure_delivery — доставка металлоконструкций 10 т
798 crane_metal_install — монтаж металла краном 1 смена
799 metal_demolition — демонтаж металлоконструкций 5 т
800 metalworks_turnkey — металлоконструкции под ключ 5 т
801 timber_frame_house — деревянный каркас дома 100 м²
802 timber_wall_frame — деревянный каркас стены 80 м²
803 timber_floor_joists — деревянные лаги пола 100 м²
804 timber_roof_rafters — деревянные стропила 100 м²
805 wood_deck — деревянный настил 40 м²
806 terrace_board — террасная доска 50 м²
807 composite_decking — ДПК террасная доска 50 м²
808 wooden_stairs — деревянная лестница 1 шт
809 wooden_railing — деревянные перила 30 пог. м
810 wooden_fence — деревянный забор 100 пог. м
811 pergola_wood — деревянная пергола 1 шт
812 gazebo_wood — деревянная беседка 1 шт
813 wooden_canopy — деревянный навес 30 м²
814 timber_cladding_wall — обшивка стен деревом 50 м²
815 timber_ceiling_cladding — обшивка потолка деревом 50 м²
816 clapboard_installation — вагонка 80 м²
817 blockhouse_installation — блок-хаус 80 м²
818 imitation_timber_install — имитация бруса 80 м²
819 wooden_floor_sanding — шлифовка деревянного пола 80 м²
820 wood_floor_oiling — масло для деревянного пола 80 м²
821 wood_varnishing — лакировка дерева 80 м²
822 wood_painting — покраска дерева 100 м²
823 wood_antiseptic — антисептик дерева 100 м²
824 wood_fireproofing — огнезащита дерева 100 м²
825 carpentry_custom_shelf — столярные полки 10 шт
826 built_in_wardrobe — встроенный шкаф 1 шт
827 kitchen_cabinet_install — кухонные шкафы 1 компл.
828 countertop_installation — столешница 5 пог. м
829 wooden_door_repair — ремонт деревянной двери 5 шт
830 window_wood_repair — ремонт деревянных окон 5 шт
831 wooden_skirt_board — деревянный плинтус 100 пог. м
832 wooden_trim_install — деревянные наличники 50 пог. м
833 wooden_partition — деревянная перегородка 50 м²
834 sauna_wood_finish — отделка сауны деревом 20 м²
835 bathhouse_wood_finish — отделка бани деревом 40 м²
836 log_house_caulk — конопатка сруба 100 пог. м
837 log_house_sanding — шлифовка сруба 100 м²
838 log_house_painting — покраска сруба 100 м²
839 timber_repair_rot — ремонт гнилой древесины 20 м²
840 wood_demolition — демонтаж деревянных конструкций 50 м²
841 wooden_subfloor — деревянный черновой пол 100 м²
842 plywood_wall_sheathing — фанерная обшивка стен 80 м²
843 osb_wall_sheathing — OSB обшивка стен 80 м²
844 wooden_gate — деревянные ворота 1 шт
845 wooden_playground — деревянная площадка 1 компл.
846 wooden_platform — деревянный подиум 30 м²
847 acoustic_wood_panels — акустические деревянные панели 50 м²
848 wood_material_takeoff — расчёт пиломатериала 1 компл.
849 carpentry_project — проект столярных изделий 1 компл.
850 carpentry_turnkey — столярные работы под ключ 1 компл.
851 office_fitout — офисная отделка под ключ 300 м²
852 retail_fitout — отделка магазина 200 м²
853 restaurant_fitout — отделка ресторана 200 м²
854 clinic_fitout — отделка клиники 200 м²
855 classroom_fitout — отделка учебного класса 100 м²
856 hotel_room_renovation — ремонт гостиничного номера 30 м²
857 apartment_turnkey_renovation — ремонт квартиры под ключ 80 м²
858 house_turnkey_renovation — ремонт дома под ключ 150 м²
859 bathroom_turnkey — ванная под ключ 6 м²
860 kitchen_renovation — ремонт кухни 12 м²
861 garage_renovation — ремонт гаража 40 м²
862 basement_finish — отделка подвала 100 м²
863 attic_finish — отделка мансарды 80 м²
864 cleanroom_finish — чистое помещение 100 м²
865 medical_wall_covering — медицинское покрытие стен 100 м²
866 anti_bacterial_paint — антибактериальная краска 100 м²
867 industrial_wall_panels — промышленные стеновые панели 200 м²
868 warehouse_floor_marking — разметка склада 1000 пог. м
869 warehouse_rack_install — стеллажи склада 50 секций
870 loading_dock_finish — доковая зона 1 компл.
871 acoustic_room_build — акустическая комната 30 м²
872 recording_studio_finish — студия звукозаписи 30 м²
873 server_room_fitout — серверная комната 30 м²
874 fire_rated_partition — противопожарная перегородка 50 м²
875 clean_floor_epoxy — эпоксидный пол чистого помещения 100 м²
876 anti_static_floor — антистатический пол 100 м²
877 hospital_flooring — медицинский пол 100 м²
878 school_flooring — пол школы 200 м²
879 restaurant_tile_floor — плитка ресторана 100 м²
880 commercial_kitchen_wall — стены коммерческой кухни 80 м²
881 waterproof_commercial_kitchen — гидроизоляция кухни 80 м²
882 cold_room_panels — холодильная камера панели 50 м²
883 industrial_door_install — промышленные двери 3 шт
884 dock_gate_install — доковые ворота 2 шт
885 shopfront_signage — вывеска магазина 1 шт
886 retail_shelving_install — торговые стеллажи 50 шт
887 office_glass_partitions — офисные стеклянные перегородки 100 м²
888 office_carpet_tiles — ковровая плитка офис 200 м²
889 office_ceiling_grid — потолок офис 200 м²
890 office_lighting_grid — офисное освещение 100 точек
891 office_network_points — сеть офис 100 точек
892 office_painting — покраска офиса 300 м²
893 office_demolition — демонтаж офиса 300 м²
894 commercial_cleaning_after_fitout — уборка после fit-out 300 м²
895 commercial_handover_docs — исполнительная документация 1 компл.
896 tenant_improvement — tenant improvement 300 м²
897 mall_unit_fitout — отделка торгового павильона 100 м²
898 coworking_fitout — отделка коворкинга 300 м²
899 gym_fitout — отделка спортзала 300 м²
900 commercial_fitout_turnkey — коммерческая отделка под ключ 300 м²
901 design_project — дизайн-проект квартиры 80 м²
902 architectural_project — архитектурный проект дома 150 м²
903 structural_project — конструктивный проект 150 м²
904 engineering_project — инженерный проект 150 м²
905 electrical_project — проект электрики 80 м²
906 plumbing_project — проект сантехники 80 м²
907 hvac_project — проект HVAC 100 м²
908 roof_project — проект кровли 120 м²
909 facade_project — проект фасада 200 м²
910 foundation_project — проект фундамента 100 м²
911 masonry_project — проект кладки 100 м²
912 landscape_project — ландшафтный проект 1000 м²
913 roadworks_project — проект благоустройства/дороги 1000 м²
914 fire_safety_project — проект пожарной безопасности 1 компл.
915 accessibility_project — проект доступной среды 1 компл.
916 measurement_survey — обмеры помещения 100 м²
917 geodetic_survey — геодезическая съёмка участка 1000 м²
918 topographic_survey — топосъёмка 1000 м²
919 geological_survey — геология участка 1 компл.
920 thermal_imaging_survey — тепловизионное обследование 1 компл.
921 building_condition_survey — обследование здания 1 компл.
922 structural_inspection — обследование конструкций 1 компл.
923 roof_inspection — обследование кровли 1 компл.
924 facade_inspection — обследование фасада 1 компл.
925 moisture_inspection — обследование влажности 1 компл.
926 quantity_takeoff — ведомость объёмов работ 1 компл.
927 material_takeoff — расчёт материалов 1 компл.
928 estimate_documentation — сметная документация 1 компл.
929 boq_preparation — BOQ ведомость 1 компл.
930 tender_package — тендерный пакет 1 компл.
931 construction_schedule — календарный график 1 компл.
932 quality_control_plan — план контроля качества 1 компл.
933 safety_plan — план безопасности 1 компл.
934 method_statement — технологическая карта 1 компл.
935 as_built_docs — исполнительная документация 1 компл.
936 hidden_works_acts — акты скрытых работ 1 компл.
937 material_certificates_review — проверка сертификатов 1 компл.
938 site_supervision — авторский надзор 1 месяц
939 technical_supervision — технадзор 1 месяц
940 project_management — управление проектом 1 месяц
941 cost_control — контроль бюджета 1 месяц
942 procurement_plan — план закупок 1 компл.
943 delivery_schedule — график поставок 1 компл.
944 risk_assessment — оценка рисков 1 компл.
945 permit_documents — разрешительная документация 1 компл.
946 demolition_permit_docs — документы на демонтаж 1 компл.
947 utility_connection_docs — документы на подключение сетей 1 компл.
948 commissioning_docs — документы ввода в эксплуатацию 1 компл.
949 maintenance_manual — инструкция эксплуатации 1 компл.
950 documentation_turnkey — документация под ключ 1 компл.
951 delivery_lifting — доставка и подъём материалов 5 т
952 material_delivery_small — доставка материалов 1 рейс
953 material_delivery_truck — доставка грузовиком 10 т
954 crane_service — кран 1 смена
955 manipulator_service — манипулятор 1 смена
956 excavator_service — экскаватор 1 смена
957 mini_excavator_service — мини-экскаватор 1 смена
958 loader_service — погрузчик 1 смена
959 dump_truck_service — самосвал 1 смена
960 concrete_pump_service — бетононасос 1 смена
961 asphalt_paver_service — асфальтоукладчик 1 смена
962 road_roller_service — каток 1 смена
963 scaffolding_rental — аренда лесов 300 м²
964 formwork_rental — аренда опалубки 100 м²
965 tool_rental — аренда инструмента 1 компл.
966 temporary_site_office — бытовка 1 мес
967 temporary_toilet — временный туалет 1 мес
968 site_security — охрана объекта 1 мес
969 site_waste_container — контейнер мусор 10 м³
970 material_storage — хранение материалов 1 мес
971 procurement_list — закупочный список ремонта 100 м²
972 rebar_product_search — найти арматуру Ø14 для каркаса дома
973 tile_product_search — подобрать плитку для ванной 40 м²
974 laminate_product_search — найти ламинат 100 м²
975 roofing_material_search — подобрать материал для крыши 100 м²
976 brick_product_search — найти кирпич для кладки 74 м²
977 concrete_supplier_search — найти бетон М300 30 м³
978 sand_supplier_search — найти песок 20 м³
979 gravel_supplier_search — найти щебень 30 м³
980 insulation_supplier_search — найти утеплитель 200 м²
981 paint_supplier_search — найти краску для стен 100 м²
982 gypsum_board_supplier_search — найти гипсокартон 80 м²
983 profile_supplier_search — найти профиль ГКЛ 80 м²
984 waterproofing_supplier_search — найти гидроизоляцию 50 м²
985 sealant_supplier_search — найти герметик 100 пог. м
986 fasteners_supplier_search — найти крепёж для кровли 100 м²
987 plumbing_parts_search — найти трубы и фитинги 40 м
988 electrical_parts_search — найти кабель и автоматы для квартиры 80 м²
989 hvac_equipment_search — подобрать кондиционер 4 шт
990 window_supplier_search — найти ПВХ окна 1.5 на 1.5
991 door_supplier_search — найти межкомнатные двери 5 шт
992 asphalt_supplier_search — найти асфальтобетон для 10000 м²
993 paver_supplier_search — найти тротуарную плитку 500 м²
994 rental_equipment_search — найти аренду катка и асфальтоукладчика
995 supplier_quote_request — запросить КП у поставщиков 1 компл.
996 purchase_order_creation — создать закупку материалов 1 компл.
997 delivery_quote_request — запросить доставку материалов 1 компл.
998 estimate_to_procurement — смета в закупочный список 1 компл.
999 estimate_to_pdf — сделать PDF по смете 1 компл.
1000 full_repair_materials_procurement — смета и закупка ремонта под ключ 100 м²
`;

export const BUILT_IN_AI_1000_CONSTRUCTION_CASES: readonly BuiltInAi1000Case[] =
  RAW_BUILT_IN_AI_1000_CASES
    .trim()
    .split("\n")
    .map((line) => parseManifestLine(line.trim()));

if (BUILT_IN_AI_1000_CONSTRUCTION_CASES.length !== 1000) {
  throw new Error(`BUILT_IN_AI_1000_CASES_COUNT_INVALID:${BUILT_IN_AI_1000_CONSTRUCTION_CASES.length}`);
}

export const BUILT_IN_AI_1000_ESTIMATE_CASES: readonly BuiltInAi1000Case[] =
  BUILT_IN_AI_1000_CONSTRUCTION_CASES.filter((testCase) => !testCase.productSearchCompanion);

export const BUILT_IN_AI_1000_PRODUCT_CASES: readonly BuiltInAi1000Case[] =
  BUILT_IN_AI_1000_CONSTRUCTION_CASES.filter((testCase) => testCase.productSearchCompanion);

function uniqueCasesByWorkKey(cases: readonly BuiltInAi1000Case[]): BuiltInAi1000Case[] {
  const seen = new Set<string>();
  return cases.filter((testCase) => {
    if (seen.has(testCase.workKey)) return false;
    seen.add(testCase.workKey);
    return true;
  });
}

const BUILT_IN_AI_1000_DANGEROUS_WORK_KEYS = new Set(
  BUILT_IN_AI_1000_CONSTRUCTION_CASES
    .filter((testCase) => testCase.dangerousWork)
    .map((testCase) => testCase.workKey),
);

export const BUILT_IN_AI_1000_WORK_TYPE_DEFINITIONS: readonly GlobalWorkTypeDefinition[] =
  uniqueCasesByWorkKey(BUILT_IN_AI_1000_CONSTRUCTION_CASES).map((testCase) => {
    const pack = packForId(Number(testCase.id));
    const measureUnit = unitForDefinition(testCase.unit);
    const safetyReviewRequired = BUILT_IN_AI_1000_DANGEROUS_WORK_KEYS.has(testCase.workKey);
    return {
      workKey: testCase.workKey,
      category: pack.workCategory,
      names: {
        ru: testCase.titleRu,
        en: testCase.workKey.replace(/_/g, " "),
      },
      defaultMeasureUnit: measureUnit,
      dangerous: safetyReviewRequired,
      safetyReviewRequired,
    };
  });

export const BUILT_IN_AI_1000_WORK_ALIASES: readonly Omit<GlobalWorkAlias, "normalizedAlias">[] =
  BUILT_IN_AI_1000_CONSTRUCTION_CASES.flatMap((testCase) => [
    { workKey: testCase.workKey, language: "ru", alias: testCase.promptRu },
    { workKey: testCase.workKey, language: "ru", alias: testCase.titleRu },
  ]);

export const BUILT_IN_AI_1000_BOQ_HINTS: Readonly<Record<string, readonly string[]>> =
  Object.freeze(BUILT_IN_AI_1000_CONSTRUCTION_CASES.reduce<Record<string, string[]>>((hints, testCase) => {
    const existing = hints[testCase.workKey] ?? [];
    hints[testCase.workKey] = [...new Set([...existing, ...testCase.expectedRowsContain])];
    return hints;
  }, {}));

export const BUILT_IN_AI_1000_CATEGORY_SUMMARY = Object.freeze(
  BUILT_IN_AI_1000_CONSTRUCTION_CASES.reduce<Record<string, number>>((summary, testCase) => {
    summary[testCase.category] = (summary[testCase.category] ?? 0) + 1;
    return summary;
  }, {}),
);
