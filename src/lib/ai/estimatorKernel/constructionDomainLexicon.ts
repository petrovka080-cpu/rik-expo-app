import type { GlobalWorkCategory } from "../globalEstimate";
import { normalizeDimensionText } from "../constructionFormulas";
import type { EstimatorKernelComplexity } from "./estimatorKernelTypes";

export type EstimatorDomainLexiconEntry = {
  domain: string;
  terms: readonly string[];
  casePhrases: readonly string[];
  category: GlobalWorkCategory;
  object: string;
  operation: string;
  method: string;
  materialSystem: string;
  complexity: EstimatorKernelComplexity;
  requiredMaterials: readonly string[];
  requiredLabor: readonly string[];
  requiredEquipmentOrWarnings: readonly string[];
  requiredLogisticsOrWarnings: readonly string[];
  exclusions: readonly string[];
  clarifyingQuestions: readonly string[];
  unitRules: readonly string[];
  regulatedSafetyRequired?: boolean;
};

const sharedExclusions = [
  "Проектирование, разрешения и скрытые работы уточняются отдельно.",
  "Демонтаж, доставка, подъем и вывоз мусора включаются только при подтверждении условий площадки.",
];

const sharedQuestions = [
  "Укажите город, адрес и доступ к объекту для локальной ставки.",
  "Подтвердите фактический объем, основание и требования к материалам.",
];

function e(input: EstimatorDomainLexiconEntry): EstimatorDomainLexiconEntry {
  return input;
}

