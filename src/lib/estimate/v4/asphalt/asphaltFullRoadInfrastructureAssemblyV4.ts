import type { BoqCategoryV4, BoqLineDefinitionV4 } from "../professionalEstimateV4Contract";

export type FullRoadInfrastructureGroupV4 =
  | "curb"
  | "drainage"
  | "storm_inlet"
  | "storm_pipe"
  | "storm_well"
  | "marking"
  | "sign"
  | "sign_foundation"
  | "barrier"
  | "lighting";

export type FullRoadInfrastructureLineV4 = {
  row_id: string;
  wbs_code: string;
  section: string;
  phase: string;
  category: BoqCategoryV4;
  name_ru: string;
  action: string;
  action_object: string;
  specification_ru: string;
  unit_id: string;
  formula_id: string;
  expression: string;
  input_units: Record<string, string>;
  input_values: Record<string, number>;
  quantity: number;
  applicability: string;
  inclusion_reason_ru: string;
  exclusion_rule: string;
  source_ids: string[];
  price_key?: string | null;
  procurement?: boolean;
  cost_ownership_id?: string | null;
  informational?: boolean;
  component_type?: NonNullable<BoqLineDefinitionV4["component_type"]>;
  specification_status?: NonNullable<BoqLineDefinitionV4["specification_status"]>;
};

type Context = {
  area: number;
  length: number;
  curbLength: number;
  drainageLength: number;
  inletCount: number;
  pipeLength: number;
  wellCount: number;
  markingArea: number;
  markingRate: number;
  markingBeadsRate: number;
  signCount: number;
  barrierLength: number;
  poleCount: number;
  cableLength: number;
  cabinetCount: number;
  stormPipeDiameter: number;
  luminairePower: number;
};

type Spec = {
  id: string;
  group: FullRoadInfrastructureGroupV4;
  name: string;
  unit: string;
  quantity: (context: Context) => number;
  category?: BoqCategoryV4;
  detail?: string;
  procurement?: boolean;
};

const atLeast = (value: number, minimum = 0.001): number => Math.max(minimum, value);
const count = (value: number): number => Math.max(1, Math.ceil(value));

const material = (
  group: FullRoadInfrastructureGroupV4,
  id: string,
  name: string,
  unit: string,
  quantity: (context: Context) => number,
  detail: string,
): Spec => ({ group, id, name, unit, quantity, detail, category: "material", procurement: true });

const equipment = (
  group: FullRoadInfrastructureGroupV4,
  id: string,
  name: string,
  unit: string,
  quantity: (context: Context) => number,
  detail: string,
): Spec => ({ group, id, name, unit, quantity, detail, category: "equipment", procurement: true });

const work = (
  group: FullRoadInfrastructureGroupV4,
  id: string,
  name: string,
  unit: string,
  quantity: (context: Context) => number,
  detail: string,
): Spec => ({ group, id, name, unit, quantity, detail, category: "work" });

const test = (
  group: FullRoadInfrastructureGroupV4,
  id: string,
  name: string,
  quantity: (context: Context) => number,
  detail: string,
): Spec => ({ group, id, name, unit: "test", quantity, detail, category: "testing" });

const service = (
  group: FullRoadInfrastructureGroupV4,
  id: string,
  name: string,
  quantity: (context: Context) => number,
  detail: string,
): Spec => ({ group, id, name, unit: "service", quantity, detail, category: "subcontract_service" });

const machinery = (
  group: FullRoadInfrastructureGroupV4,
  id: string,
  name: string,
  quantity: (context: Context) => number,
): Spec => ({ group, id, name, unit: "machine_hour", quantity, category: "machinery", detail: "Машино-часы являются открытым предварительным объёмом и заменяются данными ППР." });

const GROUP_WBS: Readonly<Record<FullRoadInfrastructureGroupV4, string>> = {
  curb: "13",
  drainage: "15",
  storm_inlet: "18",
  storm_pipe: "16",
  storm_well: "18",
  marking: "19",
  sign: "20",
  sign_foundation: "20",
  barrier: "21",
  lighting: "22",
};

const GROUP_TITLE: Readonly<Record<FullRoadInfrastructureGroupV4, string>> = {
  curb: "Бортовой камень",
  drainage: "Линейный водоотвод",
  storm_inlet: "Дождеприёмники",
  storm_pipe: "Дождевая канализация",
  storm_well: "Колодцы дождевой канализации",
  marking: "Дорожная разметка",
  sign: "Дорожные знаки",
  sign_foundation: "Фундаменты дорожных знаков",
  barrier: "Барьерное ограждение",
  lighting: "Наружное освещение дороги",
};