export const ESTIMATOR_DOMAIN_LEXICON: readonly EstimatorDomainLexiconEntry[] = [
  e({
    domain: "medical_gases",
    terms: ["медицинские газы", "медицинский газ", "медгаз", "кислородная линия", "вакуум медицинский"],
    casePhrases: ["монтаж медицинских газов", "медицинские газы 40 точек", "кислородные точки клиники", "система медицинских газов", "пнр медицинских газов"],
    category: "plumbing",
    object: "medical_gas_system",
    operation: "installation",
    method: "regulated_medical_gas_pipeline",
    materialSystem: "medical_gas_system",
    complexity: "complex",
    requiredMaterials: ["трубопроводы медицинских газов", "медицинские газовые розетки", "запорная арматура и коллекторы", "маркировка линий", "расходники для испытаний"],
    requiredLabor: ["обследование трасс и помещений", "монтаж трубопроводов медицинских газов", "установка точек потребления", "опрессовка и продувка линий", "ПНР и исполнительная документация"],
    requiredEquipmentOrWarnings: ["испытательное оборудование", "газоанализатор / контроль чистоты warning", "только профильная организация warning"],
    requiredLogisticsOrWarnings: ["доставка труб и газовых розеток", "координация с медтехнологией и эксплуатацией"],
    exclusions: sharedExclusions,
    clarifyingQuestions: ["Какие газы нужны: кислород, вакуум, воздух, закись азота?", "Сколько точек по каждому газу и есть ли проект медтехнологии?", "Нужны ли коллекторы, рампы, сигнализация и сдача с протоколами?"],
    unitRules: ["medical_gas_points_pcs", "pipeline_linear_m"],
    regulatedSafetyRequired: true,
  }),
  e({
    domain: "external_water_supply",
    terms: ["наружный водопровод", "наружные сети водопровода", "наружная сеть водоснабжения", "водопроводная линия"],
    casePhrases: ["прокладка наружного водопровода", "наружный водопровод 120 м.п.", "монтаж водопроводной линии", "наружные сети водоснабжения", "испытание наружного водопровода"],
    category: "plumbing",
    object: "external_water_supply_pipeline",
    operation: "installation",
    method: "external_water_supply_pipework",
    materialSystem: "external_water_supply_system",
    complexity: "infrastructure",
    requiredMaterials: ["водопроводная труба ПЭ / ПНД", "фитинги и фасонные части", "запорная арматура", "песчаная подготовка", "сигнальная лента и маркировка"],
    requiredLabor: ["разметка трассы", "разработка траншеи", "укладка наружного водопровода", "обратная засыпка и уплотнение", "опрессовка и промывка"],
    requiredEquipmentOrWarnings: ["экскаватор warning", "сварочный аппарат ПНД", "испытательный насос"],
    requiredLogisticsOrWarnings: ["доставка труб", "вывоз грунта", "согласование врезки warning"],
    exclusions: sharedExclusions,
    clarifyingQuestions: ["Какая глубина заложения и диаметр трубы?", "Есть ли проект, точки врезки и колодцы?", "Нужны ли восстановление покрытия и лабораторные испытания воды?"],
    unitRules: ["water_pipe_linear_m", "nodes_pcs"],
  }),
  e({ domain: "flooring", terms: ["линолеум", "ламинат", "паркет", "кварцвинил", "виниловый пол", "ковролин", "пвх покрытие", "рулонное покрытие"], casePhrases: ["укладка линолеума", "настил ламината", "монтаж ПВХ покрытия", "укладка паркета", "замена напольного покрытия", "укладка кварцвинила", "укладка ковролина"], category: "flooring", object: "floor_covering", operation: "installation", method: "floor_covering_installation", materialSystem: "floor_covering_system", complexity: "medium", requiredMaterials: ["напольное покрытие", "подложка / клей", "плинтус", "порожки"], requiredLabor: ["подготовка основания", "раскрой покрытия", "укладка покрытия", "подрезка примыканий"], requiredEquipmentOrWarnings: ["ручной инструмент", "строительный пылесос"], requiredLogisticsOrWarnings: ["доставка покрытия", "вынос отходов"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["floor_covering_rows_sq_m", "baseboard_linear_m"] }),
  e({ domain: "tiling", terms: ["плитк", "керамогранит", "кафель", "мозаик"], casePhrases: ["укладка плитки на пол", "облицовка стен керамогранитом", "кладка кафеля", "монтаж мозаики", "плитка в санузле"], category: "tile", object: "tile_surface", operation: "installation", method: "tile_adhesive_laying", materialSystem: "ceramic_tile_system", complexity: "medium", requiredMaterials: ["плитка / керамогранит", "плиточный клей", "затирка", "крестики / СВП"], requiredLabor: ["подготовка основания", "раскладка плитки", "укладка плитки", "затирка швов"], requiredEquipmentOrWarnings: ["плиткорез", "миксер для клея"], requiredLogisticsOrWarnings: ["доставка плитки", "резерв на бой и подрезку"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["tile_sq_m", "grout_kg", "trim_linear_m"] }),
  e({ domain: "drywall", terms: ["гкл", "гипсокартон", "сухое строительство", "перегородк"], casePhrases: ["монтаж перегородки ГКЛ", "обшивка стен гипсокартоном", "каркас под ГКЛ", "зашивка ниши гипсокартоном", "потолок из ГКЛ"], category: "drywall", object: "drywall_system", operation: "installation", method: "drywall_metal_frame", materialSystem: "drywall_system", complexity: "medium", requiredMaterials: ["листы ГКЛ", "направляющий профиль", "стоечный профиль", "подвесы и крепеж", "лента и шпаклевка швов"], requiredLabor: ["разметка каркаса", "монтаж каркаса", "обшивка листами ГКЛ", "заделка швов"], requiredEquipmentOrWarnings: ["шуруповерт", "лазерный уровень"], requiredLogisticsOrWarnings: ["доставка листов ГКЛ", "подъем листов"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["drywall_sq_m", "profile_linear_m", "fasteners_pcs"] }),
  e({ domain: "painting", terms: ["покраск", "окраск", "краск", "покрасить"], casePhrases: ["покраска стен", "окраска потолка", "покраска фасада", "нанесение грунта и краски", "перекраска помещений"], category: "painting", object: "painted_surface", operation: "finishing", method: "primer_paint_system", materialSystem: "paint_system", complexity: "simple", requiredMaterials: ["грунтовка", "краска", "малярная лента", "укрывная пленка"], requiredLabor: ["подготовка поверхности", "грунтование", "окраска в два слоя", "контроль укрывистости"], requiredEquipmentOrWarnings: ["валики и кисти", "краскопульт warning"], requiredLogisticsOrWarnings: ["доставка ЛКМ", "защита помещений"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["paint_sq_m", "primer_liters"] }),
  e({ domain: "plastering", terms: ["штукатур", "выравнивание стен", "машинная штукатурка"], casePhrases: ["штукатурка стен", "машинная штукатурка", "выравнивание стен гипсом", "цементная штукатурка фасада", "штукатурка откосов"], category: "plastering", object: "plastered_surface", operation: "finishing", method: "plaster_leveling", materialSystem: "plaster_system", complexity: "medium", requiredMaterials: ["штукатурная смесь", "маяки", "грунтовка", "уголки"], requiredLabor: ["грунтование", "установка маяков", "нанесение штукатурки", "затирка поверхности"], requiredEquipmentOrWarnings: ["штукатурная станция warning", "правило и уровень"], requiredLogisticsOrWarnings: ["доставка сухих смесей", "вывоз мешков"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["plaster_sq_m", "mix_kg"] }),
  e({ domain: "ceilings", terms: ["потол", "натяжной", "подвесной потолок", "армстронг"], casePhrases: ["монтаж натяжного потолка", "подвесной потолок Армстронг", "реечный потолок", "ГКЛ потолок", "покраска потолка"], category: "ceiling", object: "ceiling_system", operation: "installation", method: "ceiling_system_install", materialSystem: "ceiling_system", complexity: "medium", requiredMaterials: ["профиль потолка", "полотно / панели", "подвесы", "крепеж потолочной системы"], requiredLabor: ["разметка уровня", "монтаж каркаса", "монтаж покрытия потолка", "обход светильников"], requiredEquipmentOrWarnings: ["лазерный уровень", "стремянки / подмости"], requiredLogisticsOrWarnings: ["доставка потолочной системы", "подъем материалов"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["ceiling_sq_m", "perimeter_linear_m"] }),
  e({ domain: "doors", terms: ["двер", "дверной блок", "межкомнатная дверь", "входная дверь"], casePhrases: ["установка межкомнатных дверей", "монтаж входной двери", "замена дверных блоков", "установка дверей с доборами", "монтаж противопожарной двери"], category: "doors_windows", object: "door_block", operation: "installation", method: "door_block_install", materialSystem: "door_system", complexity: "simple", requiredMaterials: ["дверной блок", "коробка и наличники", "доборы", "петли и фурнитура"], requiredLabor: ["демонтаж старого блока warning", "подготовка проема", "монтаж коробки", "навеска полотна"], requiredEquipmentOrWarnings: ["перфоратор", "уровень"], requiredLogisticsOrWarnings: ["доставка дверей", "вынос упаковки"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["door_pcs", "foam_set"] }),
  e({ domain: "windows", terms: ["окн", "стеклопакет", "витраж", "оконный блок"], casePhrases: ["установка окон ПВХ", "замена стеклопакетов", "монтаж витражных окон", "установка оконных блоков", "остекление балкона"], category: "doors_windows", object: "window_block", operation: "installation", method: "window_block_install", materialSystem: "window_system", complexity: "medium", requiredMaterials: ["оконный блок", "подоконник", "отлив", "монтажная пена"], requiredLabor: ["обмер проемов", "демонтаж старого окна warning", "монтаж оконного блока", "герметизация примыканий"], requiredEquipmentOrWarnings: ["подъем стеклопакетов", "страховка на высоте warning"], requiredLogisticsOrWarnings: ["доставка окон", "вывоз старых рам"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["window_pcs", "sealant_linear_m"] }),
  e({ domain: "waterproofing", terms: ["гидроизоляц", "мембрана", "битумная мастика", "рулонная изоляция"], casePhrases: ["гидроизоляционные работы", "гидроизоляция крыши", "гидроизоляция ванной", "гидроизоляция фундамента", "мембрана на кровлю", "гидроизоляция подвала"], category: "waterproofing", object: "waterproofing_surface", operation: "waterproofing", method: "membrane_or_mastic_waterproofing", materialSystem: "waterproofing_system", complexity: "medium", requiredMaterials: ["гидроизоляционный материал", "праймер", "герметик примыканий", "армирующая лента"], requiredLabor: ["подготовка основания", "нанесение праймера", "монтаж гидроизоляции", "герметизация примыканий"], requiredEquipmentOrWarnings: ["газовая горелка warning", "ручной инструмент"], requiredLogisticsOrWarnings: ["доставка гидроизоляции", "утилизация отходов"], exclusions: sharedExclusions, clarifyingQuestions: ["Уточните объект: крыша, ванная, фундамент, подвал или балкон?", ...sharedQuestions], unitRules: ["waterproofing_sq_m", "joint_linear_m"] }),
  e({ domain: "roofing", terms: ["двускат", "двухскат", "кровл", "крыш", "стропил", "мауэрлат"], casePhrases: ["установка двухскатной крыши", "монтаж скатной кровли", "устройство стропильной системы", "замена кровельного покрытия", "монтаж мягкой кровли"], category: "roofing", object: "roof_system", operation: "installation", method: "roof_system_install", materialSystem: "roofing_system", complexity: "complex", requiredMaterials: ["мауэрлат", "стропила", "коньковый прогон", "гидроизоляционная мембрана", "кровельное покрытие"], requiredLabor: ["монтаж стропильной системы", "монтаж обрешетки", "монтаж кровли", "установка доборных элементов"], requiredEquipmentOrWarnings: ["леса / страховка", "подъемник warning"], requiredLogisticsOrWarnings: ["доставка леса и кровли", "подъем материалов"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["roof_covering_sq_m", "ridge_linear_m"] }),
  e({ domain: "facade", terms: ["фасад", "сайдинг", "вентилируемый фасад", "облицовка фасада"], casePhrases: ["монтаж вентилируемого фасада", "отделка фасада сайдингом", "штукатурный фасад", "облицовка фасада плитами", "ремонт фасада"], category: "facade", object: "facade_system", operation: "installation", method: "facade_cladding_system", materialSystem: "facade_system", complexity: "complex", requiredMaterials: ["фасадная подсистема", "утеплитель warning", "облицовка фасада", "крепеж фасада"], requiredLabor: ["разметка фасада", "монтаж подсистемы", "монтаж облицовки", "герметизация примыканий"], requiredEquipmentOrWarnings: ["леса / автовышка", "страховка"], requiredLogisticsOrWarnings: ["доставка фасадных материалов", "подъем на фасад"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["facade_sq_m", "anchors_pcs"] }),
  e({ domain: "entrance_group", terms: ["входная группа", "входной группы", "входной узел", "группа входа", "entrance group", "entry group"], casePhrases: ["отделка входной группы", "ремонт входной группы", "монтаж входной группы", "входная группа с дверями", "облицовка входного узла"], category: "facade", object: "entrance_group", operation: "finishing", method: "entrance_group_facade_door_finish", materialSystem: "entrance_group_system", complexity: "complex", requiredMaterials: ["облицовка входной группы", "грунтовка и подготовка основания", "дверные / витражные блоки warning", "козырек или примыкание warning", "герметики и профильные примыкания", "анкерный крепеж входной группы"], requiredLabor: ["обмер входной группы", "подготовка основания и проемов", "монтаж облицовки входной группы", "монтаж / регулировка дверных блоков warning", "герметизация примыканий", "финишная приемка входного узла"], requiredEquipmentOrWarnings: ["перфоратор и лазерный уровень", "подмости / автовышка warning", "стеклоподъем или такелаж warning"], requiredLogisticsOrWarnings: ["доставка облицовки и дверных блоков", "защита проходной зоны и временное ограждение", "вывоз демонтажных отходов warning"], exclusions: sharedExclusions, clarifyingQuestions: ["Это отделка существующей входной группы или новый входной узел с дверями/витражом?", "Нужны ли козырек, тепловая завеса, СКУД или только отделка и двери?", ...sharedQuestions], unitRules: ["entrance_group_sq_m", "door_pcs", "facade_sq_m"] }),
  e({ domain: "insulation", terms: ["утеплен", "теплоизоляц", "минвата", "пеноплекс"], casePhrases: ["утепление фасада минватой", "теплоизоляция кровли", "утепление стен пеноплексом", "утепление пола", "монтаж теплоизоляции труб"], category: "insulation", object: "insulation_system", operation: "installation", method: "thermal_insulation_install", materialSystem: "insulation_system", complexity: "medium", requiredMaterials: ["утеплитель", "клей / крепеж утеплителя", "ветрозащитная мембрана", "армирующая сетка warning"], requiredLabor: ["подготовка основания", "монтаж утеплителя", "крепление тарельчатыми дюбелями", "контроль мостиков холода"], requiredEquipmentOrWarnings: ["нож для утеплителя", "леса warning"], requiredLogisticsOrWarnings: ["доставка утеплителя", "хранение сухим способом"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["insulation_sq_m", "anchors_pcs"] }),
  e({ domain: "masonry", terms: ["кирпич", "кирпичная кладка", "кладка кирпича", "кладка стены", "кладка газоблока", "кладка пеноблока", "газоблок", "пеноблок"], casePhrases: ["кладка кирпича", "кладка стены из газоблока", "кирпичная перегородка", "кладка пеноблока", "облицовочная кладка"], category: "masonry", object: "masonry_wall", operation: "masonry", method: "brick_or_block_masonry", materialSystem: "masonry_system", complexity: "medium", requiredMaterials: ["кирпич / блок", "кладочный раствор", "кладочная сетка", "перемычки warning"], requiredLabor: ["разметка кладки", "кладка рядов", "армирование кладки", "расшивка / контроль плоскости"], requiredEquipmentOrWarnings: ["подмости", "миксер"], requiredLogisticsOrWarnings: ["доставка кирпича", "подъем блоков"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["masonry_sq_m", "mortar_m3"] }),
  e({ domain: "foundation_rebar", terms: ["армирование фундамента", "армирование для фундамента", "арматура фундамента", "арматурный каркас фундамента", "армирование каркаса", "арматурный каркас"], casePhrases: ["армирование фундамента", "монтаж арматурного каркаса фундамента", "вязка арматуры фундамента", "арматура для ленты фундамента", "армирование ростверка", "монтаж арматурного каркаса", "вязка арматурного каркаса"], category: "concrete", object: "foundation_rebar", operation: "rebar_installation", method: "foundation_rebar_cage_tying", materialSystem: "foundation_rebar_system", complexity: "medium", requiredMaterials: ["продольная арматура", "хомуты / поперечная арматура", "вязальная проволока", "фиксаторы защитного слоя"], requiredLabor: ["разметка каркаса", "резка и гибка арматуры", "вязка арматурного каркаса", "установка фиксаторов"], requiredEquipmentOrWarnings: ["арматурогиб / резак", "шаблон шага хомутов", "контроль защитного слоя"], requiredLogisticsOrWarnings: ["доставка арматуры", "подъем и складирование стержней"], exclusions: sharedExclusions, clarifyingQuestions: ["Укажите схему армирования и диаметр арматуры.", "Подтвердите размеры ленты/ростверка и шаг хомутов.", ...sharedQuestions], unitRules: ["foundation_rebar_kg", "tie_wire_kg", "spacers_pcs"] }),
  e({ domain: "concrete", terms: ["бетон", "заливк", "плита", "тумб", "колонн"], casePhrases: ["заливка бетонной плиты", "бетонные тумбы", "устройство бетонных колонн", "заливка стяжки", "бетонная подготовка"], category: "concrete", object: "concrete_element", operation: "concrete_pour", method: "concrete_rebar_formwork", materialSystem: "concrete_rebar_formwork", complexity: "medium", requiredMaterials: ["бетон", "арматура", "опалубка", "фиксаторы защитного слоя"], requiredLabor: ["разметка осей", "вязка арматуры", "монтаж опалубки", "заливка бетона"], requiredEquipmentOrWarnings: ["вибратор", "бетононасос warning"], requiredLogisticsOrWarnings: ["доставка материалов", "резерв материалов"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["concrete_m3", "rebar_kg", "formwork_sq_m"] }),
  e({ domain: "foundation", terms: ["фундамент", "ленточный", "свай", "ростверк"], casePhrases: ["ленточный фундамент", "свайный фундамент", "плита фундамента", "ростверк", "усиление фундамента"], category: "foundation", object: "foundation_system", operation: "installation", method: "foundation_concrete_system", materialSystem: "foundation_system", complexity: "complex", requiredMaterials: ["бетон фундамента", "арматурный каркас", "опалубка", "гидроизоляция фундамента"], requiredLabor: ["разметка осей", "земляные работы", "вязка арматуры", "заливка фундамента"], requiredEquipmentOrWarnings: ["экскаватор warning", "бетононасос"], requiredLogisticsOrWarnings: ["доставка материалов на участок", "вывоз грунта"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["foundation_m3", "linear_m"] }),
  e({ domain: "earthworks", terms: ["котлован", "транше", "грунт", "планировка участка"], casePhrases: ["разработка котлована", "рытье траншеи", "планировка участка", "обратная засыпка", "выемка грунта"], category: "foundation", object: "earthwork_scope", operation: "preparation", method: "earthmoving", materialSystem: "earthworks", complexity: "medium", requiredMaterials: ["песок warning", "щебень warning", "геотекстиль warning"], requiredLabor: ["разбивка площадки", "выемка грунта", "планировка основания", "обратная засыпка"], requiredEquipmentOrWarnings: ["экскаватор", "самосвал", "виброплита"], requiredLogisticsOrWarnings: ["вывоз грунта", "доставка инертных материалов"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["earthworks_m3", "haulage_trip"] }),
  e({ domain: "asphalt_roadworks", terms: ["асфальт", "дорог", "проезд", "парковк"], casePhrases: ["асфальтирование площадки", "ремонт дороги", "устройство парковки", "ямочный ремонт асфальта", "подготовка основания под асфальт"], category: "roadworks", object: "asphalt_area", operation: "paving", method: "asphalt_hot_mix", materialSystem: "asphalt_road_base", complexity: "infrastructure", requiredMaterials: ["асфальтобетон", "щебеночное основание", "битумная эмульсия", "песок"], requiredLabor: ["планировка основания", "укладка асфальта", "уплотнение катком", "контроль уклонов"], requiredEquipmentOrWarnings: ["дорожная техника", "асфальтоукладчик", "каток", "виброплита"], requiredLogisticsOrWarnings: ["доставка асфальта", "вывоз старого покрытия"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["asphalt_sq_m", "asphalt_ton"] }),
  e({ domain: "paving_landscaping", terms: ["брусчат", "тротуарн", "мощен", "поребрик"], casePhrases: ["укладка брусчатки", "мощение тротуарной плиткой", "установка поребрика", "устройство садовой дорожки", "площадка из брусчатки"], category: "landscaping", object: "paving_stone", operation: "laying", method: "paving_stone_base_layers", materialSystem: "paving_system", complexity: "infrastructure", requiredMaterials: ["брусчатка / тротуарная плитка", "геотекстиль", "щебень", "пескоцементная смесь"], requiredLabor: ["разметка", "планировка основания", "укладка брусчатки", "заполнение швов"], requiredEquipmentOrWarnings: ["виброплита", "резчик плитки"], requiredLogisticsOrWarnings: ["доставка брусчатки", "вывоз грунта"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["paving_sq_m", "curb_linear_m"] }),
  e({ domain: "metal_structures", terms: ["металлоконструк", "металлическ", "ферм", "балк"], casePhrases: ["монтаж металлоконструкций", "изготовление и монтаж ферм", "монтаж металлических балок", "сварной каркас", "усиление металлом"], category: "metalworks", object: "steel_structure", operation: "installation", method: "welded_or_bolted_steel", materialSystem: "steel_structure_system", complexity: "complex", requiredMaterials: ["сталь / металлопрокат", "болты / анкера", "сварочные материалы", "антикоррозионная грунтовка"], requiredLabor: ["обмер / схема", "сварка / сборка", "монтаж металлоконструкций", "окраска металла"], requiredEquipmentOrWarnings: ["кран / автовышка", "сварочный аппарат"], requiredLogisticsOrWarnings: ["доставка металла", "разгрузка краном"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["steel_kg", "anchors_pcs"] }),
  e({ domain: "canopies", terms: ["навес", "козырек"], casePhrases: ["металлический навес", "навес из профнастила", "козырек над входом", "навес для парковки", "сварной навес"], category: "metalworks", object: "metal_canopy", operation: "installation", method: "welded_metal_frame", materialSystem: "metal_canopy_system", complexity: "complex", requiredMaterials: ["стойки металлические", "фермы / балки", "прогоны", "кровельное покрытие"], requiredLabor: ["монтаж стоек", "монтаж ферм / балок", "монтаж прогонов", "монтаж кровельного покрытия"], requiredEquipmentOrWarnings: ["кран / автовышка", "сварочное оборудование"], requiredLogisticsOrWarnings: ["доставка металла", "доставка кровельного покрытия"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["steel_kg", "roof_sq_m", "equipment_shift"] }),
  e({ domain: "fencing", terms: ["забор", "огражден", "ворот", "калитк"], casePhrases: ["установка забора из профнастила", "монтаж сетчатого ограждения", "забор на металлических столбах", "установка ворот", "ограждение участка"], category: "landscaping", object: "fence_system", operation: "installation", method: "fence_post_panel_system", materialSystem: "fencing_system", complexity: "medium", requiredMaterials: ["столбы забора", "панели / профнастил", "бетон для столбов", "крепеж секций забора"], requiredLabor: ["разметка линии забора", "бурение лунок", "установка столбов", "монтаж секций"], requiredEquipmentOrWarnings: ["бур / мотобур", "сварка warning"], requiredLogisticsOrWarnings: ["доставка секций", "вывоз грунта"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["fence_linear_m", "posts_pcs"] }),
  e({ domain: "demolition", terms: ["демонтаж", "снос", "разборк"], casePhrases: ["демонтаж перегородок", "снос старой стяжки", "демонтаж плитки", "разборка кровли", "снос несущей стены warning"], category: "demolition", object: "demolition_scope", operation: "demolition", method: "controlled_demolition", materialSystem: "demolition_waste", complexity: "medium", requiredMaterials: ["мешки / контейнеры", "укрывные материалы", "расходники демонтажа"], requiredLabor: ["обследование зоны", "отключение коммуникаций warning", "демонтаж конструкций", "сортировка отходов"], requiredEquipmentOrWarnings: ["перфоратор", "контейнер", "пылезащита"], requiredLogisticsOrWarnings: ["вывоз мусора", "утилизация отходов"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["demolition_sq_m", "waste_trip"] }),
  e({ domain: "plumbing", terms: ["сантех", "водопровод", "канализац", "труб"], casePhrases: ["монтаж сантехники", "разводка водопровода", "замена труб", "монтаж канализации", "установка коллекторного узла"], category: "plumbing", object: "plumbing_system", operation: "installation", method: "plumbing_pipework", materialSystem: "plumbing_system", complexity: "complex", requiredMaterials: ["трубы", "фитинги", "запорная арматура", "крепеж труб"], requiredLabor: ["разметка трасс", "монтаж труб", "опрессовка", "подключение приборов"], requiredEquipmentOrWarnings: ["пресс-инструмент", "испытательный насос"], requiredLogisticsOrWarnings: ["доставка труб", "доступ к стоякам warning"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["pipe_linear_m", "fixtures_pcs"] }),
  e({ domain: "heating", terms: ["отоплен", "радиатор", "теплый пол", "котельная"], casePhrases: ["монтаж отопления", "установка радиаторов", "теплый водяной пол", "замена труб отопления", "монтаж котельной обвязки"], category: "heating_hvac", object: "heating_system", operation: "installation", method: "heating_pipework", materialSystem: "heating_system", complexity: "complex", requiredMaterials: ["трубы отопления", "радиаторы / контуры", "коллектор", "теплоизоляция труб"], requiredLabor: ["гидравлическая схема", "монтаж труб", "установка радиаторов", "опрессовка отопления"], requiredEquipmentOrWarnings: ["опрессовочный насос", "тепловизор warning"], requiredLogisticsOrWarnings: ["доставка радиаторов", "слив системы warning"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["heating_points_pcs", "pipe_linear_m"] }),
  e({ domain: "ventilation", terms: ["вентиляц", "воздуховод", "вытяжк", "приточ"], casePhrases: ["монтаж вентиляции кафе", "установка воздуховодов", "приточно-вытяжная вентиляция", "вытяжка кухни", "балансировка вентиляции"], category: "heating_hvac", object: "ventilation_network", operation: "installation", method: "area_based_ventilation_preliminary", materialSystem: "ventilation_system", complexity: "complex", requiredMaterials: ["воздуховоды", "фасонные элементы", "решетки и диффузоры", "вентиляционная установка"], requiredLabor: ["разметка трасс", "монтаж воздуховодов", "монтаж решеток", "пусконаладка"], requiredEquipmentOrWarnings: ["подъемник", "измерительный прибор"], requiredLogisticsOrWarnings: ["доставка воздуховодов", "подъем материалов"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["duct_linear_m", "terminals_pcs"] }),
  e({ domain: "air_conditioning", terms: ["кондиционер", "сплит", "чиллер", "фанкойл"], casePhrases: ["монтаж кондиционеров", "установка сплит-систем", "монтаж чиллера", "фанкойлы в офисе", "трассы кондиционирования"], category: "heating_hvac", object: "air_conditioning_system", operation: "installation", method: "hvac_cooling_install", materialSystem: "air_conditioning_system", complexity: "complex", requiredMaterials: ["внутренний и наружный блок", "медная трасса", "дренаж кондиционера", "кронштейны"], requiredLabor: ["разметка трассы", "бурение отверстия", "монтаж блоков", "вакуумирование и запуск"], requiredEquipmentOrWarnings: ["вакуумный насос", "альпинисты warning"], requiredLogisticsOrWarnings: ["доставка блоков", "подъем наружных блоков"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["ac_units_pcs", "copper_linear_m"] }),
  e({ domain: "electrical", terms: ["электромонтаж", "электрик", "кабель", "щит"], casePhrases: ["электромонтаж квартиры", "разводка кабеля", "монтаж электрощита", "электрика дома", "установка розеток"], category: "electrical", object: "electrical_network", operation: "installation", method: "area_points_preliminary", materialSystem: "electrical_installation", complexity: "complex", requiredMaterials: ["кабельные линии", "щит и автоматика", "розеточные точки", "гофра и короб"], requiredLabor: ["разметка электрических трасс", "прокладка кабеля", "монтаж щита", "испытания электросети"], requiredEquipmentOrWarnings: ["штроборез", "тестер"], requiredLogisticsOrWarnings: ["доставка кабеля", "вывоз мусора"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["cable_linear_m", "points_pcs"] }),
  e({ domain: "low_voltage", terms: ["слаботоч", "интернет", "скс", "домофон"], casePhrases: ["монтаж СКС", "слаботочные сети офиса", "прокладка интернет кабеля", "домофонная система", "структурированная кабельная сеть"], category: "electrical", object: "low_voltage_system", operation: "installation", method: "low_voltage_cabling", materialSystem: "low_voltage_system", complexity: "medium", requiredMaterials: ["UTP кабель", "патч-панель", "розетки RJ45", "кабель-канал"], requiredLabor: ["разметка слаботочных трасс", "прокладка кабеля", "оконцевание линий", "тестирование сети"], requiredEquipmentOrWarnings: ["кабельный тестер", "обжимной инструмент"], requiredLogisticsOrWarnings: ["доставка кабеля", "маркировка линий"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["cable_linear_m", "ports_pcs"] }),
  e({ domain: "fire_alarm", terms: ["пожарн", "апс", "соуэ", "дымовой датчик"], casePhrases: ["монтаж пожарной сигнализации", "АПС в офисе", "система оповещения СОУЭ", "установка дымовых датчиков", "пожарная автоматика"], category: "electrical", object: "fire_alarm_system", operation: "installation", method: "regulated_fire_alarm_install", materialSystem: "fire_alarm_system", complexity: "complex", requiredMaterials: ["пожарные датчики", "прибор АПС", "кабель огнестойкий", "оповещатели"], requiredLabor: ["проектная привязка warning", "прокладка кабеля", "монтаж датчиков", "ПНР пожарной сигнализации"], requiredEquipmentOrWarnings: ["тестер линий", "лицензированный подрядчик"], requiredLogisticsOrWarnings: ["доставка оборудования", "исполнительная документация"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["detectors_pcs", "cable_linear_m"], regulatedSafetyRequired: true }),
  e({ domain: "security_systems", terms: ["охран", "видеонаблюд", "скуд", "сигнализац"], casePhrases: ["монтаж видеонаблюдения", "охранная сигнализация", "СКУД офиса", "установка камер", "контроль доступа"], category: "electrical", object: "security_system", operation: "installation", method: "security_system_install", materialSystem: "security_low_voltage_system", complexity: "medium", requiredMaterials: ["камеры / датчики", "регистратор / контроллер", "кабель", "блок питания"], requiredLabor: ["разметка точек", "прокладка линий", "монтаж устройств", "настройка системы"], requiredEquipmentOrWarnings: ["тестер", "лестницы / подъемник"], requiredLogisticsOrWarnings: ["доставка оборудования", "маркировка кабелей"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["devices_pcs", "cable_linear_m"] }),
  e({ domain: "solar", terms: ["солнеч", "фотоэлектр", "инвертор", "панел"], casePhrases: ["установка солнечных панелей", "солнечная станция 30 кВт", "монтаж инвертора", "фотоэлектрические панели", "СЭС на крыше"], category: "electrical", object: "solar_power_system", operation: "installation", method: "solar_pv_install", materialSystem: "solar_pv_system", complexity: "infrastructure", requiredMaterials: ["солнечные панели", "инвертор", "крепежная система", "DC/AC кабели"], requiredLabor: ["обследование крыши", "монтаж креплений", "монтаж панелей", "подключение инвертора"], requiredEquipmentOrWarnings: ["страховка на крыше", "электроизмерения"], requiredLogisticsOrWarnings: ["доставка панелей", "подъем на кровлю"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["solar_kw", "panels_pcs"] }),
  e({ domain: "hydropower", terms: ["гэс", "гидро", "турбин"], casePhrases: ["установка турбины ГЭС", "гидроагрегат", "мини ГЭС", "монтаж гидротурбины", "оборудование ГЭС"], category: "concrete", object: "hydropower_turbine", operation: "installation", method: "hydro_turbine_equipment_install", materialSystem: "hydro_turbine_system", complexity: "infrastructure", requiredMaterials: ["турбина ГЭС", "генератор", "шкаф управления", "запорная арматура"], requiredLabor: ["обследование машинного зала", "монтаж турбины", "ПНР гидроагрегата", "испытания"], requiredEquipmentOrWarnings: ["кран", "такелаж", "инспекция"], requiredLogisticsOrWarnings: ["доставка оборудования ГЭС", "такелажный план"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["power_kw", "equipment_set"], regulatedSafetyRequired: true }),
  e({ domain: "industrial_equipment", terms: ["промышленное оборудование", "станок", "линия", "насосная станция"], casePhrases: ["монтаж промышленного оборудования", "установка станка", "монтаж производственной линии", "насосная станция", "такелаж оборудования"], category: "delivery_equipment", object: "industrial_equipment", operation: "installation", method: "industrial_equipment_install", materialSystem: "industrial_equipment_system", complexity: "infrastructure", requiredMaterials: ["оборудование", "анкера", "кабельные подключения", "трубная обвязка warning"], requiredLabor: ["обследование основания", "такелаж", "выверка оборудования", "ПНР"], requiredEquipmentOrWarnings: ["кран / погрузчик", "такелажная оснастка"], requiredLogisticsOrWarnings: ["доставка оборудования", "разгрузка и хранение"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["equipment_set", "anchors_pcs"] }),
  e({ domain: "well_drilling", terms: ["скважин", "бурен", "водозабор"], casePhrases: ["бурение скважины", "скважина на воду", "обсадная труба", "водозаборная скважина", "промывка скважины"], category: "roadworks", object: "water_well", operation: "drilling", method: "well_drilling", materialSystem: "well_system", complexity: "infrastructure", requiredMaterials: ["обсадная труба", "фильтр", "гравийная обсыпка", "оголовок"], requiredLabor: ["разметка точки бурения", "бурение скважины", "обсадка", "прокачка и промывка"], requiredEquipmentOrWarnings: ["буровая установка", "насос для прокачки"], requiredLogisticsOrWarnings: ["мобилизация буровой", "доставка труб"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["drilling_linear_m", "casing_linear_m"] }),
  e({ domain: "sewerage", terms: ["канализац", "септик", "колодец", "ливневк"], casePhrases: ["наружная канализация", "монтаж септика", "канализационные колодцы", "ливневая канализация", "прокладка канализационной трубы"], category: "plumbing", object: "sewerage_system", operation: "installation", method: "sewer_pipework", materialSystem: "sewerage_system", complexity: "complex", requiredMaterials: ["канализационная труба", "колодцы", "песчаная подготовка", "фитинги"], requiredLabor: ["разметка трассы", "разработка траншеи", "укладка трубы", "проверка уклонов"], requiredEquipmentOrWarnings: ["экскаватор", "виброплита"], requiredLogisticsOrWarnings: ["доставка труб", "вывоз грунта"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["pipe_linear_m", "wells_pcs"] }),
  e({ domain: "drainage", terms: ["дренаж", "дренажные каналы", "лотк", "водоотвод"], casePhrases: ["дренажные каналы", "линейный водоотвод", "дренаж участка", "установка лотков", "водоотвод с решетками"], category: "roadworks", object: "drainage_channel", operation: "installation", method: "length_based_drainage_channel", materialSystem: "drainage_channel_system", complexity: "medium", requiredMaterials: ["дренажные лотки / каналы", "решетки", "геотекстиль", "щебеночное основание"], requiredLabor: ["разметка трассы", "выемка грунта", "стыковка лотков", "проверка проливом"], requiredEquipmentOrWarnings: ["мини-экскаватор", "виброплита"], requiredLogisticsOrWarnings: ["вывоз грунта", "доставка материалов"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["drainage_linear_m", "grates_linear_m"] }),
  e({ domain: "commercial_fit_out", terms: ["офис", "кафе", "магазин", "коммерческ"], casePhrases: ["ремонт офиса", "fit-out кафе", "отделка магазина", "коммерческая отделка", "ремонт салона"], category: "other", object: "commercial_fit_out", operation: "renovation", method: "commercial_fit_out", materialSystem: "fit_out_system", complexity: "complex", requiredMaterials: ["черновые материалы", "финишные покрытия", "инженерные комплектующие", "двери / перегородки warning"], requiredLabor: ["обмер и ведомость", "черновые работы", "чистовая отделка", "инженерная координация"], requiredEquipmentOrWarnings: ["малая механизация", "пылеудаление"], requiredLogisticsOrWarnings: ["доставка по этапам", "вывоз строительного мусора"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["fitout_sq_m", "systems_set"] }),
  e({ domain: "apartment_renovation", terms: ["квартира", "капремонт", "ремонт квартиры"], casePhrases: ["капитальный ремонт квартиры", "ремонт квартиры под ключ", "черновой ремонт квартиры", "косметический ремонт квартиры", "ремонт студии"], category: "other", object: "apartment_renovation", operation: "renovation", method: "apartment_renovation", materialSystem: "renovation_system", complexity: "complex", requiredMaterials: ["черновые смеси", "финишные покрытия", "электрика и сантехника warning", "расходники"], requiredLabor: ["обмер квартиры", "демонтаж warning", "черновая отделка", "чистовая отделка"], requiredEquipmentOrWarnings: ["перфоратор", "пылезащита"], requiredLogisticsOrWarnings: ["доставка материалов", "вывоз мусора"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["renovation_sq_m", "rooms_pcs"] }),
  e({ domain: "house_renovation", terms: ["дом", "коттедж", "ремонт дома"], casePhrases: ["ремонт частного дома", "реконструкция дома", "отделка коттеджа", "ремонт фасада и кровли дома", "инженерия дома"], category: "other", object: "house_renovation", operation: "renovation", method: "house_renovation", materialSystem: "house_renovation_system", complexity: "complex", requiredMaterials: ["строительные материалы дома", "инженерные комплектующие", "утеплитель warning", "финишные покрытия"], requiredLabor: ["обследование дома", "черновые работы", "инженерные работы", "чистовая отделка"], requiredEquipmentOrWarnings: ["леса warning", "малая механизация"], requiredLogisticsOrWarnings: ["доставка на участок", "контейнер для отходов"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["house_sq_m", "systems_set"] }),
  e({ domain: "bathroom_renovation", terms: ["ванн", "сануз", "душев"], casePhrases: ["ремонт ванной", "ремонт санузла", "душевая под ключ", "замена плитки в ванной", "гидроизоляция санузла"], category: "tile", object: "bathroom_renovation", operation: "renovation", method: "wet_room_renovation", materialSystem: "bathroom_system", complexity: "complex", requiredMaterials: ["гидроизоляция", "плитка", "сантехника", "клей и затирка"], requiredLabor: ["демонтаж warning", "гидроизоляция санузла", "укладка плитки", "монтаж сантехники"], requiredEquipmentOrWarnings: ["плиткорез", "испытание водоснабжения"], requiredLogisticsOrWarnings: ["доставка плитки", "вынос мусора"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["bathroom_sq_m", "fixtures_pcs"] }),
  e({ domain: "kitchen_renovation", terms: ["кухн", "кухонный", "фартук"], casePhrases: ["ремонт кухни", "кухонный фартук", "монтаж кухни и плитки", "замена коммуникаций кухни", "отделка кухни"], category: "tile", object: "kitchen_renovation", operation: "renovation", method: "kitchen_renovation", materialSystem: "kitchen_system", complexity: "complex", requiredMaterials: ["плитка фартука", "электрика кухни warning", "сантехнические подключения", "финишные покрытия"], requiredLabor: ["подготовка стен", "укладка фартука", "подключение коммуникаций", "чистовая отделка"], requiredEquipmentOrWarnings: ["плиткорез", "тестер"], requiredLogisticsOrWarnings: ["доставка материалов", "защита мебели warning"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["kitchen_sq_m", "backsplash_sq_m"] }),
  e({ domain: "staircases", terms: ["лестниц", "ступен", "перила"], casePhrases: ["монтаж лестницы", "бетонная лестница", "металлическая лестница", "облицовка ступеней", "установка перил"], category: "carpentry", object: "staircase", operation: "installation", method: "staircase_install", materialSystem: "staircase_system", complexity: "complex", requiredMaterials: ["ступени", "косоур / каркас", "перила", "крепеж лестницы"], requiredLabor: ["обмер проема", "монтаж каркаса", "монтаж ступеней", "установка перил"], requiredEquipmentOrWarnings: ["подъем и фиксация", "сварка warning"], requiredLogisticsOrWarnings: ["доставка лестницы", "подъем элементов"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["stairs_pcs", "railing_linear_m"] }),
  e({ domain: "retaining_walls", terms: ["подпорн", "габион", "стена удержания"], casePhrases: ["подпорная стена", "габионная подпорная стенка", "бетонная подпорная стена", "дренаж подпорной стены", "усиление откоса"], category: "roadworks", object: "retaining_wall", operation: "installation", method: "retaining_wall_system", materialSystem: "retaining_wall_system", complexity: "infrastructure", requiredMaterials: ["бетон / габионы", "арматура", "дренаж за стеной", "щебень"], requiredLabor: ["разметка стены", "земляные работы", "монтаж стены", "устройство дренажа"], requiredEquipmentOrWarnings: ["экскаватор", "бетононасос warning"], requiredLogisticsOrWarnings: ["доставка инертных", "вывоз грунта"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["wall_linear_m", "concrete_m3"] }),
  e({ domain: "site_preparation", terms: ["подготовка площадки", "расчистка", "планировка территории"], casePhrases: ["подготовка строительной площадки", "расчистка участка", "планировка территории", "снятие плодородного слоя", "временный подъезд"], category: "roadworks", object: "site_preparation", operation: "preparation", method: "site_preparation", materialSystem: "site_preparation_system", complexity: "medium", requiredMaterials: ["геотекстиль warning", "щебень warning", "временное ограждение", "расходники разметки"], requiredLabor: ["обследование участка", "расчистка", "планировка", "организация подъезда"], requiredEquipmentOrWarnings: ["экскаватор / погрузчик", "самосвал"], requiredLogisticsOrWarnings: ["вывоз мусора", "доставка инертных"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["site_sq_m", "haulage_trip"] }),
  e({ domain: "landscaping", terms: ["газон", "озеленен", "ландшафт", "посадк"], casePhrases: ["устройство газона", "озеленение участка", "посадка деревьев", "ландшафтные работы", "планировка грунта под газон"], category: "landscaping", object: "landscaping_scope", operation: "installation", method: "landscaping_install", materialSystem: "landscaping_system", complexity: "medium", requiredMaterials: ["растительный грунт", "семена / рулонный газон", "удобрения", "посадочный материал"], requiredLabor: ["планировка грунта", "посев / укладка газона", "посадка растений", "первичный полив"], requiredEquipmentOrWarnings: ["культиватор", "каток для газона"], requiredLogisticsOrWarnings: ["доставка грунта", "вывоз лишнего грунта"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["landscaping_sq_m", "plants_pcs"] }),
  e({ domain: "irrigation", terms: ["полив", "орошен", "ирригац", "автополив"], casePhrases: ["монтаж автополива", "система орошения газона", "капельный полив", "полив участка", "разводка спринклеров"], category: "landscaping", object: "irrigation_system", operation: "installation", method: "irrigation_pipework", materialSystem: "irrigation_system", complexity: "medium", requiredMaterials: ["трубы полива", "спринклеры / капельная линия", "клапаны", "контроллер полива"], requiredLabor: ["схема зон полива", "траншеи под трубы", "монтаж труб", "настройка контроллера"], requiredEquipmentOrWarnings: ["тестер давления", "мини-траншеекопатель warning"], requiredLogisticsOrWarnings: ["доставка труб", "обратная засыпка"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["irrigation_zones_pcs", "pipe_linear_m"] }),
  e({ domain: "water_supply", terms: ["водоснабжен", "водомер", "насос", "скважинный насос"], casePhrases: ["монтаж водоснабжения", "ввод воды в дом", "установка насоса", "водомерный узел", "разводка холодной воды"], category: "plumbing", object: "water_supply_system", operation: "installation", method: "water_supply_pipework", materialSystem: "water_supply_system", complexity: "complex", requiredMaterials: ["водопроводные трубы", "насос / узел учета", "фитинги", "запорная арматура"], requiredLabor: ["разметка трассы", "монтаж труб", "установка насоса", "опрессовка"], requiredEquipmentOrWarnings: ["пресс-инструмент", "насос для испытаний"], requiredLogisticsOrWarnings: ["доставка труб", "доступ к вводу"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["water_pipe_linear_m", "nodes_pcs"] }),
  e({ domain: "gas_regulated", terms: ["газ", "газопровод", "газовый"], casePhrases: ["монтаж газопровода", "перенос газовой трубы", "газовое оборудование", "подключение газовой плиты", "наружный газопровод"], category: "heating_hvac", object: "gas_system", operation: "installation", method: "regulated_gas_system", materialSystem: "gas_system", complexity: "complex", requiredMaterials: ["газовая труба", "запорная арматура", "крепления", "сигнализатор газа warning"], requiredLabor: ["обследование газовой сети", "монтаж газопровода", "испытание герметичности", "сдача газовой службе"], requiredEquipmentOrWarnings: ["лицензированный подрядчик", "газоанализатор"], requiredLogisticsOrWarnings: ["доставка труб", "исполнительная документация"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["gas_pipe_linear_m", "valves_pcs"], regulatedSafetyRequired: true }),
  e({ domain: "boilers_regulated", terms: ["котел", "котельн", "бойлер", "теплогенератор"], casePhrases: ["монтаж котла", "котельная частного дома", "установка бойлера", "обвязка котла", "замена теплогенератора"], category: "heating_hvac", object: "boiler_system", operation: "installation", method: "regulated_boiler_install", materialSystem: "boiler_system", complexity: "complex", requiredMaterials: ["котел / бойлер", "дымоход warning", "насосная группа", "запорная арматура"], requiredLabor: ["обследование котельной", "монтаж котла", "обвязка котла", "ПНР котельной"], requiredEquipmentOrWarnings: ["газоанализатор warning", "лицензированный подрядчик"], requiredLogisticsOrWarnings: ["доставка котла", "согласования warning"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["boiler_set", "pipe_linear_m"], regulatedSafetyRequired: true }),
  e({ domain: "elevators_regulated", terms: ["лифт", "подъемник пассажир"], casePhrases: ["установка лифта пассажирского", "пассажирский лифт", "замена лифтового оборудования", "лифт на этажи", "монтаж лифтовой шахты warning"], category: "delivery_equipment", object: "passenger_elevator", operation: "installation", method: "licensed_elevator_installation", materialSystem: "passenger_elevator_system", complexity: "complex", requiredMaterials: ["пассажирская кабина", "лебедка / привод", "двери шахты", "направляющие"], requiredLabor: ["обследование шахты", "монтаж направляющих", "ПНР", "инспекция / сдача"], requiredEquipmentOrWarnings: ["только лицензированная организация", "такелаж"], requiredLogisticsOrWarnings: ["доставка лифтового оборудования", "подъем оборудования"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["elevator_set", "stops_pcs"], regulatedSafetyRequired: true }),
  e({ domain: "cranes_regulated", terms: ["кран", "кран-балк", "тельфер", "грузоподъем"], casePhrases: ["монтаж промышленного крана", "установка кран-балки", "монтаж тельфера", "грузоподъемное оборудование", "рельсовый путь крана"], category: "metalworks", object: "industrial_crane", operation: "installation", method: "regulated_crane_install", materialSystem: "industrial_crane_system", complexity: "infrastructure", requiredMaterials: ["крановое оборудование", "рельсовый путь", "анкера", "электропитание крана"], requiredLabor: ["обследование пролетов", "монтаж рельсов", "монтаж крана", "испытания грузоподъемности"], requiredEquipmentOrWarnings: ["кран для монтажа", "лицензированный подрядчик"], requiredLogisticsOrWarnings: ["доставка оборудования", "такелажный план"], exclusions: sharedExclusions, clarifyingQuestions: sharedQuestions, unitRules: ["crane_set", "rail_linear_m"], regulatedSafetyRequired: true }),
];

export type EstimatorResolvedDomainSignature = {
  workKey: string;
  titleRu: string;
  category: GlobalWorkCategory;
  domain: string;
  object: string;
  operation: string;
  method: string;
  materialSystem: string;
  complexity: EstimatorKernelComplexity;
  requiredMaterials: string[];
  requiredLabor: string[];
  requiredEquipmentOrWarnings: string[];
  requiredLogisticsOrWarnings: string[];
  exclusions: string[];
  clarifyingQuestions: string[];
};

type OpenEstimatorSignatureRule = {
  domain: string;
  titleRu: string;
  pattern: RegExp;
  category: GlobalWorkCategory;
  object: string;
  operation?: string;
  complexity?: EstimatorKernelComplexity;
  requiredMaterials?: string[];
  requiredLabor?: string[];
  requiredEquipmentOrWarnings?: string[];
};

function isContextOnlyEntranceGroupMatch(normalized: string, term: string): boolean {
  if (term !== "входная группа" && term !== "входной группы" && term !== "входной узел" && term !== "группа входа") return false;
  const indices: number[] = [];
  let cursor = normalized.indexOf(term);
  while (cursor >= 0) {
    indices.push(cursor);
    cursor = normalized.indexOf(term, cursor + term.length);
  }
  if (indices.length === 0) return false;
  return indices.every((index) => /(?:зона работ|рабочая зона|участок работ|локация)\s*$/.test(normalized.slice(Math.max(0, index - 40), index)));
}

const OPEN_ESTIMATOR_DEFAULTS: Record<GlobalWorkCategory, {
  materials: string[];
  labor: string[];
  equipment: string[];
}> = {
  flooring: {
    materials: ["напольное покрытие", "подложка / клей", "плинтус", "порожки"],
    labor: ["подготовка основания", "раскрой покрытия", "укладка покрытия", "монтаж примыканий"],
    equipment: ["ручной инструмент", "строительный пылесос"],
  },
  tile: {
    materials: ["плитка / облицовочный материал", "клей / раствор", "затирка", "профили / СВП"],
    labor: ["подготовка основания", "раскладка", "облицовка / укладка", "затирка и очистка"],
    equipment: ["плиткорез", "миксер для клея"],
  },
  wall_finishing: {
    materials: ["грунтовка", "ремонтная смесь", "шпаклевка / штукатурка", "финишное покрытие warning"],
    labor: ["подготовка поверхности", "ремонт дефектов", "нанесение слоя", "контроль качества"],
    equipment: ["правило / уровень", "малярный инструмент"],
  },
  ceiling: {
    materials: ["потолочная система", "профиль / подвесы", "панели / покрытие", "крепеж потолочной системы"],
    labor: ["разметка уровня", "монтаж каркаса", "монтаж покрытия", "обход примыканий"],
    equipment: ["лазерный уровень", "подмости warning"],
  },
  drywall: {
    materials: ["листы / панели", "профиль", "саморезы и крепеж ГКЛ", "лента и шпаклевка"],
    labor: ["разметка каркаса", "монтаж каркаса", "обшивка", "заделка швов"],
    equipment: ["шуруповерт", "лазерный уровень"],
  },
  painting: {
    materials: ["грунтовка", "краска / покрытие", "малярная лента", "укрывная пленка"],
    labor: ["подготовка поверхности", "грунтование", "окраска", "контроль укрывистости"],
    equipment: ["валики и кисти", "краскопульт warning"],
  },
  plastering: {
    materials: ["штукатурная смесь", "маяки", "грунтовка", "уголки"],
    labor: ["грунтование", "установка маяков", "нанесение штукатурки", "затирка"],
    equipment: ["штукатурная станция warning", "правило и уровень"],
  },
  putty: {
    materials: ["шпаклевка", "грунтовка", "армирующая лента warning", "шлифовальные расходники"],
    labor: ["подготовка", "нанесение шпаклевки", "шлифовка", "контроль плоскости"],
    equipment: ["шлифмашина warning", "малярный инструмент"],
  },
  doors_windows: {
    materials: ["блок / изделие", "анкера и монтажный крепеж блока", "пена / герметик", "фурнитура"],
    labor: ["обмер проемов", "подготовка проема", "монтаж блока", "герметизация"],
    equipment: ["перфоратор", "уровень"],
  },
  electrical: {
    materials: ["кабельные линии", "щит / контроллеры", "устройства", "гофра и крепеж"],
    labor: ["разметка трасс", "прокладка кабеля", "монтаж устройств", "ПНР / испытания"],
    equipment: ["тестер", "измерительный прибор"],
  },
  plumbing: {
    materials: ["трубопроводы / оборудование", "фитинги", "запорная арматура", "крепеж и расходники"],
    labor: ["разметка трассы", "монтаж оборудования", "подключение узлов", "испытание / ПНР"],
    equipment: ["пресс-инструмент", "испытательный насос warning"],
  },
  heating_hvac: {
    materials: ["инженерное оборудование", "трубопроводы / воздуховоды", "автоматика", "крепеж и расходники"],
    labor: ["обследование системы", "монтаж оборудования", "подключение коммуникаций", "ПНР и балансировка"],
    equipment: ["измерительный прибор", "подъемник warning"],
  },
  roofing: {
    materials: ["кровельное покрытие", "мембрана / пароизоляция", "доборные элементы", "крепеж кровли"],
    labor: ["обследование кровли", "подготовка основания", "монтаж кровельного узла", "герметизация примыканий"],
    equipment: ["леса / страховка warning", "кровельный инструмент"],
  },
  facade: {
    materials: ["фасадная подсистема", "утеплитель warning", "облицовка", "крепеж фасада"],
    labor: ["разметка фасада", "монтаж подсистемы", "монтаж облицовки", "герметизация"],
    equipment: ["леса / автовышка warning", "страховка"],
  },
  foundation: {
    materials: ["бетон / инертные материалы", "арматура", "опалубка", "гидроизоляция warning"],
    labor: ["разметка", "земляные работы", "армирование / опалубка", "бетонирование / приемка"],
    equipment: ["экскаватор warning", "вибратор"],
  },
  concrete: {
    materials: ["бетон", "арматура", "опалубка / закладные", "фиксаторы защитного слоя"],
    labor: ["разметка осей", "вязка арматуры", "монтаж опалубки", "заливка / ремонт бетона"],
    equipment: ["вибратор", "бетононасос warning"],
  },
  masonry: {
    materials: ["кирпич / блок", "кладочный раствор", "кладочная сетка", "перемычки warning"],
    labor: ["разметка кладки", "кладка рядов", "армирование кладки", "контроль плоскости"],
    equipment: ["подмости", "миксер"],
  },
  waterproofing: {
    materials: ["гидроизоляционный материал", "праймер", "герметик примыканий", "армирующая лента"],
    labor: ["подготовка основания", "нанесение праймера", "монтаж гидроизоляции", "герметизация примыканий"],
    equipment: ["ручной инструмент", "горелка warning"],
  },
  insulation: {
    materials: ["изоляционный материал", "каркас / крепеж", "мембрана / герметик warning", "облицовочные элементы"],
    labor: ["обследование основания", "монтаж подсистемы", "установка изоляции", "герметизация примыканий"],
    equipment: ["нож / шуруповерт", "измерительный прибор warning"],
  },
  demolition: {
    materials: ["мешки / контейнеры", "укрывные материалы", "расходники защиты", "крепеж временной защиты"],
    labor: ["обследование зоны", "отключение коммуникаций warning", "демонтаж", "сортировка и погрузка мусора"],
    equipment: ["перфоратор", "контейнер / транспорт"],
  },
  landscaping: {
    materials: ["геотекстиль", "инертные материалы", "покрытие / элементы благоустройства", "крепеж / расходники"],
    labor: ["разметка зоны", "подготовка основания", "монтаж / укладка элементов", "проверка уклонов"],
    equipment: ["виброплита warning", "ручной инструмент"],
  },
  roadworks: {
    materials: ["основание", "покрытие / лотки warning", "бордюр / элементы", "разметочные материалы warning"],
    labor: ["разметка участка", "подготовка основания", "монтаж / укладка", "контроль уклонов"],
    equipment: ["каток / виброплита", "дорожная техника warning"],
  },
  metalworks: {
    materials: ["металлопрокат", "крепеж / анкера", "сварочные материалы", "антикоррозионная защита"],
    labor: ["обмер и схема", "изготовление / подгонка", "монтаж металлоконструкций", "окраска и приемка"],
    equipment: ["сварочное оборудование warning", "кран / автовышка warning"],
  },
  carpentry: {
    materials: ["пиломатериал / изделие", "конструкционный крепеж дерева", "защитная пропитка", "настил / обшивка"],
    labor: ["обмер и схема", "раскрой", "монтаж конструкции", "защитная обработка"],
    equipment: ["пила / шуруповерт", "работы на высоте warning"],
  },
  documents_design: {
    materials: ["отчетный комплект", "планы / схемы", "фотофиксация", "цифровые материалы"],
    labor: ["подготовка задания", "полевое обследование", "обработка данных", "оформление отчета"],
    equipment: ["измерительный прибор", "сканер / тепловизор warning"],
  },
  cleaning: {
    materials: ["моющие / сорбирующие материалы", "защитные пленки", "мешки", "расходники"],
    labor: ["обследование зоны", "очистка", "сбор отходов", "финишная приемка"],
    equipment: ["пылесос / осушитель warning", "ручной инструмент"],
  },
  delivery_equipment: {
    materials: ["оборудование / узлы", "анкера и крепеж", "кабельные подключения", "пусковые расходники"],
    labor: ["такелаж и выставление", "монтаж оборудования", "подключение коммуникаций", "ПНР и испытания"],
    equipment: ["такелаж", "кран / погрузчик warning"],
  },
  other: {
    materials: ["черновые материалы", "финишные покрытия", "инженерные комплектующие", "расходники"],
    labor: ["обмер и ведомость", "подготовительные работы", "основные работы", "координация и сдача"],
    equipment: ["малая механизация", "пылеудаление warning"],
  },
};

const OPEN_ESTIMATOR_SIGNATURE_RULES: readonly OpenEstimatorSignatureRule[] = [
  { domain: "parking_marking", titleRu: "Профессиональная предварительная смета: разметка паркинга", pattern: /разметк[а-яё]*\s+(?:паркинг|парковк)|парковочн[а-яё]*\s+разметк|машиномест|нумерац[а-яё]*\s+паркинг/i, category: "roadworks", object: "parking_marking_scope", operation: "marking", complexity: "medium", requiredMaterials: ["разметочная краска / холодный пластик", "праймер warning", "трафареты и расходники", "защитные конусы"], requiredLabor: ["обследование покрытия", "разбивка машиномест", "нанесение линий и номеров", "контроль геометрии"], requiredEquipmentOrWarnings: ["разметочная машина warning", "лазерный дальномер / шнурка"] },
  { domain: "masonry_detail", titleRu: "Профессиональная предварительная смета: кладочные работы", pattern: /(?:^|\s)кладк[а-яё]*|армирован[а-яё]*\s+кладк|вентканал|парапет/i, category: "masonry", object: "masonry_wall", operation: "masonry", complexity: "medium", requiredMaterials: ["кирпич / блок", "кладочный раствор", "кладочная сетка / армирование", "перемычки warning"], requiredLabor: ["разметка кладки", "кладка рядов", "армирование кладки", "контроль вертикали"], requiredEquipmentOrWarnings: ["подмости", "миксер"] },
  { domain: "backup_generator", titleRu: "Профессиональная предварительная смета: дизель-генератор", pattern: /дизель[-\s]?генератор|генераторн[а-яё]*\s+установк|дгу\b|резервн[а-яё]*\s+питани[а-яё]*\s+генератор|пнр\s+дгу/i, category: "electrical", object: "backup_generator_system", operation: "installation", complexity: "complex", requiredMaterials: ["дизель-генераторная установка", "АВР / шкаф управления", "кабельные линии", "основание и виброопоры", "дымоход / выхлоп warning"], requiredLabor: ["обследование места установки", "монтаж ДГУ", "подключение силовых кабелей", "настройка АВР", "ПНР под нагрузкой"], requiredEquipmentOrWarnings: ["такелаж warning", "нагрузочный модуль warning", "только профильный подрядчик warning"] },
  { domain: "datacenter_mep", titleRu: "Профессиональная предварительная смета: ЦОД / серверная инфраструктура", pattern: /цод|серверн|фальшпол|ибп|стойк[аи]\s+сервер|холодн[а-яё]*\s+коридор|прецизионн[а-яё]*\s+кондиционер|кабельн[а-яё]*\s+лотк/i, category: "electrical", object: "datacenter_mep_scope", complexity: "complex" },
  { domain: "water_treatment", titleRu: "Профессиональная предварительная смета: водоподготовка и очистные сооружения", pattern: /водоподготов|умягчен|обратн[а-яё]*\s+осмос|обезжелез|уф|обеззаражив|дозир|локальн[а-яё]*\s+очистн|очистн[а-яё]*\s+сооруж|сепаратор|нефтепродукт|биологическ[а-яё]*\s+станц|пнр\s+очист/i, category: "plumbing", object: "water_treatment_system", complexity: "complex" },
  { domain: "pool_fountain", titleRu: "Профессиональная предварительная смета: бассейн / фонтан", pattern: /бассейн|скиммер|фонтан|чаша\s+бассейн|подогрев\s+воды\s+бассейн|пнр\s+бассейн/i, category: "plumbing", object: "pool_system", complexity: "complex" },
  { domain: "cold_room", titleRu: "Профессиональная предварительная смета: холодильная камера", pattern: /холодильн|испарител|сэндвич-панел[ьи]\s+камер|дренаж\s+холодильн|пнр\s+холодильн/i, category: "heating_hvac", object: "cold_room_system", complexity: "complex" },
  { domain: "cleanroom_laboratory", titleRu: "Профессиональная предварительная смета: чистая зона / лаборатория", pattern: /чист[а-яё]*\s+комнат|лаборатор|антибактериальн|моечн[а-яё]*\s+зон|медицинск[а-яё]*\s+газ|hepa|пнр\s+чистой/i, category: "other", object: "cleanroom_laboratory_scope", complexity: "complex" },
  { domain: "temporary_site_facilities", titleRu: "Профессиональная предварительная смета: временная инфраструктура стройплощадки", pattern: /временн|стройплощад|бытов|строительн[а-яё]*\s+леса|пункт\s+мойки|мойки\s+кол[её]с|перенос\s+бытов|ограждение\s+стройплощад/i, category: "other", object: "temporary_site_facilities", complexity: "complex" },
  { domain: "survey_documentation", titleRu: "Профессиональная предварительная смета: обследование и исполнительная документация", pattern: /обследован|обмерн|геодез|разбивк[а-яё]*\s+ос|исполнительн[а-яё]*\s+схем|паспортизац|дефектн[а-яё]*\s+ведом|bim|лазерн[а-яё]*\s+сканирован|техническ[а-яё]*\s+обследован/i, category: "documents_design", object: "survey_documentation_scope", operation: "survey" },
  { domain: "emergency_restoration", titleRu: "Профессиональная предварительная смета: аварийное восстановление", pattern: /аварийн|срочн|после\s+протеч|после\s+пожар|после\s+залив|задымлен|страхов[а-яё]*\s+смет|временн[а-яё]*\s+водоотвод|герметизац[а-яё]*\s+шва|усиление\s+стены/i, category: "other", object: "emergency_restoration_scope", operation: "repair", complexity: "complex" },
  { domain: "warehouse_logistics", titleRu: "Профессиональная предварительная смета: складская инфраструктура", pattern: /складск|разметк[а-яё]*\s+склад|склад[а-яё]*\s+разметк|паллетомест|доклевеллер|погрузочн[а-яё]*\s+рамп|отбойник|антипылев|зарядн[а-яё]*\s+зон[а-яё]*\s+погрузчик|ремонт\s+складск/i, category: "delivery_equipment", object: "warehouse_logistics_scope", complexity: "complex" },
  { domain: "industrial_equipment", titleRu: "Профессиональная предварительная смета: промышленное оборудование", pattern: /промышленн[а-яё]*\s+оборуд|станк|конвейер|кран-балк|компрессорн|промышленн[а-яё]*\s+насос|технологическ[а-яё]*\s+лини|подключение\s+оборуд|пнр\s+промышленн|демонтаж\s+оборуд/i, category: "delivery_equipment", object: "industrial_equipment_scope", complexity: "infrastructure" },
  { domain: "vertical_transport", titleRu: "Профессиональная предварительная смета: вертикальный транспорт", pattern: /грузов[а-яё]*\s+лифт|подъ[её]мн[а-яё]*\s+платформ|эскалатор|траволатор|лифтов[а-яё]*\s+шахт|направляющ[а-яё]*\s+лифт|двер[а-яё]*\s+шахты\s+лифт|пнр\s+лифт|замена\s+лифтов/i, category: "delivery_equipment", object: "vertical_transport_system", complexity: "complex" },
  { domain: "commercial_fit_out", titleRu: "Профессиональная предварительная смета: коммерческая отделка", pattern: /fit[-\s]?out|офис|кафе|магазин|салон[а-яё]*\s+красоты|медицинск[а-яё]*\s+кабинет|ресторан|шоурум|учебн[а-яё]*\s+класс|коммерческ[а-яё]*\s+помещ|инженерн[а-яё]*\s+подготовк[а-яё]*\s+офис/i, category: "other", object: "commercial_fit_out", operation: "renovation", complexity: "complex" },
  { domain: "apartment_house_renovation", titleRu: "Профессиональная предварительная смета: ремонт жилья", pattern: /квартир|перепланировк|чернов[а-яё]*\s+отделк|чистов[а-яё]*\s+отделк|ремонт\s+кухн|ремонт\s+сануз|ремонт\s+ванн|ремонт\s+дом|балкон/i, category: "other", object: "residential_renovation_scope", operation: "renovation", complexity: "complex" },
  { domain: "fire_safety_system", titleRu: "Профессиональная предварительная смета: пожарная безопасность", pattern: /пожарн|спринклер|соуэ|дымоудален|противодым|огнезащит|пожаротуш|пожарн[а-яё]*\s+клапан/i, category: "electrical", object: "fire_safety_system", complexity: "complex" },
  { domain: "automation_bms", titleRu: "Профессиональная предварительная смета: автоматика и диспетчеризация", pattern: /bms|диспетчеризац|шкаф\s+автоматик|датчик|автоматик[а-яё]*\s+вентиляц|автоматик[а-яё]*\s+насосн|систем[а-яё]*\s+мониторинг|программирован[а-яё]*\s+контроллер|пнр\s+bms/i, category: "electrical", object: "automation_bms_scope", complexity: "complex" },
  { domain: "solar_power", titleRu: "Профессиональная предварительная смета: солнечная станция", pattern: /солнеч|фэс|фэм|инвертор|аккумуляторн[а-яё]*\s+блок|dc\s+|щит\s+защиты\s+фэс|пнр\s+солнеч/i, category: "electrical", object: "solar_power_system", complexity: "infrastructure" },
  { domain: "hydropower_support", titleRu: "Профессиональная предварительная смета: оборудование ГЭС", pattern: /гэс|гидроагрегат|водовод|затвор|водосброс|маслостанц/i, category: "concrete", object: "hydropower_turbine", complexity: "infrastructure" },
  { domain: "hvac_air_conditioning", titleRu: "Профессиональная предварительная смета: кондиционирование", pattern: /кондиционер|кондиционирован|сплит|vrf|чиллер|фанкойл|фреонов[а-яё]*\s+трасс|наружн[а-яё]*\s+блок|внутренн[а-яё]*\s+блок|пнр\s+кондиционирован/i, category: "heating_hvac", object: "hvac_cooling_system", complexity: "complex" },
  { domain: "heating_itp", titleRu: "Профессиональная предварительная смета: отопление и ИТП", pattern: /радиаторн|конвектор|отоплен|тепл[оё]трасс|теплов[а-яё]*\s+пункт|итп|насосно-смесительн|гидрострелк|теплообменник|узел\s+уч[её]та\s+тепла|котельн|бойлер|дымоход|опрессовк[а-яё]*\s+отоплен|балансировк[а-яё]*\s+отоплен/i, category: "heating_hvac", object: "heating_itp_scope", complexity: "complex" },
  { domain: "underfloor_heating", titleRu: "Профессиональная предварительная смета: водяной теплый пол", pattern: /водян[а-яё]*\s+т[её]пл[а-яё]*\s+пол|т[её]пл[а-яё]*\s+пол/i, category: "heating_hvac", object: "underfloor_heating_system", operation: "installation", complexity: "complex", requiredMaterials: ["труба теплого пола", "коллектор и шкаф", "теплоизоляция", "демпферная лента", "крепежная система"], requiredLabor: ["разметка контуров", "укладка труб теплого пола", "монтаж коллектора", "опрессовка контуров", "исполнительная схема"], requiredEquipmentOrWarnings: ["насос для опрессовки", "теплотехническая проверка warning"] },
  { domain: "ventilation_hvac", titleRu: "Профессиональная предварительная смета: вентиляция", pattern: /вентиляц|воздуховод|шумоглушител|реш[её]тк[и]?|диффузор|паспортизац[а-яё]*\s+вентиляц|пнр\s+вентиляц/i, category: "heating_hvac", object: "ventilation_network", complexity: "complex" },
  { domain: "electrical_networks", titleRu: "Профессиональная предварительная смета: электромонтаж", pattern: /электро|электрощит|кабельн[а-яё]*\s+трасс|розеточн[а-яё]*\s+групп|освещен|заземлен|молниезащит|силов[а-яё]*\s+кабел|электропроводк|испытан[а-яё]*\s+электроустанов|кабельн[а-яё]*\s+лини|кабельн[а-яё]*\s+канализац/i, category: "electrical", object: "electrical_network", complexity: "complex" },
  { domain: "low_voltage_security", titleRu: "Профессиональная предварительная смета: слаботочные системы", pattern: /скуд|соуэ|видеонаблюд|охранн[а-яё]*\s+сигнализац|скс|домофон|контроль\s+доступ|пожарн[а-яё]*\s+сигнализац|обслуживан[а-яё]*\s+слаботоч/i, category: "electrical", object: "low_voltage_system", complexity: "complex" },
  { domain: "water_supply_plumbing", titleRu: "Профессиональная предварительная смета: водоснабжение и сантехника", pattern: /водопровод|водоснабжен|стояк|хвс|гвс|разводк[а-яё]*\s+сантех|коллектор|насосн[а-яё]*\s+групп|сантехническ[а-яё]*\s+прибор|фильтрац[а-яё]*\s+вод|опрессовк[а-яё]*\s+водопровод|испытан[а-яё]*\s+наружн[а-яё]*\s+сет|наружн[а-яё]*\s+сет[а-яё]*\s+испытан|протечк|жироуловител|наружн[а-яё]*\s+водопровод/i, category: "plumbing", object: "water_supply_system", complexity: "complex" },
  { domain: "sewerage_stormwater", titleRu: "Профессиональная предварительная смета: канализация / ливневка", pattern: /канализац|септик|дренажн[а-яё]*\s+труб|смотров[а-яё]*\s+колод|дождепри[её]мник|ливнев[а-яё]*\s+сет|ремонт\s+канализац|наружн[а-яё]*\s+канализац/i, category: "plumbing", object: "sewerage_stormwater_scope", complexity: "infrastructure" },
  { domain: "earthworks_preparation", titleRu: "Профессиональная предварительная смета: земляные работы и подготовка основания", pattern: /котлован|копк[а-яё]*\s+транше|транше|обратн[а-яё]*\s+засыпк|планировк[а-яё]*\s+участ|вывоз\s+грунт|уплотнен[а-яё]*\s+грунт|песчан[а-яё]*\s+подушк|щеб[её]ночн[а-яё]*\s+подушк|грунт\s+под\s+фундамент|песчано-щеб/i, category: "roadworks", object: "earthworks_preparation_scope" },
  { domain: "asphalt_roadworks", titleRu: "Профессиональная предварительная смета: дорожные работы", pattern: /асфальт|дорожн|парковк|бордюр|ливнев[а-яё]*\s+лоток|щеб[её]ночн[а-яё]*\s+дорог|фрезерован|бетонн[а-яё]*\s+дорог/i, category: "roadworks", object: "roadworks_scope", complexity: "infrastructure" },
  { domain: "landscaping_elements", titleRu: "Профессиональная предварительная смета: благоустройство", pattern: /брусчат|мощен|тротуарн|садов[а-яё]*\s+дорожк|отмостк|рулонн[а-яё]*\s+газон|лавочк|урн|дренаж\s+газон|геотекстиль\s+под\s+мощен|восстановлен[а-яё]*\s+благоустрой/i, category: "landscaping", object: "landscaping_scope" },
  { domain: "metal_structures", titleRu: "Профессиональная предварительная смета: металлоконструкции", pattern: /металлоконструк|металлическ|ферм|козыр[её]к|сварн|металлокаркас|антикоррозион|площадк[а-яё]*\s+обслуживан|перильн[а-яё]*\s+огражден|сетчат[а-яё]*\s+огражден|секционн[а-яё]*\s+забор|профнастил|шлагбаум|ворот|калитк/i, category: "metalworks", object: "metal_structure_scope", complexity: "complex" },
  { domain: "demolition_waste", titleRu: "Профессиональная предварительная смета: демонтаж и вывоз", pattern: /демонтаж|снос|разборк|вывоз\s+строительн[а-яё]*\s+мусор|аккуратн[а-яё]*\s+демонтаж/i, category: "demolition", object: "demolition_scope", operation: "demolition" },
  { domain: "flooring_detail", titleRu: "Профессиональная предварительная смета: напольные покрытия", pattern: /кварцвинил|ковролин|пробков[а-яё]*\s+пол|деревянн[а-яё]*\s+пол|плинтус|инженерн[а-яё]*\s+доск|паркетн[а-яё]*\s+доск|замена\s+покрыт|напольн[а-яё]*\s+покрыт/i, category: "flooring", object: "floor_covering" },
  { domain: "floor_screed_detail", titleRu: "Профессиональная предварительная смета: стяжка и подготовка пола", pattern: /наливн[а-яё]*\s+пол|выравниван[а-яё]*\s+основан|сух[а-яё]*\s+стяжк|ремонт\s+трещин\s+стяжк|шлифовк[а-яё]*\s+бетонн[а-яё]*\s+пол|обеспечиван[а-яё]*\s+бетон|обеспылив|топпинг/i, category: "concrete", object: "floor_screed" },
  { domain: "tile_detail", titleRu: "Профессиональная предварительная смета: плиточные работы", pattern: /ступен|плиточн[а-яё]*\s+шв|цокол|клинкер|фартук|мозаик|террас[а-яё]*\s+\d|керамогранит|плитк/i, category: "tile", object: "tile_surface" },
  { domain: "wall_finishing_detail", titleRu: "Профессиональная предварительная смета: стены и отделка", pattern: /шпакл|подготовк[а-яё]*\s+стен|трещин\s+стен|откос|декоративн[а-яё]*\s+штукатур|покраск|окраск|штукатур/i, category: "wall_finishing", object: "wall_finishing_scope" },
  { domain: "roofing_detail", titleRu: "Профессиональная предварительная смета: кровельные работы", pattern: /металлочерепиц|профнастил\s+на\s+кровл|мягк[а-яё]*\s+черепиц|стропильн|водосточ|снегозадерж|примыкан|мансардн[а-яё]*\s+кровл|воронк|пароизоляц[а-яё]*\s+кровл|протечек\s+кровл/i, category: "roofing", object: "roof_system", complexity: "complex" },
  { domain: "concrete_foundation_detail", titleRu: "Профессиональная предварительная смета: бетон и фундаменты", pattern: /армопояс|монолитн[а-яё]*\s+лестниц|бетонирован|бетонн[а-яё]*\s+крыльц|бетонн[а-яё]*\s+пандус|торкрет|подливк|ростверк|подбетонк|плитн[а-яё]*\s+фундамент|свайн[а-яё]*\s+фундамент|свая|сваи|фундамент\s+под\s+оборуд|усилен[а-яё]*\s+фундамент|ремонт\s+бетон/i, category: "concrete", object: "concrete_element", complexity: "complex", requiredMaterials: ["бетон / сваи", "арматура", "опалубка / оголовки", "фиксаторы и закладные"], requiredLabor: ["разметка осей", "устройство свайного поля / фундамента", "армирование и бетонирование", "контроль отметок"], requiredEquipmentOrWarnings: ["буровая / копровая техника warning", "бетонный вибратор", "геология warning"] },
  { domain: "acoustic_specialty_finish", titleRu: "Профессиональная предварительная смета: акустическая и специальная отделка", pattern: /акустич|звукоизоляц|виброизоляц|перфорированн[а-яё]*\s+панел|декоративн[а-яё]*\s+рейк|hpl|огнестойк[а-яё]*\s+облицовк|шумозащитн|антискользящ|пароизоляц|теплоизоляц|минеральн[а-яё]*\s+ват|изоляц/i, category: "insulation", object: "specialty_insulation_finish" },
  { domain: "carpentry_woodwork", titleRu: "Профессиональная предварительная смета: деревянные конструкции", pattern: /каркасн[а-яё]*\s+дом|деревянн|пергола|террасн[а-яё]*\s+доск|обреш[её]тк|антисептирован|деревянн[а-яё]*\s+балк/i, category: "carpentry", object: "woodwork_scope", complexity: "complex" },
  { domain: "stairs_ramps_railings", titleRu: "Профессиональная предварительная смета: лестницы, пандусы и перила", pattern: /лестниц|ступен|пандус|перил|огражден[а-яё]*\s+лестниц|лестничн[а-яё]*\s+площадк/i, category: "carpentry", object: "staircase", complexity: "complex" },
  { domain: "well_water_system", titleRu: "Профессиональная предварительная смета: скважина и водозабор", pattern: /скважин|обсадн[а-яё]*\s+труб|кессон|оголовок|водопровод\s+от\s+скважин|геологическ[а-яё]*\s+обследован|промывк[а-яё]*\s+скважин|пнр\s+скважин/i, category: "plumbing", object: "well_water_system", complexity: "infrastructure" },
];

function resolveOpenEstimatorDomainSignature(normalized: string): EstimatorResolvedDomainSignature | null {
  const rule = OPEN_ESTIMATOR_SIGNATURE_RULES.find((item) => item.pattern.test(normalized));
  if (!rule) return null;
  const defaults = OPEN_ESTIMATOR_DEFAULTS[rule.category];
  return {
    workKey: `dynamic_${rule.domain}_estimate`,
    titleRu: rule.titleRu,
    category: rule.category,
    domain: rule.domain,
    object: rule.object,
    operation: rule.operation ?? "installation",
    method: `${rule.domain}_professional_scope`,
    materialSystem: `${rule.domain}_system`,
    complexity: rule.complexity ?? "medium",
    requiredMaterials: [...(rule.requiredMaterials ?? defaults.materials)],
    requiredLabor: [...(rule.requiredLabor ?? defaults.labor)],
    requiredEquipmentOrWarnings: [...(rule.requiredEquipmentOrWarnings ?? defaults.equipment)],
    requiredLogisticsOrWarnings: ["доставка материалов / оборудования", "вывоз отходов warning"],
    exclusions: sharedExclusions,
    clarifyingQuestions: sharedQuestions,
  };
}

export function resolveEstimatorDomainSignature(text: string): EstimatorResolvedDomainSignature | null {
  const normalized = normalizeDimensionText(text);
  const priorityOpenSignature = resolveOpenEstimatorDomainSignature(normalized);
  if (priorityOpenSignature?.domain === "parking_marking") return priorityOpenSignature;
  const matches = ESTIMATOR_DOMAIN_LEXICON
    .flatMap((item) =>
      [...item.terms, ...item.casePhrases]
        .map((term) => ({ item, term: normalizeDimensionText(term) }))
        .filter(({ term, item }) => term.length > 0 && normalized.includes(term) && !(item.domain === "entrance_group" && isContextOnlyEntranceGroupMatch(normalized, term))),
    );
  const demolitionDominant = /^(?:смета\s+на\s+)?(?:демонтаж|снос|разборк)/.test(normalized);
  const primaryWorkMatches = demolitionDominant ? matches : matches.filter(({ item }) => item.domain !== "demolition");
  const match = (primaryWorkMatches.length > 0 ? primaryWorkMatches : matches)
    .sort((left, right) => right.term.length - left.term.length)[0];
  if (!match) return priorityOpenSignature;
  const entry = match.item;
  return {
    workKey: `dynamic_${entry.domain}_estimate`,
    titleRu: `Профессиональная предварительная смета: ${entry.casePhrases[0]}`,
    category: entry.category,
    domain: entry.domain,
    object: entry.object,
    operation: entry.operation,
    method: entry.method,
    materialSystem: entry.materialSystem,
    complexity: entry.complexity,
    requiredMaterials: [...entry.requiredMaterials],
    requiredLabor: [...entry.requiredLabor],
    requiredEquipmentOrWarnings: [...entry.requiredEquipmentOrWarnings],
    requiredLogisticsOrWarnings: [...entry.requiredLogisticsOrWarnings],
    exclusions: [...entry.exclusions],
    clarifyingQuestions: [...entry.clarifyingQuestions],
  };
}