const SPECS: readonly Spec[] = [
  // Бортовой камень: материалы, работы и механизация являются отдельными владельцами стоимости.
  material("curb", "curb_stone_material", "Бортовой камень дорожный", "m", (c) => c.curbLength, "Тип, размер, класс бетона и стандарт уточняются проектом; предварительно принят дорожный бортовой камень."),
  material("curb", "curb_bedding_concrete", "Бетон подготовки под бортовой камень", "m3", (c) => c.curbLength * 0.035, "Предварительная площадь сечения бетонной подготовки 0,035 м²."),
  material("curb", "curb_haunch_concrete", "Бетон обоймы бортового камня", "m3", (c) => c.curbLength * 0.025, "Предварительная площадь сечения бетонной обоймы 0,025 м²."),
  material("curb", "curb_cement_sand_mortar", "Цементно-песчаный раствор для бортового камня", "m3", (c) => c.curbLength * 0.006, "Предварительный расход раствора 0,006 м³ на погонный метр."),
  material("curb", "curb_bedding_sand", "Песок для подготовки под бортовой камень", "m3", (c) => c.curbLength * 0.018, "Предварительный уплотнённый объём песчаной подготовки."),
  material("curb", "curb_bedding_crushed_stone", "Щебень для подготовки под бортовой камень", "m3", (c) => c.curbLength * 0.03, "Предварительный уплотнённый объём щебёночной подготовки."),
  material("curb", "curb_joint_filling_material", "Материал заполнения швов бортового камня", "kg", (c) => c.curbLength * 0.08, "Предварительный расход по длине линии бортового камня."),
  material("curb", "curb_joint_sealant", "Герметик швов бортового камня", "kg", (c) => c.curbLength * 0.04, "Тип герметика и расход заменяются технологической картой."),
  material("curb", "curb_formwork_material", "Опалубочные материалы для бетонной обоймы бордюра", "m2", (c) => c.curbLength * 0.25, "Предварительная площадь контактной опалубки."),
  material("curb", "curb_reinforcement", "Арматура бетонной обоймы бортового камня", "kg", (c) => c.curbLength * 1.8, "Предварительное конструктивное армирование; класс и диаметр уточняются проектом."),
  material("curb", "curb_anchor_fasteners", "Анкеры крепления бортового камня", "pcs", (c) => count(c.curbLength / 2), "Отдельный владелец крепежа бордюрного узла; не дублируется в других сборках."),
  work("curb", "curb_line_setting_out", "Разбивка линии бортового камня", "m", (c) => c.curbLength, "Геодезическая разбивка линии и отметок."),
  work("curb", "curb_trench_excavation", "Разработка траншеи под бортовой камень", "m3", (c) => c.curbLength * 0.18, "Предварительное сечение траншеи 0,18 м²."),
  work("curb", "curb_base_preparation", "Подготовка основания под бортовой камень", "m", (c) => c.curbLength, "Зачистка и планировка основания."),
  work("curb", "curb_sand_crushed_bedding", "Устройство песчано-щебёночной подготовки бордюра", "m", (c) => c.curbLength, "Послойное устройство и уплотнение подготовки."),
  work("curb", "curb_formwork_installation", "Установка опалубки бетонной обоймы бордюра", "m2", (c) => c.curbLength * 0.25, "Монтаж и разборка опалубки."),
  work("curb", "curb_concrete_base_installation", "Устройство бетонного основания под бортовой камень", "m3", (c) => c.curbLength * 0.035, "Укладка, уплотнение и уход за бетоном."),
  work("curb", "curb_stone_installation", "Установка бортового камня", "m", (c) => c.curbLength, "Монтаж по линии и проектным отметкам."),
  work("curb", "curb_alignment", "Выверка отметок бортового камня", "m", (c) => c.curbLength, "Инструментальная выверка положения."),
  work("curb", "curb_haunch_installation", "Устройство бетонной обоймы бортового камня", "m3", (c) => c.curbLength * 0.025, "Бетонирование бокового упора."),
  work("curb", "curb_joint_sealing", "Заполнение и герметизация швов бортового камня", "m", (c) => c.curbLength, "Обработка всех монтажных стыков."),
  work("curb", "curb_backfill", "Обратная засыпка пазух бордюрной траншеи", "m3", (c) => c.curbLength * 0.12, "Послойная засыпка и уплотнение."),
  work("curb", "curb_elevation_control", "Контроль отметок установленного бортового камня", "m", (c) => c.curbLength, "Исполнительный контроль линии и отметок."),
  machinery("curb", "curb_excavator", "Экскаватор для бордюрной траншеи", (c) => c.curbLength / 120),
  machinery("curb", "curb_loader", "Фронтальный погрузчик для бордюрного узла", (c) => c.curbLength / 250),
  machinery("curb", "curb_plate_compactor", "Виброплита для подготовки бордюрного узла", (c) => c.curbLength / 80),
  machinery("curb", "curb_concrete_mixer_truck", "Автобетоносмеситель для бордюрного узла", (c) => c.curbLength / 300),
  machinery("curb", "curb_manipulator", "Кран-манипулятор для монтажа бортового камня", (c) => c.curbLength / 180),

  // Линейный водоотвод.
  material("drainage", "drainage_tray", "Водоотводный лоток класса нагрузки по проекту", "m", (c) => c.drainageLength, "Материал, гидравлическое сечение и класс нагрузки уточняются расчётом."),
  material("drainage", "drainage_grating", "Защитная решётка водоотводного лотка", "m", (c) => c.drainageLength, "Класс нагрузки и материал решётки согласуются с лотком."),
  material("drainage", "drainage_grating_fasteners", "Крепёж защитной решётки водоотводного лотка", "pcs", (c) => count(c.drainageLength * 2), "Отдельный владелец крепежа решёток."),
  material("drainage", "drainage_base_concrete", "Бетон основания водоотводного лотка", "m3", (c) => c.drainageLength * 0.06, "Предварительная площадь сечения основания 0,06 м²."),
  material("drainage", "drainage_encasement_concrete", "Бетон обоймы водоотводного лотка", "m3", (c) => c.drainageLength * 0.08, "Предварительная площадь сечения обоймы 0,08 м²."),
  material("drainage", "drainage_bedding_sand", "Песок подготовки водоотводного лотка", "m3", (c) => c.drainageLength * 0.04, "Предварительный уплотнённый объём."),
  material("drainage", "drainage_bedding_crushed_stone", "Щебень подготовки водоотводного лотка", "m3", (c) => c.drainageLength * 0.06, "Предварительный уплотнённый объём."),
  material("drainage", "drainage_joint_sealant", "Герметик стыков водоотводных лотков", "kg", (c) => c.drainageLength * 0.12, "Расход уточняется системой лотков."),
  material("drainage", "drainage_connectors", "Соединительные элементы водоотводных лотков", "pcs", (c) => count(c.drainageLength), "Отдельный владелец соединителей лотков."),
  material("drainage", "drainage_end_caps", "Торцевые заглушки водоотводных лотков", "pcs", () => 4, "По две торцевые заглушки на каждую сторону дороги."),
  material("drainage", "drainage_adapters", "Переходники водоотводной системы", "pcs", (c) => count(c.inletCount / 4), "Переход к дождеприёмникам и трубопроводам."),
  material("drainage", "drainage_silt_traps", "Пескоуловители линейного водоотвода", "pcs", (c) => count(c.inletCount / 3), "Предварительный шаг заменяется гидравлическим расчётом."),
  work("drainage", "drainage_route_setting_out", "Разбивка трассы линейного водоотвода", "m", (c) => c.drainageLength, "Геодезическая разбивка трассы."),
  work("drainage", "drainage_trench_excavation", "Разработка траншеи линейного водоотвода", "m3", (c) => c.drainageLength * 0.4, "Предварительное сечение траншеи 0,40 м²."),
  work("drainage", "drainage_base_preparation", "Подготовка основания линейного водоотвода", "m", (c) => c.drainageLength, "Планировка и уплотнение основания."),
  work("drainage", "drainage_concrete_base_installation", "Устройство бетонного основания водоотводных лотков", "m3", (c) => c.drainageLength * 0.06, "Укладка и уход за бетоном."),
  work("drainage", "drainage_tray_installation", "Монтаж водоотводных лотков", "m", (c) => c.drainageLength, "Монтаж с контролем уклона."),
  work("drainage", "drainage_grating_installation", "Монтаж защитных решёток водоотводных лотков", "m", (c) => c.drainageLength, "Монтаж и фиксация решёток."),
  work("drainage", "drainage_element_connection", "Соединение элементов линейного водоотвода", "pcs", (c) => count(c.drainageLength), "Соединение штатными элементами системы."),
  work("drainage", "drainage_joint_sealing", "Герметизация стыков водоотводных лотков", "m", (c) => c.drainageLength, "Герметизация монтажных соединений."),
  work("drainage", "drainage_network_connection", "Подключение лотков к дождевой канализации", "pcs", (c) => c.inletCount, "Подключение через дождеприёмные узлы."),
  work("drainage", "drainage_backfill", "Обратная засыпка траншеи линейного водоотвода", "m3", (c) => c.drainageLength * 0.25, "Послойная обратная засыпка."),
  test("drainage", "drainage_flow_test", "Испытание линейного водоотвода проливом", (c) => count(c.drainageLength / 500), "Участки испытаний уточняются программой контроля."),

  // Дождеприёмники.
  material("storm_inlet", "storm_inlet_body", "Корпус дождеприёмника", "pcs", (c) => c.inletCount, "Тип и геометрия корпуса уточняются гидравлическим расчётом."),
  material("storm_inlet", "storm_inlet_grating", "Решётка дождеприёмника проектного класса нагрузки", "pcs", (c) => c.inletCount, "Класс нагрузки соответствует зоне установки."),
  material("storm_inlet", "storm_inlet_frame", "Рама решётки дождеприёмника", "pcs", (c) => c.inletCount, "Совместима с корпусом и решёткой."),
  material("storm_inlet", "storm_inlet_silt_basket", "Пескоуловительная корзина дождеприёмника", "pcs", (c) => c.inletCount, "Съёмная корзина предварительно включена в каждый узел."),
  material("storm_inlet", "storm_inlet_trap_baffle", "Сифонная перегородка дождеприёмника", "pcs", (c) => c.inletCount, "Предварительно включена; применимость уточняется проектом."),
  material("storm_inlet", "storm_inlet_spigot", "Патрубок подключения дождеприёмника", "pcs", (c) => c.inletCount, "Диаметр согласуется с трубопроводом."),
  material("storm_inlet", "storm_inlet_sealing_collar", "Уплотнительная манжета патрубка дождеприёмника", "pcs", (c) => c.inletCount, "Эластомерная манжета проектной стойкости."),
  material("storm_inlet", "storm_inlet_base_concrete", "Бетон основания дождеприёмника", "m3", (c) => c.inletCount * 0.12, "Предварительный объём 0,12 м³ на узел."),
  material("storm_inlet", "storm_inlet_encasement_concrete", "Бетон обоймы дождеприёмника", "m3", (c) => c.inletCount * 0.18, "Предварительный объём 0,18 м³ на узел."),
  material("storm_inlet", "storm_inlet_reinforcement", "Арматура дождеприёмного узла", "kg", (c) => c.inletCount * 18, "Предварительный расход 18 кг на узел."),
  material("storm_inlet", "storm_inlet_waterproofing", "Гидроизоляция дождеприёмника", "m2", (c) => c.inletCount * 3.5, "Предварительная площадь обработки 3,5 м² на узел."),
  material("storm_inlet", "storm_inlet_sealant", "Герметик соединений дождеприёмника", "kg", (c) => c.inletCount * 0.8, "Материал совместим с системой труб."),
  material("storm_inlet", "storm_inlet_connection_fasteners", "Соединительный крепёж дождеприёмника", "pcs", (c) => c.inletCount * 8, "Отдельный владелец крепежа дождеприёмника."),
  work("storm_inlet", "storm_inlet_excavation", "Разработка котлованов дождеприёмников", "m3", (c) => c.inletCount * 2.5, "Предварительный объём 2,5 м³ на узел."),
  work("storm_inlet", "storm_inlet_base_preparation", "Подготовка основания дождеприёмников", "pcs", (c) => c.inletCount, "Планировка и уплотнение каждого основания."),
  work("storm_inlet", "storm_inlet_concrete_base_installation", "Устройство бетонных оснований дождеприёмников", "m3", (c) => c.inletCount * 0.12, "Бетонирование оснований."),
  work("storm_inlet", "storm_inlet_body_installation", "Монтаж корпусов дождеприёмников", "pcs", (c) => c.inletCount, "Монтаж по отметкам и уклонам."),
  work("storm_inlet", "storm_inlet_grating_frame_installation", "Установка рам и решёток дождеприёмников", "pcs", (c) => c.inletCount, "Выверка отметки верха решётки."),
  work("storm_inlet", "storm_inlet_pipe_connection", "Подключение труб к дождеприёмникам", "pcs", (c) => c.inletCount, "Герметичное подключение патрубков."),
  work("storm_inlet", "storm_inlet_waterproofing_work", "Гидроизоляция дождеприёмных узлов", "m2", (c) => c.inletCount * 3.5, "Обработка наружных поверхностей."),
  work("storm_inlet", "storm_inlet_backfill", "Обратная засыпка дождеприёмных узлов", "m3", (c) => c.inletCount * 1.8, "Послойная засыпка пазух."),
  work("storm_inlet", "storm_inlet_compaction", "Уплотнение засыпки дождеприёмных узлов", "m3", (c) => c.inletCount * 1.8, "Послойное механизированное уплотнение."),
  test("storm_inlet", "storm_inlet_test", "Испытание дождеприёмников", (c) => c.inletCount, "Проверка каждого узла проливом и осмотром."),

  // Трубопроводы дождевой канализации.
  material("storm_pipe", "storm_pipe", "Труба дождевой канализации кольцевой жёсткости по проекту", "m", (c) => c.pipeLength, "Предварительный диаметр и материал указаны в открытых допущениях."),
  material("storm_pipe", "storm_pipe_fittings", "Фасонные элементы труб дождевой канализации", "pcs", (c) => count(c.pipeLength / 100), "Отводы и переходы учитываются отдельно от линейной трубы."),
  material("storm_pipe", "storm_pipe_couplings", "Муфты труб дождевой канализации", "pcs", (c) => count(c.pipeLength / 6), "Отдельный владелец соединителей труб."),
  material("storm_pipe", "storm_pipe_bends", "Отводы дождевой канализации", "pcs", (c) => count(c.wellCount / 2), "Предварительный объём по конфигурации сети."),
  material("storm_pipe", "storm_pipe_tees", "Тройники дождевой канализации", "pcs", (c) => count(c.inletCount / 4), "Предварительный объём подключений ответвлений."),
  material("storm_pipe", "storm_pipe_reducers", "Переходы диаметров дождевой канализации", "pcs", (c) => count(c.wellCount / 4), "Диаметры уточняются гидравлическим расчётом."),
  material("storm_pipe", "storm_pipe_sealing_rings", "Уплотнительные кольца труб дождевой канализации", "pcs", (c) => count(c.pipeLength / 6), "Кольца совместимы с принятой трубной системой."),
  material("storm_pipe", "storm_pipe_sand_bedding", "Песок постели труб дождевой канализации", "m3", (c) => c.pipeLength * 0.18, "Предварительная площадь сечения постели 0,18 м²."),
  material("storm_pipe", "storm_pipe_crushed_base", "Щебень основания труб дождевой канализации", "m3", (c) => c.pipeLength * 0.12, "Предварительная площадь сечения основания 0,12 м²."),
  material("storm_pipe", "storm_pipe_surround_material", "Песчаный материал обсыпки труб дождевой канализации", "m3", (c) => c.pipeLength * 0.45, "Предварительная площадь сечения защитной обсыпки 0,45 м²."),
  material("storm_pipe", "storm_pipe_geotextile", "Геотекстиль трубной траншеи дождевой канализации", "m2", (c) => c.pipeLength * 2.2, "Предварительная ширина полотна 2,2 м."),
  material("storm_pipe", "storm_pipe_protective_sleeves", "Защитные футляры дождевой канализации", "m", (c) => c.pipeLength * 0.05, "Предварительно 5 % трассы в местах пересечений."),
  material("storm_pipe", "storm_pipe_reinforcement_concrete", "Бетон усиления участков дождевой канализации", "m3", (c) => c.pipeLength * 0.015, "Предварительно для локальных усиленных участков."),
  material("storm_pipe", "storm_pipe_warning_tape", "Сигнальная лента дождевой канализации", "m", (c) => c.pipeLength, "Укладка над трассой трубопровода."),
  material("storm_pipe", "storm_pipe_sealing_material", "Герметизирующие материалы труб дождевой канализации", "kg", (c) => c.pipeLength * 0.15, "Расход уточняется принятой системой соединений."),
  work("storm_pipe", "storm_pipe_trench_excavation", "Разработка траншей дождевой канализации", "m3", (c) => c.pipeLength * 2.4, "Предварительная площадь сечения траншеи 2,4 м²."),
  service("storm_pipe", "storm_pipe_dewatering", "Водопонижение в траншеях дождевой канализации", () => 1, "Предварительная услуга на объект; режим уточняется изысканиями."),
  work("storm_pipe", "storm_pipe_bedding_preparation", "Подготовка постели труб дождевой канализации", "m", (c) => c.pipeLength, "Профилирование и уплотнение постели."),
  work("storm_pipe", "storm_pipe_laying", "Укладка труб дождевой канализации", "m", (c) => c.pipeLength, "Укладка с контролем уклона."),
  work("storm_pipe", "storm_pipe_jointing", "Соединение труб дождевой канализации", "pcs", (c) => count(c.pipeLength / 6), "Монтаж муфт и уплотнительных колец."),
  work("storm_pipe", "storm_pipe_sleeve_installation", "Устройство защитных футляров дождевой канализации", "m", (c) => c.pipeLength * 0.05, "Монтаж на участках пересечений."),
  work("storm_pipe", "storm_pipe_surrounding", "Устройство защитной обсыпки труб дождевой канализации", "m3", (c) => c.pipeLength * 0.45, "Послойная обсыпка без повреждения трубы."),
  work("storm_pipe", "storm_pipe_layered_backfill", "Послойная обратная засыпка траншей дождевой канализации", "m3", (c) => c.pipeLength * 1.65, "Объём после вычета постели и обсыпки."),
  work("storm_pipe", "storm_pipe_backfill_compaction", "Уплотнение обратной засыпки дождевой канализации", "m3", (c) => c.pipeLength * 1.65, "Контролируемое послойное уплотнение."),
  work("storm_pipe", "storm_pipe_flushing", "Промывка труб дождевой канализации", "m", (c) => c.pipeLength, "Промывка перед приёмкой."),
  work("storm_pipe", "storm_pipe_cctv_inspection", "Телеинспекция труб дождевой канализации", "m", (c) => c.pipeLength, "Предварительно включена для проверки построенной сети."),
  test("storm_pipe", "storm_pipe_hydraulic_test", "Гидравлическое испытание дождевой канализации", (c) => count(c.pipeLength / 500), "Число участков заменяется программой испытаний."),

  // Колодцы четырёх назначений и их физические компоненты.
  material("storm_well", "storm_well_bottom", "Днище колодца дождевой канализации", "pcs", (c) => c.wellCount, "Сборное или монолитное решение по проекту."),
  material("storm_well", "storm_well_inspection_body", "Стеновые элементы смотрового колодца", "pcs", (c) => count(c.wellCount * 0.6), "Смотровые колодцы выделены отдельным типом."),
  material("storm_well", "storm_well_turning_body", "Стеновые элементы поворотного колодца", "pcs", (c) => count(c.wellCount * 0.2), "Поворотные колодцы выделены отдельным типом."),
  material("storm_well", "storm_well_drop_body", "Стеновые элементы перепадного колодца", "pcs", (c) => count(c.wellCount * 0.1), "Перепадные колодцы выделены отдельным типом."),
  material("storm_well", "storm_well_receiving_body", "Стеновые элементы приёмного колодца", "pcs", (c) => count(c.wellCount * 0.1), "Приёмные колодцы выделены отдельным типом."),
  material("storm_well", "storm_well_cover_slab", "Плита перекрытия колодца дождевой канализации", "pcs", (c) => c.wellCount, "Нагрузка и отверстие уточняются проектом."),
  material("storm_well", "storm_well_neck", "Горловина колодца дождевой канализации", "pcs", (c) => c.wellCount, "Высота регулируется по проектным отметкам."),
  material("storm_well", "storm_well_manhole_cover", "Люк колодца проектного класса нагрузки", "pcs", (c) => c.wellCount, "Класс нагрузки соответствует месту установки."),
  material("storm_well", "storm_well_support_ring", "Опорное кольцо люка колодца", "pcs", (c) => c.wellCount, "Опорное кольцо под раму люка."),
  material("storm_well", "storm_well_ladder_steps", "Лестничные скобы колодца", "pcs", (c) => c.wellCount * 8, "Предварительно восемь скоб на колодец."),
  material("storm_well", "storm_well_reinforcement", "Арматура колодцев дождевой канализации", "kg", (c) => c.wellCount * 55, "Предварительный расход заменяется рабочими чертежами."),
  material("storm_well", "storm_well_concrete", "Бетон колодцев дождевой канализации", "m3", (c) => c.wellCount * 0.65, "Монолитные части и замоноличивание узлов."),
  material("storm_well", "storm_well_mortar", "Раствор монтажных швов колодцев", "m3", (c) => c.wellCount * 0.08, "Предварительный расход на монтажные швы."),
  material("storm_well", "storm_well_waterproofing", "Гидроизоляция колодцев дождевой канализации", "m2", (c) => c.wellCount * 12, "Предварительная площадь наружной обработки."),
  material("storm_well", "storm_well_joint_sealant", "Герметик стыков колодцев дождевой канализации", "kg", (c) => c.wellCount * 4, "Герметизация сборных стыков."),
  material("storm_well", "storm_well_sealing_collars", "Уплотнительные манжеты вводов колодцев", "pcs", (c) => c.wellCount * 3, "Предварительно три трубных ввода на колодец."),
  material("storm_well", "storm_well_crushed_base", "Щебёночная подготовка колодцев", "m3", (c) => c.wellCount * 0.35, "Предварительный объём подготовки."),
  material("storm_well", "storm_well_sand_base", "Песчаная подготовка колодцев", "m3", (c) => c.wellCount * 0.25, "Предварительный объём подготовки."),
  work("storm_well", "storm_well_excavation", "Разработка котлованов колодцев", "m3", (c) => c.wellCount * 12, "Предварительный объём котлована 12 м³ на колодец."),
  work("storm_well", "storm_well_base_installation", "Устройство оснований колодцев", "pcs", (c) => c.wellCount, "Подготовка и устройство основания каждого колодца."),
  work("storm_well", "storm_well_body_installation", "Монтаж или бетонирование колодцев", "pcs", (c) => c.wellCount, "Монтаж сборных элементов или монолитное бетонирование."),
  work("storm_well", "storm_well_pipe_connection", "Подключение труб к колодцам", "pcs", (c) => c.wellCount * 3, "Герметизация каждого ввода."),
  work("storm_well", "storm_well_waterproofing_work", "Гидроизоляция колодцев", "m2", (c) => c.wellCount * 12, "Наружная гидроизоляция."),
  work("storm_well", "storm_well_cover_installation", "Установка люков колодцев", "pcs", (c) => c.wellCount, "Монтаж рамы и люка."),
  work("storm_well", "storm_well_elevation_adjustment", "Регулировка высотных отметок люков", "pcs", (c) => c.wellCount, "Выверка под проектную поверхность."),
  work("storm_well", "storm_well_backfill", "Обратная засыпка колодцев", "m3", (c) => c.wellCount * 8, "Послойная засыпка пазух."),
  work("storm_well", "storm_well_compaction", "Уплотнение обратной засыпки колодцев", "m3", (c) => c.wellCount * 8, "Послойное уплотнение."),
  test("storm_well", "storm_well_test", "Испытание колодцев дождевой канализации", (c) => c.wellCount, "Осмотр герметичности и работоспособности каждого колодца."),

  // Разметка: материалы и каждый физический вид нанесения разделены.
  material("marking", "marking_road_paint", "Дорожная краска для разметки", "kg", (c) => c.markingArea * 0.12, "Предварительно применяется для временных и локальных постоянных линий; тип уточняется ПОДД."),
  material("marking", "marking_thermoplastic", "Термопластик дорожной разметки", "kg", (c) => c.markingArea * c.markingRate, "Расход и вид материала доступны для уточнения."),
  material("marking", "marking_cold_plastic", "Холодный пластик дорожной разметки", "kg", (c) => c.markingArea * 0.08, "Предварительно для символов и локальных элементов."),
  material("marking", "marking_primer", "Грунтовочный состав дорожной разметки", "l", (c) => c.markingArea * 0.12, "Расход уточняется системой материала."),
  material("marking", "marking_glass_beads", "Световозвращающие стеклошарики дорожной разметки", "kg", (c) => c.markingArea * c.markingBeadsRate, "Расход доступен для уточнения."),
  material("marking", "marking_cleaner", "Растворитель и очиститель для дорожной разметки", "l", (c) => c.markingArea * 0.025, "Технологический расход на очистку оборудования и поверхности."),
  material("marking", "marking_stencil_material", "Шаблонный материал дорожной разметки", "m2", (c) => c.markingArea * 0.03, "Для стрел, символов и специальных элементов."),
  material("marking", "marking_masking_material", "Маскирующий материал дорожной разметки", "m", (c) => c.markingArea * 0.08, "Лента и защитные материалы для границ линий и символов."),
  material("marking", "marking_temporary_tape", "Временная разметочная лента", "m", (c) => c.length * 0.1, "Предварительный объём временной организации работ."),
  work("marking", "marking_surface_cleaning", "Очистка поверхности перед дорожной разметкой", "m2", (c) => c.markingArea, "Очистка всей площади нанесения."),
  work("marking", "marking_prelayout", "Предварительная разбивка дорожной разметки", "m2", (c) => c.markingArea, "Перенос схемы организации движения."),
  work("marking", "marking_longitudinal", "Нанесение продольной дорожной разметки", "m2", (c) => c.markingArea * 0.55, "Сплошные и прерывистые линии учитываются предварительным коэффициентом."),
  work("marking", "marking_transverse", "Нанесение поперечной дорожной разметки", "m2", (c) => c.markingArea * 0.08, "Поперечные линии выделены отдельно."),
  work("marking", "marking_stop_lines", "Нанесение стоп-линий", "m2", (c) => c.markingArea * 0.05, "Стоп-линии выделены отдельно."),
  work("marking", "marking_crosswalks", "Нанесение пешеходных переходов", "m2", (c) => c.markingArea * 0.12, "Пешеходные переходы выделены отдельно."),
  work("marking", "marking_arrows_symbols", "Нанесение стрел и дорожных символов", "m2", (c) => c.markingArea * 0.08, "Стрелы и символы выделены отдельно."),
  work("marking", "marking_parking", "Нанесение парковочной разметки", "m2", (c) => c.markingArea * 0.04, "Парковочные места выделены отдельно."),
  work("marking", "marking_safety_islands", "Нанесение разметки островков безопасности", "m2", (c) => c.markingArea * 0.08, "Островки безопасности выделены отдельно."),
  work("marking", "marking_glass_bead_application", "Нанесение световозвращающих стеклошариков", "m2", (c) => c.markingArea, "Нанесение по всей площади основной разметки."),
  service("marking", "marking_work_zone_protection", "Ограждение зоны нанесения дорожной разметки", () => 1, "Одна организация безопасной зоны на объект."),
  test("marking", "marking_quality_control", "Контроль толщины и световозвращения дорожной разметки", (c) => count(c.markingArea / 250), "Частота уточняется программой контроля."),
  machinery("marking", "marking_machine", "Разметочная машина", (c) => c.markingArea / 120),
  machinery("marking", "marking_surface_compressor", "Компрессор и очистительная техника для разметки", (c) => c.markingArea / 300),
  machinery("marking", "marking_escort_vehicle", "Машина сопровождения разметочных работ", (c) => c.length / 20),

  // Дорожные знаки: типы щитов и крепёж показаны раздельно; фундамент имеет своего владельца ниже.
  material("sign", "sign_warning_panel", "Щит предупреждающего дорожного знака типоразмера II", "pcs", (c) => count(c.signCount * 0.2), "Отдельная строка типа и размера; конкретные номера распределяются утверждённым ПОДД."),
  material("sign", "sign_priority_panel", "Щит дорожного знака приоритета типоразмера II", "pcs", (c) => count(c.signCount * 0.15), "Отдельная строка типа и размера; номер знака заменяется ПОДД."),
  material("sign", "sign_prohibitory_panel", "Щит запрещающего дорожного знака типоразмера II", "pcs", (c) => count(c.signCount * 0.2), "Отдельная строка типа и размера; номер знака заменяется ПОДД."),
  material("sign", "sign_mandatory_panel", "Щит предписывающего дорожного знака типоразмера II", "pcs", (c) => count(c.signCount * 0.15), "Отдельная строка типа и размера; номер знака заменяется ПОДД."),
  material("sign", "sign_information_panel", "Щит информационного дорожного знака типоразмера II", "pcs", (c) => count(c.signCount * 0.2), "Отдельная строка типа и размера; номер знака заменяется ПОДД."),
  material("sign", "sign_direction_panel", "Щит указательного дорожного знака типоразмера II", "pcs", (c) => count(c.signCount * 0.1), "Отдельная строка типа и размера; надпись и номер заменяются ПОДД."),
  material("sign", "sign_reflective_film", "Световозвращающая плёнка дорожных знаков", "m2", (c) => c.signCount * 0.9, "Класс плёнки уточняется ПОДД."),
  material("sign", "sign_post", "Стойка дорожного знака", "pcs", (c) => count(c.signCount * 0.8), "Число опор меньше числа щитов при совместной установке."),
  material("sign", "sign_console_support", "Консольная опора дорожного знака", "pcs", (c) => count(c.signCount * 0.1), "Предварительно для крупных и выносных щитов."),
  material("sign", "sign_clamps", "Хомуты крепления дорожных знаков", "pcs", (c) => c.signCount * 2, "Отдельный владелец крепежа знаков."),
  material("sign", "sign_brackets", "Кронштейны крепления дорожных знаков", "pcs", (c) => c.signCount * 2, "Отдельный владелец крепежа знаков."),
  material("sign", "sign_bolts", "Болты крепления дорожных знаков", "pcs", (c) => c.signCount * 8, "Не используются другими сборками."),
  material("sign", "sign_nuts", "Гайки крепления дорожных знаков", "pcs", (c) => c.signCount * 8, "Не используются другими сборками."),
  material("sign", "sign_washers", "Шайбы крепления дорожных знаков", "pcs", (c) => c.signCount * 16, "Не используются другими сборками."),
  material("sign", "sign_anticorrosion_coating", "Антикоррозионное покрытие опор дорожных знаков", "kg", (c) => c.signCount * 0.6, "Расход уточняется системой покрытия."),
  material("sign", "sign_protective_caps", "Защитные колпачки крепежа дорожных знаков", "pcs", (c) => c.signCount * 4, "Защита открытого крепежа."),
  material("sign", "sign_reflectors", "Световозвращатели дорожных знаков", "pcs", (c) => c.signCount * 2, "Дополнительные отражатели предварительно включены."),
  work("sign", "sign_setting_out", "Разбивка мест установки дорожных знаков", "pcs", (c) => c.signCount, "Разбивка по предварительной схеме."),
  work("sign", "sign_excavation_drilling", "Бурение и разработка котлованов опор знаков", "pcs", (c) => count(c.signCount * 0.9), "По числу опор, а не щитов."),
  work("sign", "sign_reinforcement_installation", "Армирование фундаментов дорожных знаков", "pcs", (c) => count(c.signCount * 0.9), "По числу опор."),
  work("sign", "sign_foundation_concreting", "Бетонирование фундаментов дорожных знаков", "m3", (c) => count(c.signCount * 0.9) * 0.45, "Предварительный объём 0,45 м³ на опору."),
  work("sign", "sign_post_installation", "Установка стоек дорожных знаков", "pcs", (c) => count(c.signCount * 0.8), "Монтаж стоек по отметкам."),
  work("sign", "sign_panel_installation", "Монтаж щитов дорожных знаков", "pcs", (c) => c.signCount, "Каждый щит учитывается отдельным физическим объёмом."),
  work("sign", "sign_orientation_adjustment", "Регулировка ориентации дорожных знаков", "pcs", (c) => c.signCount, "Настройка видимости и угла."),
  work("sign", "sign_visibility_control", "Контроль высоты и видимости дорожных знаков", "pcs", (c) => c.signCount, "Приёмочный контроль каждого щита."),

  material("sign_foundation", "sign_foundation_concrete", "Бетон фундаментов дорожных знаков", "m3", (c) => count(c.signCount * 0.9) * 0.45, "Владелец бетона фундаментов знаков."),
  material("sign_foundation", "sign_foundation_rebar", "Арматура фундаментов дорожных знаков", "kg", (c) => count(c.signCount * 0.9) * 38, "Предварительный расход 38 кг на опору."),
  material("sign_foundation", "sign_foundation_anchor_bolts", "Анкерные болты фундаментов дорожных знаков", "pcs", (c) => count(c.signCount * 0.9) * 4, "Единственный владелец анкерных болтов опор знаков."),
  material("sign_foundation", "sign_foundation_embedded_plate", "Закладные детали фундаментов дорожных знаков", "pcs", (c) => count(c.signCount * 0.9), "Одна закладная деталь на опору."),
  material("sign_foundation", "sign_foundation_crushed_base", "Щебёночная подготовка фундаментов дорожных знаков", "m3", (c) => count(c.signCount * 0.9) * 0.12, "Предварительный объём на опору."),
  material("sign_foundation", "sign_foundation_sand_base", "Песчаная подготовка фундаментов дорожных знаков", "m3", (c) => count(c.signCount * 0.9) * 0.08, "Предварительный объём на опору."),
  material("sign_foundation", "sign_foundation_formwork", "Опалубка фундаментов дорожных знаков", "m2", (c) => count(c.signCount * 0.9) * 2.2, "Предварительная контактная площадь."),
  material("sign_foundation", "sign_foundation_waterproofing", "Гидроизоляционная защита фундаментов дорожных знаков", "m2", (c) => count(c.signCount * 0.9) * 1.8, "Предварительная площадь защитной обработки."),

  // Барьерное ограждение.
  material("barrier", "barrier_galvanized_beam", "Оцинкованная балка барьерного ограждения", "m", (c) => c.barrierLength, "Профиль, уровень удержания и класс цинкования уточняются проектом."),
  material("barrier", "barrier_post", "Стойка барьерного ограждения", "pcs", (c) => count(c.barrierLength / 2), "Предварительный шаг стоек 2 м."),
  material("barrier", "barrier_spacer_console", "Консоль-распорка барьерного ограждения", "pcs", (c) => count(c.barrierLength / 2), "Одна консоль на стойку."),
  material("barrier", "barrier_energy_absorber", "Амортизирующий элемент барьерного ограждения", "pcs", (c) => count(c.barrierLength / 4), "Предварительный шаг заменяется системой производителя."),
  material("barrier", "barrier_start_element", "Начальный элемент барьерного ограждения", "pcs", () => 4, "По одному на начало каждого предварительного участка."),
  material("barrier", "barrier_end_element", "Конечный элемент барьерного ограждения", "pcs", () => 4, "По одному на конец каждого предварительного участка."),
  material("barrier", "barrier_transition_element", "Переходной элемент барьерного ограждения", "pcs", () => 4, "Для предварительных сопряжений участков."),
  material("barrier", "barrier_reflector", "Световозвращающий элемент барьерного ограждения", "pcs", (c) => count(c.barrierLength / 4), "Шаг уточняется проектом безопасности."),
  material("barrier", "barrier_bolts", "Болты барьерного ограждения", "pcs", (c) => count(c.barrierLength / 2) * 8, "Единственный владелец болтов барьерной системы."),
  material("barrier", "barrier_nuts", "Гайки барьерного ограждения", "pcs", (c) => count(c.barrierLength / 2) * 8, "Единственный владелец гаек барьерной системы."),
  material("barrier", "barrier_washers", "Шайбы барьерного ограждения", "pcs", (c) => count(c.barrierLength / 2) * 16, "Единственный владелец шайб барьерной системы."),
  material("barrier", "barrier_anchor_elements", "Анкерные элементы барьерного ограждения", "pcs", (c) => count(c.barrierLength / 20), "Для закрепляемых проектом участков."),
  material("barrier", "barrier_tension_cable", "Стальной трос барьерного ограждения", "m", (c) => c.barrierLength, "Предварительно включён как открытое допущение выбранной системы."),
  material("barrier", "barrier_foundation_concrete", "Бетон фундаментов барьерного ограждения", "m3", (c) => c.barrierLength * 0.015, "Применимость заменяется конструкцией выбранной системы."),
  material("barrier", "barrier_protective_coating", "Защитное покрытие элементов барьерного ограждения", "kg", (c) => c.barrierLength * 0.12, "Для повреждённых и неоцинкованных поверхностей."),
  work("barrier", "barrier_setting_out", "Разбивка линии барьерного ограждения", "m", (c) => c.barrierLength, "Разбивка по проекту безопасности."),
  work("barrier", "barrier_drilling", "Бурение отверстий под стойки барьерного ограждения", "pcs", (c) => count(c.barrierLength / 2), "По числу стоек."),
  work("barrier", "barrier_post_installation", "Установка стоек барьерного ограждения", "pcs", (c) => count(c.barrierLength / 2), "Монтаж с контролем шага и глубины."),
  work("barrier", "barrier_beam_installation", "Монтаж балок барьерного ограждения", "m", (c) => c.barrierLength, "Монтаж балок и нахлёстов."),
  work("barrier", "barrier_console_installation", "Монтаж консолей барьерного ограждения", "pcs", (c) => count(c.barrierLength / 2), "По числу стоек."),
  work("barrier", "barrier_terminal_installation", "Монтаж начальных и конечных элементов ограждения", "pcs", () => 8, "Начальные и конечные элементы всех участков."),
  work("barrier", "barrier_fastener_tightening", "Затяжка крепежа барьерного ограждения", "pcs", (c) => count(c.barrierLength / 2) * 8, "Контролируемая затяжка соединений."),
  work("barrier", "barrier_reflector_installation", "Установка отражателей барьерного ограждения", "pcs", (c) => count(c.barrierLength / 4), "Монтаж всех отражателей."),
  work("barrier", "barrier_geometry_control", "Контроль высоты и шага барьерного ограждения", "m", (c) => c.barrierLength, "Исполнительный контроль геометрии."),
  test("barrier", "barrier_acceptance_test", "Испытание и приёмка барьерного ограждения", (c) => count(c.barrierLength / 500), "Приёмочные участки уточняются программой контроля."),

  // Наружное освещение: физические материалы, оборудование, автоматика и заземление разделены.
  equipment("lighting", "lighting_pole", "Опора дорожного освещения", "pcs", (c) => c.poleCount, "Высота, ветровой район и покрытие уточняются светотехническим проектом."),
  material("lighting", "lighting_bracket", "Кронштейн дорожного светильника", "pcs", (c) => c.poleCount, "Вылет и угол уточняются расчётом."),
  equipment("lighting", "lighting_led_luminaire", "Светодиодный дорожный светильник", "pcs", (c) => c.poleCount, "Мощность указана открытым допущением; КСС и световой поток уточняются расчётом."),
  equipment("lighting", "lighting_driver", "Драйвер светодиодного дорожного светильника", "pcs", (c) => c.poleCount, "Совместим со светильником и системой управления."),
  material("lighting", "lighting_pole_foundation", "Фундамент опоры дорожного освещения", "pcs", (c) => c.poleCount, "Типоразмер уточняется расчётом основания."),
  material("lighting", "lighting_anchor_block", "Анкерный блок опоры дорожного освещения", "pcs", (c) => c.poleCount, "Единственный владелец анкерной группы опоры."),
  material("lighting", "lighting_embedded_part", "Закладная деталь опоры дорожного освещения", "pcs", (c) => c.poleCount, "Совместима с опорой и фундаментом."),
  material("lighting", "lighting_foundation_rebar", "Арматура фундаментов опор освещения", "kg", (c) => c.poleCount * 55, "Предварительный расход 55 кг на опору."),
  material("lighting", "lighting_foundation_concrete", "Бетон фундаментов опор освещения", "m3", (c) => c.poleCount * 1.1, "Предварительный объём 1,1 м³ на опору."),
  material("lighting", "lighting_power_cable", "Кабель питания дорожного освещения", "m", (c) => c.cableLength, "Марка и сечение уточняются электрическим расчётом."),
  material("lighting", "lighting_protective_duct", "Защитная труба кабеля дорожного освещения", "m", (c) => c.cableLength, "Диаметр и материал уточняются проектом."),
  material("lighting", "lighting_cable_channel", "Кабельный канал дорожного освещения", "m", (c) => c.cableLength * 0.05, "Предварительно для открытых и сооружённых участков."),
  material("lighting", "lighting_joint_coupling", "Соединительная кабельная муфта освещения", "pcs", (c) => count(c.cableLength / 250), "Отдельный владелец соединителей кабеля."),
  material("lighting", "lighting_branch_coupling", "Ответвительная кабельная муфта освещения", "pcs", (c) => c.poleCount, "Одна точка ответвления на опору."),
  material("lighting", "lighting_terminal_blocks", "Клеммные колодки опор освещения", "pcs", (c) => c.poleCount * 2, "По две колодки на опору."),
  equipment("lighting", "lighting_distribution_box", "Распределительная коробка дорожного освещения", "pcs", (c) => c.poleCount, "Коробка требуемой степени защиты."),
  equipment("lighting", "lighting_control_cabinet", "Шкаф управления дорожным освещением", "pcs", (c) => c.cabinetCount, "Компоновка и степень защиты уточняются проектом."),
  equipment("lighting", "lighting_circuit_breakers", "Автоматические выключатели шкафа освещения", "pcs", (c) => c.cabinetCount * 8, "Номиналы уточняются расчётом токов."),
  equipment("lighting", "lighting_contactor", "Контактор управления дорожным освещением", "pcs", (c) => c.cabinetCount * 2, "По два контактора на шкаф предварительно."),
  equipment("lighting", "lighting_photo_timer", "Астрономический таймер с фотореле освещения", "pcs", (c) => c.cabinetCount, "Один контроллер на шкаф."),
  equipment("lighting", "lighting_surge_protection", "Устройство защиты от перенапряжений освещения", "pcs", (c) => c.cabinetCount * 2, "Ступень защиты уточняется проектом."),
  equipment("lighting", "lighting_rcd", "Устройство защитного отключения освещения", "pcs", (c) => c.cabinetCount * 4, "Предварительное число групповых устройств."),
  equipment("lighting", "lighting_meter", "Счётчик электроэнергии дорожного освещения", "pcs", (c) => c.cabinetCount, "Включён как открытое допущение границы поставки."),
  material("lighting", "lighting_ground_conductor", "Заземляющий проводник дорожного освещения", "m", (c) => c.cableLength, "Сечение уточняется расчётом защитного проводника."),
  material("lighting", "lighting_ground_electrodes", "Заземляющие электроды дорожного освещения", "pcs", (c) => c.cabinetCount * 3, "Предварительно три электрода на контур шкафа."),
  material("lighting", "lighting_ground_strip", "Стальная полоса заземления дорожного освещения", "m", (c) => c.cabinetCount * 30, "Предварительно 30 м на контур."),
  material("lighting", "lighting_cable_lugs", "Кабельные наконечники дорожного освещения", "pcs", (c) => c.poleCount * 6, "Отдельные наконечники для подключений."),
  material("lighting", "lighting_cable_markers", "Маркировка кабелей дорожного освещения", "pcs", (c) => c.poleCount * 4, "Маркировка концов и ответвлений."),
  material("lighting", "lighting_warning_tape", "Сигнальная лента кабельной трассы освещения", "m", (c) => c.cableLength, "Укладка над кабельной трассой."),
  material("lighting", "lighting_cable_bedding_sand", "Песок кабельной постели дорожного освещения", "m3", (c) => c.cableLength * 0.12, "Предварительное сечение постели и присыпки 0,12 м²."),
  material("lighting", "lighting_foundation_crushed_stone", "Щебень подготовки фундаментов освещения", "m3", (c) => c.poleCount * 0.25, "Предварительный объём 0,25 м³ на опору."),
  material("lighting", "lighting_cable_manhole", "Кабельный колодец дорожного освещения", "pcs", (c) => count(c.cableLength / 300), "Шаг уточняется трассой и точками поворота."),
  material("lighting", "lighting_luminaire_fasteners", "Крепёж дорожных светильников", "pcs", (c) => c.poleCount * 4, "Единственный владелец крепежа светильников."),
  material("lighting", "lighting_pole_bolts", "Болты соединений опор освещения", "pcs", (c) => c.poleCount * 8, "Не дублируют анкерный блок фундамента."),
  material("lighting", "lighting_pole_nuts", "Гайки соединений опор освещения", "pcs", (c) => c.poleCount * 8, "Не дублируют анкерный блок фундамента."),
  material("lighting", "lighting_pole_washers", "Шайбы соединений опор освещения", "pcs", (c) => c.poleCount * 16, "Не дублируют анкерный блок фундамента."),
  material("lighting", "lighting_cabinet_fasteners", "Крепёж шкафов управления освещением", "pcs", (c) => c.cabinetCount * 8, "Единственный владелец крепежа шкафов."),
  material("lighting", "lighting_anticorrosion_material", "Антикоррозионный материал опор освещения", "kg", (c) => c.poleCount * 0.5, "Для защиты монтажных повреждений."),
  service("lighting", "lighting_design_service", "Светотехнический расчёт дорожного освещения", () => 1, "Предварительная отдельная инженерная услуга."),
  work("lighting", "lighting_pole_setting_out", "Разбивка мест установки опор освещения", "pcs", (c) => c.poleCount, "По предварительному шагу опор."),
  work("lighting", "lighting_foundation_excavation", "Разработка котлованов фундаментов освещения", "m3", (c) => c.poleCount * 4, "Предварительный объём 4 м³ на опору."),
  work("lighting", "lighting_foundation_installation", "Устройство фундаментов опор освещения", "pcs", (c) => c.poleCount, "Бетонирование и монтаж закладных."),
  work("lighting", "lighting_pole_installation", "Монтаж опор дорожного освещения", "pcs", (c) => c.poleCount, "Монтаж и выверка опор."),
  work("lighting", "lighting_bracket_installation", "Монтаж кронштейнов дорожного освещения", "pcs", (c) => c.poleCount, "Монтаж по проектному углу."),
  work("lighting", "lighting_luminaire_installation", "Монтаж дорожных светильников", "pcs", (c) => c.poleCount, "Монтаж и подключение светильников."),
  work("lighting", "lighting_cable_trench_excavation", "Разработка кабельных траншей освещения", "m3", (c) => c.cableLength * 0.8, "Предварительная площадь сечения траншеи 0,8 м²."),
  work("lighting", "lighting_sand_bedding_installation", "Устройство песчаной постели кабеля освещения", "m3", (c) => c.cableLength * 0.12, "Постель и защитная присыпка."),
  work("lighting", "lighting_duct_installation", "Прокладка защитных труб кабеля освещения", "m", (c) => c.cableLength, "Прокладка по кабельной трассе."),
  work("lighting", "lighting_cable_laying", "Прокладка кабеля дорожного освещения", "m", (c) => c.cableLength, "Прокладка с маркировкой и запасами по проекту."),
  work("lighting", "lighting_cabinet_installation", "Монтаж шкафов управления освещением", "pcs", (c) => c.cabinetCount, "Установка и закрепление шкафов."),
  work("lighting", "lighting_automation_installation", "Монтаж автоматики управления освещением", "pcs", (c) => c.cabinetCount, "Монтаж защитных и управляющих аппаратов."),
  work("lighting", "lighting_grounding_installation", "Устройство заземления дорожного освещения", "pcs", (c) => c.cabinetCount, "Монтаж и соединение контуров."),
  work("lighting", "lighting_connection", "Электрическое подключение дорожного освещения", "pcs", (c) => c.poleCount, "Подключение каждой опоры и шкафа."),
  test("lighting", "lighting_insulation_test", "Измерение сопротивления изоляции сети освещения", (c) => c.cabinetCount * 4, "По предварительному числу отходящих групп."),
  test("lighting", "lighting_ground_resistance_test", "Измерение сопротивления заземления освещения", (c) => c.cabinetCount, "По одному измерению на контур."),
  test("lighting", "lighting_functional_test", "Функциональное испытание дорожного освещения", (c) => c.cabinetCount, "Проверка всех режимов управления."),
  service("lighting", "lighting_commissioning", "Пусконаладка дорожного освещения", () => 1, "Одна пусконаладочная услуга на систему."),
  { group: "lighting", id: "lighting_execution_documentation", name: "Исполнительная документация дорожного освещения", unit: "document", quantity: () => 1, category: "documentation", detail: "Исполнительные схемы, протоколы и паспорта системы." },
  machinery("lighting", "lighting_excavator", "Экскаватор для котлованов и кабельных траншей освещения", (c) => (c.poleCount * 4 + c.cableLength * 0.8) / 35),
  machinery("lighting", "lighting_drilling_rig", "Буровая установка для фундаментов опор освещения", (c) => c.poleCount / 6),
  machinery("lighting", "lighting_mobile_crane", "Автокран для монтажа опор освещения", (c) => c.poleCount / 4),
  machinery("lighting", "lighting_aerial_platform", "Автовышка для монтажа светильников", (c) => c.poleCount / 5),
  machinery("lighting", "lighting_cable_laying_machine", "Кабелеукладочная техника дорожного освещения", (c) => c.cableLength / 200),
  machinery("lighting", "lighting_electrical_laboratory", "Передвижная электротехническая лаборатория", (c) => c.cabinetCount * 8),

  // Явные труд, логистика, контроль и документы для каждой инфраструктурной сборки.
  { group: "curb", id: "curb_workers", name: "Труд рабочих по устройству бортового камня", unit: "man_hour", quantity: (c) => c.curbLength / 2.5, category: "labor", detail: "Предварительная производительность 2,5 м/чел.-ч." },
  { group: "drainage", id: "drainage_workers", name: "Труд рабочих по устройству линейного водоотвода", unit: "man_hour", quantity: (c) => c.drainageLength / 2, category: "labor", detail: "Предварительная производительность 2 м/чел.-ч." },
  { group: "storm_inlet", id: "storm_inlet_workers", name: "Труд рабочих по монтажу дождеприёмников", unit: "man_hour", quantity: (c) => c.inletCount * 14, category: "labor", detail: "Предварительно 14 чел.-ч на узел." },
  { group: "storm_pipe", id: "storm_pipe_workers", name: "Труд рабочих по устройству дождевой канализации", unit: "man_hour", quantity: (c) => c.pipeLength / 1.5, category: "labor", detail: "Предварительная производительность 1,5 м/чел.-ч." },
  { group: "storm_well", id: "storm_well_workers", name: "Труд рабочих по устройству колодцев", unit: "man_hour", quantity: (c) => c.wellCount * 32, category: "labor", detail: "Предварительно 32 чел.-ч на колодец." },
  { group: "marking", id: "marking_workers", name: "Труд рабочих по нанесению дорожной разметки", unit: "man_hour", quantity: (c) => c.markingArea / 18, category: "labor", detail: "Предварительная производительность 18 м²/чел.-ч." },
  { group: "sign", id: "sign_workers", name: "Труд рабочих по установке дорожных знаков", unit: "man_hour", quantity: (c) => c.signCount * 8, category: "labor", detail: "Предварительно 8 чел.-ч на щит с учётом опор." },
  { group: "barrier", id: "barrier_workers", name: "Труд рабочих по монтажу барьерного ограждения", unit: "man_hour", quantity: (c) => c.barrierLength / 1.8, category: "labor", detail: "Предварительная производительность 1,8 м/чел.-ч." },
  { group: "lighting", id: "lighting_workers", name: "Труд монтажников наружного освещения", unit: "man_hour", quantity: (c) => c.poleCount * 18 + c.cableLength / 8, category: "labor", detail: "Открытый предварительный расчёт трудозатрат." },
  { group: "curb", id: "curb_material_delivery", name: "Доставка материалов бортового камня", unit: "trip", quantity: (c) => count(c.curbLength / 250), category: "transport", detail: "Рейсы уточняются поставщиками и грузоподъёмностью." },
  { group: "drainage", id: "drainage_material_delivery", name: "Доставка элементов линейного водоотвода", unit: "trip", quantity: (c) => count(c.drainageLength / 200), category: "transport", detail: "Предварительное число рейсов." },
  { group: "storm_inlet", id: "storm_inlet_delivery", name: "Доставка дождеприёмных узлов", unit: "trip", quantity: (c) => count(c.inletCount / 8), category: "transport", detail: "Предварительное число рейсов." },
  { group: "storm_pipe", id: "storm_pipe_delivery", name: "Доставка труб и фитингов дождевой канализации", unit: "trip", quantity: (c) => count(c.pipeLength / 300), category: "transport", detail: "Предварительное число рейсов." },
  { group: "storm_well", id: "storm_well_delivery", name: "Доставка элементов колодцев дождевой канализации", unit: "trip", quantity: (c) => count(c.wellCount / 3), category: "transport", detail: "Предварительное число рейсов." },
  { group: "marking", id: "marking_material_delivery", name: "Доставка материалов дорожной разметки", unit: "trip", quantity: (c) => count(c.markingArea / 1000), category: "transport", detail: "Предварительное число рейсов." },
  { group: "sign", id: "sign_material_delivery", name: "Доставка дорожных знаков и опор", unit: "trip", quantity: (c) => count(c.signCount / 12), category: "transport", detail: "Предварительное число рейсов." },
  { group: "barrier", id: "barrier_material_delivery", name: "Доставка элементов барьерного ограждения", unit: "trip", quantity: (c) => count(c.barrierLength / 400), category: "transport", detail: "Предварительное число рейсов." },
  { group: "lighting", id: "lighting_material_delivery", name: "Доставка опор и оборудования дорожного освещения", unit: "trip", quantity: (c) => count(c.poleCount / 8), category: "transport", detail: "Предварительное число рейсов." },
  { group: "storm_pipe", id: "storm_sewer_laboratory_control", name: "Лабораторный контроль обратной засыпки дождевой канализации", unit: "test", quantity: (c) => count(c.pipeLength / 250), category: "testing", detail: "Частота заменяется программой контроля." },
  { group: "curb", id: "curb_execution_documentation", name: "Исполнительная схема бортового камня", unit: "document", quantity: () => 1, category: "documentation", detail: "Один комплект на объект." },
  { group: "drainage", id: "drainage_execution_documentation", name: "Исполнительная схема водоотвода и дождевой канализации", unit: "document", quantity: () => 1, category: "documentation", detail: "Один комплект на объект." },
  { group: "sign", id: "traffic_management_execution_documentation", name: "Исполнительная схема знаков, разметки и ограждения", unit: "document", quantity: () => 1, category: "documentation", detail: "Один комплект на объект." },
] as const;

export const FULL_ROAD_INFRASTRUCTURE_REQUIRED_ROW_IDS_V4 = SPECS.map((spec) => spec.id);

export const FULL_ROAD_INFRASTRUCTURE_ROW_IDS_BY_GROUP_V4: Readonly<Record<FullRoadInfrastructureGroupV4, string[]>> = Object.freeze(
  SPECS.reduce<Record<FullRoadInfrastructureGroupV4, string[]>>((result, spec) => {
    result[spec.group].push(spec.id);
    return result;
  }, {
    curb: [], drainage: [], storm_inlet: [], storm_pipe: [], storm_well: [], marking: [], sign: [], sign_foundation: [], barrier: [], lighting: [],
  }),
);

export const FULL_ROAD_INFRASTRUCTURE_MATERIAL_ROW_IDS_BY_GROUP_V4: Readonly<Record<FullRoadInfrastructureGroupV4, string[]>> = Object.freeze(
  SPECS.reduce<Record<FullRoadInfrastructureGroupV4, string[]>>((result, spec) => {
    if (spec.category === "material" || spec.category === "equipment") result[spec.group].push(spec.id);
    return result;
  }, {
    curb: [], drainage: [], storm_inlet: [], storm_pipe: [], storm_well: [], marking: [], sign: [], sign_foundation: [], barrier: [], lighting: [],
  }),
);

export const FULL_ROAD_INFRASTRUCTURE_FASTENER_OWNERSHIP_V4 = Object.freeze({
  curb_anchor_fasteners: "curb",
  drainage_grating_fasteners: "drainage",
  drainage_connectors: "drainage",
  storm_inlet_connection_fasteners: "storm_inlet",
  storm_pipe_couplings: "storm_pipe",
  sign_clamps: "sign",
  sign_brackets: "sign",
  sign_bolts: "sign",
  sign_nuts: "sign",
  sign_washers: "sign",
  sign_foundation_anchor_bolts: "sign_foundation",
  barrier_bolts: "barrier",
  barrier_nuts: "barrier",
  barrier_washers: "barrier",
  barrier_anchor_elements: "barrier",
  lighting_anchor_block: "lighting",
  lighting_luminaire_fasteners: "lighting",
  lighting_pole_bolts: "lighting",
  lighting_pole_nuts: "lighting",
  lighting_pole_washers: "lighting",
  lighting_cabinet_fasteners: "lighting",
} satisfies Record<string, FullRoadInfrastructureGroupV4>);

function numberValue(values: ReadonlyMap<string, unknown>, key: string, fallback: number): number {
  const raw = values.get(key);
  const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.replace(/\s+/gu, "").replace(",", ".")) : Number.NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function enabled(values: ReadonlyMap<string, unknown>, key: string): boolean {
  const raw = values.get(key);
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string" && /^(?:false|no|нет)$/iu.test(raw.trim())) return false;
  return true;
}

function buildContext(input: { area_m2: number; length_m: number | null; values: ReadonlyMap<string, unknown> }): Context {
  const length = input.length_m && input.length_m > 0 ? input.length_m : Math.sqrt(input.area_m2 * 4);
  const curbLength = numberValue(input.values, "curb_length_m", length * 2);
  const drainageLength = numberValue(input.values, "drainage_length_m", length * 2);
  const inletSpacing = numberValue(input.values, "storm_inlet_spacing_m", 50);
  const pipeLength = numberValue(input.values, "storm_pipe_length_m", length * 1.2);
  const wellSpacing = numberValue(input.values, "storm_well_spacing_m", 75);
  const markingArea = numberValue(input.values, "road_marking_area_m2", input.area_m2 * 0.03);
  const markingRate = numberValue(input.values, "road_marking_rate_kg_m2", 0.75);
  const markingBeadsRate = numberValue(input.values, "road_marking_beads_rate_kg_m2", 0.35);
  const signsPerKm = numberValue(input.values, "traffic_signs_per_km", 8);
  const signCount = numberValue(input.values, "traffic_signs_count", count((length / 1000) * signsPerKm));
  const barrierLength = numberValue(input.values, "guardrail_length_m", length * 0.3);
  const poleSpacing = numberValue(input.values, "lighting_pole_spacing_m", 35);
  const cableLength = numberValue(input.values, "lighting_cable_length_m", length * 2.2);
  const cabinetCount = numberValue(input.values, "lighting_cabinet_count", count(length / 2000));
  return {
    area: input.area_m2,
    length,
    curbLength,
    drainageLength,
    inletCount: count(drainageLength / inletSpacing),
    pipeLength,
    wellCount: count(pipeLength / wellSpacing),
    markingArea,
    markingRate,
    markingBeadsRate,
    signCount: count(signCount),
    barrierLength,
    poleCount: count(length / poleSpacing) * 2,
    cableLength,
    cabinetCount: count(cabinetCount),
    stormPipeDiameter: numberValue(input.values, "storm_pipe_diameter_mm", 400),
    luminairePower: numberValue(input.values, "lighting_luminaire_power_w", 120),
  };
}

function actionFor(category: BoqCategoryV4): string {
  if (category === "material" || category === "equipment") return "поставить";
  if (category === "labor") return "выполнить";
  if (category === "machinery") return "эксплуатировать";
  if (category === "transport") return "доставить";
  if (category === "testing") return "испытать";
  if (category === "documentation") return "оформить";
  return "выполнить";
}

export function buildAsphaltFullRoadInfrastructureAssemblyV4(input: {
  area_m2: number;
  length_m: number | null;
  values: ReadonlyMap<string, unknown>;
}): FullRoadInfrastructureLineV4[] {
  const context = buildContext(input);
  const enabledGroups = new Set<FullRoadInfrastructureGroupV4>([
    ...(enabled(input.values, "curb_required") ? ["curb" as const] : []),
    ...(enabled(input.values, "drainage_required") ? ["drainage" as const] : []),
    ...(enabled(input.values, "storm_sewer_required") ? ["storm_inlet" as const, "storm_pipe" as const, "storm_well" as const] : []),
    ...(enabled(input.values, "road_marking_required") ? ["marking" as const] : []),
    ...(enabled(input.values, "traffic_signs_required") ? ["sign" as const, "sign_foundation" as const] : []),
    ...(enabled(input.values, "guardrail_required") ? ["barrier" as const] : []),
    ...(enabled(input.values, "lighting_required") ? ["lighting" as const] : []),
  ]);
  return SPECS.filter((spec) => enabledGroups.has(spec.group)).map((spec) => {
    const category = spec.category ?? "material";
    const quantity = atLeast(spec.quantity(context));
    const inputKey = `${spec.id}_preliminary_quantity`;
    return {
      row_id: spec.id,
      wbs_code: GROUP_WBS[spec.group],
      section: GROUP_TITLE[spec.group],
      phase: spec.group,
      category,
      name_ru: spec.name,
      action: actionFor(category),
      action_object: spec.name.toLocaleLowerCase("ru-RU"),
      specification_ru: `${spec.detail ?? "Предварительная техническая спецификация."}${spec.id === "storm_pipe" ? ` Предварительный диаметр ${context.stormPipeDiameter} мм.` : ""}${spec.id === "lighting_led_luminaire" ? ` Предварительная мощность ${context.luminairePower} Вт.` : ""} Количество рассчитано профессиональной предварительной сборкой и подлежит замене проектными данными.`,
      unit_id: spec.unit,
      formula_id: `${spec.id}_formula_v1`,
      expression: inputKey,
      input_units: { [inputKey]: spec.unit },
      input_values: { [inputKey]: quantity },
      quantity,
      applicability: "scope_profile == NEW_FULL_ROAD_INFRASTRUCTURE",
      inclusion_reason_ru: `${GROUP_TITLE[spec.group]} включён в предварительную инфраструктурную сборку полного строительства дороги.`,
      exclusion_rule: "Изменить или исключить только явным уточнением пользователя либо подтверждённым проектом.",
      source_ids: [
        `engineering_assumption:full-road-infrastructure:v1:${spec.id}`,
        spec.group === "lighting" ? "eaeu_tr_ts_004_2011" : spec.group === "marking" || spec.group === "sign" || spec.group === "barrier" ? "eaeu_tr_ts_014_2011" : "kg_krer_2015_collection_27",
      ],
      price_key: spec.procurement ? `${spec.id}_project_spec` : null,
      procurement: spec.procurement === true,
      cost_ownership_id: `infra:${spec.group}:${spec.id}`,
      specification_status: "PRELIMINARY_ENGINEERING_ASSUMPTION",
    };
  });
}
