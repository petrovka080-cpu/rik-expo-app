import { GLOBAL_WORK_CATEGORIES, type GlobalWorkCategory } from "../globalEstimate";
import { normalizeDimensionText, resolveQuantityInputsFromPrompt } from "../constructionFormulas";
import { resolveEstimatorDomainSignature } from "./constructionDomainLexicon";
import { detectRegulatedConstructionWork } from "./detectRegulatedConstructionWork";
import type { EstimatorKernelComplexity, EstimatorReasoningPlan } from "./estimatorKernelTypes";
import { isParsableConstructionWork } from "./isParsableConstructionWork";

type WorkSignature = {
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

type QuantityInputs = ReturnType<typeof resolveQuantityInputsFromPrompt>;

function hasConcreteSurfaceObject(normalized: string): boolean {
  return /(плит[ауы]?|фундаментн[а-яё]*\s+плит|монолитн[а-яё]*\s+плит|стяжк|пол\s+по\s+грунт|отмостк|ростверк|ленточн[а-яё]*\s+фундамент|strip\s+foundation|slab|screed)/.test(normalized);
}

function hasConcretePedestalObject(normalized: string): boolean {
  if (hasConcreteSurfaceObject(normalized)) return false;
  const directPedestal =
    /(тумб|пьедестал|постамент|стакан[а-яё]*\s+фундамент|фундаментн[а-яё]*\s+стакан|foundation\s+socket|pedestal|postament|equipment\s+base)/.test(normalized);
  const supportBase =
    /(бетонн[а-яё]*\s+опор|опор[ауы]?\s+под\s+(стойк|колонн|навес|оборуд)|основан[а-яё]*\s+под\s+(оборуд|станк|стойк|колонн|навес)|отдельн[а-яё]*\s+бетонн[а-яё]*\s+основан)/.test(normalized);
  const countLike = /(\d+(?:\.\d+)?)\s*(?:шт|штук|pcs|pieces?)/.test(normalized);
  return directPedestal || (supportBase && countLike);
}

function signatureFor(text: string): WorkSignature | null {
  const normalized = normalizeDimensionText(text);
  if (/лифт|elevator/.test(normalized)) {
    return {
      workKey: "passenger_elevator_installation",
      titleRu: "Профессиональная предварительная смета на установку пассажирского лифта",
      category: "delivery_equipment",
      domain: "vertical_transport",
      object: "passenger_elevator",
      operation: "installation",
      method: "licensed_elevator_installation",
      materialSystem: "passenger_elevator_system",
      complexity: "complex",
      requiredMaterials: ["пассажирская кабина", "лебедка / привод", "станция управления", "двери шахты", "направляющие"],
      requiredLabor: ["обследование шахты", "монтаж направляющих", "монтаж кабины", "ПНР"],
      requiredEquipmentOrWarnings: ["такелаж", "измерительное оборудование", "только лицензированная организация"],
      requiredLogisticsOrWarnings: ["доставка оборудования", "подъем и складирование", "инспекция / сдача"],
      exclusions: ["строительные работы по шахте сверх обследования", "замена электропитания здания", "госпошлины и разрешения"],
      clarifyingQuestions: ["Какая грузоподъемность лифта?", "Какая скорость и количество остановок?", "Какие размеры шахты, приямка и верхнего зазора?"],
    };
  }
  if (/дренаж|drainage|лотк/.test(normalized) && !/подпор/.test(normalized)) {
    const englishDrainagePrimitive = /\bdrainage\b/i.test(text) && !/дренаж/i.test(text);
    return {
      workKey: englishDrainagePrimitive ? "world_drainage" : "drainage_channel_installation",
      titleRu: "Профессиональная предварительная смета на устройство дренажных каналов",
      category: "roadworks",
      domain: "drainage",
      object: "drainage_channel",
      operation: "installation",
      method: "length_based_drainage_channel",
      materialSystem: "drainage_channel_system",
      complexity: "infrastructure",
      requiredMaterials: ["геотекстиль", "песчаная подготовка", "щебеночное основание", "дренажные лотки / каналы", "решетки"],
      requiredLabor: ["разметка трассы", "проверка уклонов", "выемка грунта", "стыковка лотков"],
      requiredEquipmentOrWarnings: ["мини-экскаватор / ручная выемка", "виброплита", "проверка проливом"],
      requiredLogisticsOrWarnings: ["вывоз грунта", "доставка материалов"],
      exclusions: ["ливневая сеть за пределами подключения", "геодезический проект", "восстановление покрытия вне трассы"],
      clarifyingQuestions: ["Какая глубина и класс нагрузки лотков?", "Куда подключается выпуск?", "Какие уклоны и отметки заданы?"],
    };
  }
  if (/промышленн[а-яё]*\s+пол|industrial\s+floor|топпинг|бетонн[а-яё]*\s+пол/.test(normalized)) {
    return {
      workKey: "industrial_floor_concrete_system",
      titleRu: "Профессиональная предварительная смета на промышленный бетонный пол",
      category: "concrete",
      domain: "industrial_flooring",
      object: "industrial_floor",
      operation: "concrete_floor_installation",
      method: "industrial_concrete_floor_system",
      materialSystem: "industrial_floor_concrete_system",
      complexity: "complex",
      requiredMaterials: ["бетон", "арматурная сетка / фибра", "топпинг", "швы и герметик", "грунтовка / пропитка"],
      requiredLabor: ["обследование основания", "подготовка основания", "устройство бетонного пола", "нарезка швов", "контроль ровности"],
      requiredEquipmentOrWarnings: ["бетононасос / подача бетона", "виброрейка", "затирочные машины", "лазерный уровень"],
      requiredLogisticsOrWarnings: ["доставка бетона", "доставка топпинга", "вывоз отходов"],
      exclusions: ["Проект КЖ и расчет основания уточняются отдельно.", "Демонтаж старого пола не включен без явного запроса.", "Полимерное покрытие сверх топпинга считается отдельно."],
      clarifyingQuestions: ["Какая расчетная нагрузка на пол?", "Нужен топпинг, полимер или полировка?", "Есть ли требования по ровности, швам и пылеотделению?"],
    };
  }
  if (hasConcretePedestalObject(normalized) || (/бетон/.test(normalized) && !/колонн|column/.test(normalized) && !hasConcreteSurfaceObject(normalized) && /(0\.\d+\s*x|ширина|высота|длина)/.test(normalized))) {
    return {
      workKey: "concrete_pedestal_pour",
      titleRu: "Профессиональная предварительная смета на заливку бетонных тумб",
      category: "concrete",
      domain: "concrete",
      object: "concrete_pedestal",
      operation: "concrete_pour",
      method: "concrete_pedestal_pour",
      materialSystem: "concrete_rebar_formwork",
      complexity: "complex",
      requiredMaterials: ["бетон B20/B25", "арматурный каркас тумб", "опалубка тумб", "песчано-щебеночная подушка", "закладные детали / анкерные болты"],
      requiredLabor: ["разметка осей и мест установки тумб", "выемка грунта под отдельные тумбы", "уплотнение основания", "вязка арматуры", "бетонирование тумб"],
      requiredEquipmentOrWarnings: ["вибратор для бетона", "средство подачи бетона warning", "виброплита для основания"],
      requiredLogisticsOrWarnings: ["доставка бетона и материалов", "вывоз лишнего грунта при необходимости", "резерв на уточнение размеров"],
      exclusions: ["размеры тумб уточнить перед закупкой бетона и арматуры", "геология/несущая способность грунта не включена", "проект КЖ и расчет анкеров не включены"],
      clarifyingQuestions: ["Какой точный размер одной тумбы?", "Есть ли закладные/анкера и схема их расположения?", "Какая марка бетона и нагрузка от оборудования или стоек?"],
    };
  }
  if (/пожарн|апс|соуэ|fire\s+alarm/.test(normalized) && /сигнализац|датчик|оповещ|кабел|alarm|system/.test(normalized)) {
    return {
      workKey: "fire_alarm_installation",
      titleRu: "Профессиональная предварительная смета на монтаж пожарной сигнализации",
      category: "electrical",
      domain: "fire_alarm",
      object: "fire_alarm_system",
      operation: "installation",
      method: "regulated_fire_alarm_install",
      materialSystem: "fire_alarm_system",
      complexity: "complex",
      requiredMaterials: ["пожарные датчики", "прибор АПС", "кабель огнестойкий", "оповещатели", "резервное питание"],
      requiredLabor: ["проектная привязка warning", "прокладка кабеля", "монтаж датчиков", "монтаж оповещателей", "ПНР пожарной сигнализации"],
      requiredEquipmentOrWarnings: ["тестер линий", "лицензированный подрядчик", "измерение сопротивления линий"],
      requiredLogisticsOrWarnings: ["доставка оборудования", "маркировка линий", "исполнительная документация"],
      exclusions: ["проект АПС и согласования уточняются отдельно", "интеграция с существующей BMS включается после обследования", "огнезащита проходок считается по факту трасс"],
      clarifyingQuestions: ["Сколько помещений и датчиков нужно покрыть?", "Нужны ли СОУЭ, ручные извещатели и резервное питание?", "Есть ли проект АПС и требования инспекции?"],
    };
  }
  if (/слаботоч|интернет\s+кабел|структурированн[а-яё]*\s+кабельн[а-яё]*\s+сет|скс|utp|rj45|патч-панел|домофон|low\s+voltage|structured\s+cabling/.test(normalized)) {
    return {
      workKey: "low_voltage_cabling_installation",
      titleRu: "Профессиональная предварительная смета на слаботочные кабельные сети",
      category: "electrical",
      domain: "low_voltage",
      object: "low_voltage_system",
      operation: "installation",
      method: "low_voltage_cabling",
      materialSystem: "low_voltage_system",
      complexity: "medium",
      requiredMaterials: ["UTP кабель", "патч-панель", "розетки RJ45", "кабель-канал", "маркировка линий"],
      requiredLabor: ["разметка слаботочных трасс", "прокладка кабеля", "оконцевание линий", "тестирование сети"],
      requiredEquipmentOrWarnings: ["кабельный тестер", "обжимной инструмент", "тон-генератор"],
      requiredLogisticsOrWarnings: ["доставка кабеля", "маркировка и ведомость портов"],
      exclusions: ["проект СКС", "активное сетевое оборудование сверх перечня", "интернет-провайдер и внешняя линия связи"],
      clarifyingQuestions: ["Сколько портов RJ45 и рабочих мест?", "Нужен ли шкаф, патч-панель и маркировка?", "Открытая прокладка в кабель-канале или скрытая трасса?"],
    };
  }
  if (/акустич|acoustic/.test(normalized) && /панел|panel/.test(normalized)) {
    return {
      workKey: "acoustic_panel_installation",
      titleRu: "Профессиональная предварительная смета на монтаж акустических панелей",
      category: "wall_finishing",
      domain: "interior_acoustic_finish",
      object: "acoustic_panel_system",
      operation: "installation",
      method: "acoustic_panel_mounting",
      materialSystem: "acoustic_panel_system",
      complexity: "complex",
      requiredMaterials: ["акустические панели", "подсистема крепления панелей", "акустический крепеж", "кромочные профили", "виброразвязочные прокладки"],
      requiredLabor: ["обмер и акустическая раскладка", "разметка осей панелей", "монтаж подсистемы", "монтаж акустических панелей", "контроль стыков и примыканий"],
      requiredEquipmentOrWarnings: ["лазерный уровень", "подмости / стремянки", "пылеудаление при подрезке"],
      requiredLogisticsOrWarnings: ["доставка панелей", "подъем и хранение без деформации", "вынос упаковки"],
      exclusions: ["акустический проект и расчет времени реверберации уточняются отдельно", "скрытое усиление стен включается после обследования", "освещение и электрика в зоне панелей считаются отдельно"],
      clarifyingQuestions: ["Какая высота зала и схема раскладки панелей?", "Нужны ли тканевые, деревянные или минеральные панели?", "Есть ли акустический проект или целевое время реверберации?"],
    };
  }
  if (/холодильн|морозильн|cold\s+room|refrigerated\s+chamber|walk[-\s]?in\s+cooler/.test(normalized) && /камер|room|chamber|cooler/.test(normalized)) {
    return {
      workKey: "cold_room_installation",
      titleRu: "Профессиональная предварительная смета на монтаж холодильной камеры",
      category: "heating_hvac",
      domain: "cold_rooms",
      object: "cold_room_system",
      operation: "installation",
      method: "cold_room_panel_refrigeration_install",
      materialSystem: "cold_room_system",
      complexity: "infrastructure",
      requiredMaterials: ["сэндвич-панели холодильной камеры", "холодильная дверь", "испаритель и конденсаторный блок", "фреоновая трасса", "электрощит и автоматика камеры"],
      requiredLabor: ["обмер помещения", "монтаж панелей камеры", "монтаж двери и герметизация", "монтаж холодильного агрегата", "вакуумирование, заправка и ПНР"],
      requiredEquipmentOrWarnings: ["вакуумный насос", "манометрический коллектор", "такелаж холодильного оборудования", "контроль герметичности warning"],
      requiredLogisticsOrWarnings: ["доставка панелей и агрегатов", "подъем холодильного оборудования", "утилизация упаковки"],
      exclusions: ["проект холодоснабжения и теплопритоки уточняются отдельно", "усиление электропитания здания не включено", "напольная теплоизоляция включается после обследования основания"],
      clarifyingQuestions: ["Какая рабочая температура камеры?", "Нужна ли морозильная или среднетемпературная камера?", "Есть ли доступ для заноса панелей и агрегатов?"],
    };
  }
  if (/доклевеллер|док\s*левеллер|dock\s+leveler|loading\s+dock/.test(normalized)) {
    return {
      workKey: "dock_leveler_installation",
      titleRu: "Профессиональная предварительная смета на монтаж доклевеллера",
      category: "delivery_equipment",
      domain: "loading_docks",
      object: "dock_leveler",
      operation: "installation",
      method: "dock_leveler_installation",
      materialSystem: "dock_leveler_system",
      complexity: "complex",
      requiredMaterials: ["доклевеллер", "гидравлическая станция", "закладные детали", "уплотнители дока", "шкаф управления"],
      requiredLabor: ["обследование приямка", "проверка закладных и геометрии", "монтаж доклевеллера", "подключение гидравлики и управления", "ПНР и испытание под нагрузкой"],
      requiredEquipmentOrWarnings: ["кран / погрузчик", "такелаж", "электроизмерения", "ограждение зоны монтажа"],
      requiredLogisticsOrWarnings: ["доставка доклевеллера", "разгрузка и временное хранение", "вывоз упаковки"],
      exclusions: ["устройство нового приямка считается отдельно", "усиление ворот и проема не включено", "согласование с поставщиком оборудования требуется перед заказом"],
      clarifyingQuestions: ["Какой тип доклевеллера: откидная или выдвижная аппарель?", "Габариты приямка и нагрузка известны?", "Есть ли питание и готовые закладные?"],
    };
  }
  if (/дымоудал|smoke\s+extraction|smoke\s+exhaust|smoke\s+control/.test(normalized)) {
    return {
      workKey: "smoke_extraction_system",
      titleRu: "Профессиональная предварительная смета на монтаж системы дымоудаления",
      category: "heating_hvac",
      domain: "smoke_extraction",
      object: "smoke_extraction_system",
      operation: "installation",
      method: "smoke_extraction_installation",
      materialSystem: "smoke_extraction_system",
      complexity: "complex",
      requiredMaterials: ["вентиляторы дымоудаления", "огнестойкие воздуховоды", "клапаны дымоудаления", "кабель огнестойкий", "щит автоматики дымоудаления"],
      requiredLabor: ["обследование трасс", "монтаж огнестойких воздуховодов", "монтаж клапанов и вентиляторов", "электромонтаж и автоматика", "ПНР противопожарной системы"],
      requiredEquipmentOrWarnings: ["подъемник", "измерительные приборы", "лицензированный подрядчик warning", "испытание сценариев пожарной автоматики"],
      requiredLogisticsOrWarnings: ["доставка воздуховодов и вентиляторов", "подъем крупного оборудования", "исполнительная документация"],
      exclusions: ["проект ПД/РД и расчет противодымной защиты уточняются отдельно", "огнезащита конструкций считается отдельным разделом", "согласования с пожарной инспекцией не включены"],
      clarifyingQuestions: ["Есть ли проект противодымной защиты?", "Какие зоны и сценарии пожарной автоматики нужно покрыть?", "Требуется ли интеграция с АПС/BMS?"],
    };
  }
  if (/\bbms\b|диспетчеризац|автоматик[а-яё]*\s+(здан|bms)|bms\s+automation|building\s+management/.test(normalized)) {
    return {
      workKey: "bms_automation_installation",
      titleRu: "Профессиональная предварительная смета на монтаж BMS автоматики",
      category: "electrical",
      domain: "automation_bms",
      object: "bms_automation_system",
      operation: "installation",
      method: "bms_automation_installation",
      materialSystem: "bms_automation_system",
      complexity: "complex",
      requiredMaterials: ["контроллеры BMS", "шкафы автоматики", "датчики и исполнительные устройства", "кабель связи и питания", "SCADA / диспетчеризация"],
      requiredLabor: ["обследование инженерных систем", "разработка точек подключения", "монтаж шкафов автоматики", "прокладка линий связи", "программирование и ПНР BMS"],
      requiredEquipmentOrWarnings: ["ноутбук и конфигуратор", "сетевой тестер", "измерительные приборы", "пусконаладочная лаборатория warning"],
      requiredLogisticsOrWarnings: ["доставка шкафов и контроллеров", "маркировка кабелей", "исполнительная документация"],
      exclusions: ["проект автоматизации и перечень точек I/O уточняются отдельно", "лицензии SCADA включаются после выбора платформы", "интеграция сторонних протоколов требует обследования"],
      clarifyingQuestions: ["Сколько точек I/O и какие инженерные системы подключаются?", "Какая платформа BMS/SCADA требуется?", "Нужна ли интеграция с HVAC, АПС, СКУД или электросчетчиками?"],
    };
  }
  if (/промышленн[а-яё]*\s+оборуд|industrial\s+equipment/.test(normalized)) {
    return {
      workKey: "industrial_equipment_installation",
      titleRu: "Профессиональная предварительная смета на монтаж промышленного оборудования",
      category: "delivery_equipment",
      domain: "industrial_equipment",
      object: "industrial_equipment",
      operation: "installation",
      method: "industrial_equipment_install",
      materialSystem: "industrial_equipment_system",
      complexity: "infrastructure",
      requiredMaterials: ["промышленное оборудование", "анкерные болты", "виброопоры", "такелажная оснастка", "кабель и подключение питания"],
      requiredLabor: ["обследование основания", "такелаж и установка оборудования", "выверка по осям и уровню", "анкеровка и фиксация", "подключение и пусконаладка"],
      requiredEquipmentOrWarnings: ["кран / погрузчик", "домкраты и стропы", "лазерный уровень", "план производства работ warning"],
      requiredLogisticsOrWarnings: ["доставка и разгрузка оборудования", "такелажный план", "вывоз упаковки"],
      exclusions: ["фундамент под оборудование считается отдельным разделом", "паспортные требования производителя уточняются перед монтажом", "силовое питание здания и вентиляция считаются отдельно"],
      clarifyingQuestions: ["Какая масса, габариты и точки крепления оборудования?", "Готов ли фундамент или требуется отдельная смета?", "Нужны ли шеф-монтаж и гарантийная ПНР производителя?"],
    };
  }
  if (/солнеч|фотоэлектр|фотовольт|сэс|solar|pv\s+panel|photovoltaic|инвертор/.test(normalized) && /панел|станц|инвертор|квт|kw|solar|photovoltaic|фотоэлектр/.test(normalized)) {
    return {
      workKey: "solar_panel_installation",
      titleRu: "Профессиональная предварительная смета на солнечную электростанцию",
      category: "electrical",
      domain: "solar",
      object: "solar_power_system",
      operation: "installation",
      method: "solar_pv_install",
      materialSystem: "solar_pv_system",
      complexity: "infrastructure",
      requiredMaterials: ["солнечные панели", "инвертор", "крепежная система", "DC/AC кабели", "защита и коммутация"],
      requiredLabor: ["обследование крыши", "монтаж креплений", "монтаж солнечных панелей", "подключение инвертора", "пусконаладка"],
      requiredEquipmentOrWarnings: ["страховка на крыше", "электроизмерения", "подъем панелей"],
      requiredLogisticsOrWarnings: ["доставка панелей", "подъем на кровлю", "резерв на кабельные трассы"],
      exclusions: ["технические условия и сетевое согласование", "аккумуляторы сверх явного запроса", "усиление кровли без обследования"],
      clarifyingQuestions: ["Какая мощность станции и схема подключения?", "Тип кровли, угол и несущая способность подтверждены?", "Нужна ли сетевая, гибридная или автономная система?"],
    };
  }
  if (/электромонтаж|электр|электрокаб|кабел|проводк|розет|выключател|electrical|wiring|cable|socket|outlet|switch/.test(normalized)) {
    return {
      workKey: "electrical_area_installation",
      titleRu: "Профессиональная предварительная смета на электромонтаж",
      category: "electrical",
      domain: "electrical",
      object: "electrical_network",
      operation: "installation",
      method: "area_points_preliminary",
      materialSystem: "electrical_installation",
      complexity: "complex",
      requiredMaterials: [
        "кабельные линии",
        "гофра / кабель-канал",
        "подрозетники",
        "розетки",
        "выключатели",
        "щит и автоматика",
      ],
      requiredLabor: [
        "схема электрики",
        "разметка трасс",
        "штробление / прокладка кабеля",
        "монтаж подрозетников",
        "монтаж розеток",
        "монтаж выключателей",
        "проверка цепей",
      ],
      requiredEquipmentOrWarnings: ["тестер", "измеритель сопротивления изоляции", "штроборез", "электробезопасность"],
      requiredLogisticsOrWarnings: ["доставка кабеля, розеток и щита", "вывоз мусора", "заделка штроб уточняется по отделке"],
      exclusions: ["проект электрики", "вводной кабель и согласования", "скрытые дефекты существующей сети"],
      clarifyingQuestions: ["Сколько точек, групп и фаз?", "Нужны ли слаботочные сети?", "Есть ли проект и выделенная мощность?"],
    };
  }
  if (/(металл|металлоконструк|metal).*(навес|canopy)|(навес|canopy).*(металл|metal)/.test(normalized)) {
    return {
      workKey: "metal_canopy_installation",
      titleRu: "Профессиональная предварительная смета на металлический навес",
      category: "metalworks",
      domain: "canopies",
      object: "metal_canopy",
      operation: "installation",
      method: "welded_metal_frame",
      materialSystem: "metal_canopy_system",
      complexity: "complex",
      requiredMaterials: ["стойки металлические", "фермы / балки", "прогоны", "кровельное покрытие"],
      requiredLabor: ["монтаж металлокаркаса", "антикоррозионная грунтовка", "монтаж кровли"],
      requiredEquipmentOrWarnings: ["кран / автовышка", "сварочное оборудование"],
      requiredLogisticsOrWarnings: ["доставка металлоконструкций", "разгрузка"],
      exclusions: ["проект КМ/КМД", "снеговой расчет", "освещение и водоотвод сверх указанных"],
      clarifyingQuestions: ["Какая высота и шаг стоек?", "Какое покрытие навеса?", "Нужны ли водостоки и освещение?"],
    };
  }
  if (/гэс|гидроэлектр|hydropower|hydro turbine|турбин/.test(normalized)) {
    return {
      workKey: "hydro_turbine_installation",
      titleRu: "Профессиональная предварительная смета на установку турбины ГЭС",
      category: "concrete",
      domain: "hydropower",
      object: "hydropower_turbine",
      operation: "installation",
      method: "hydro_turbine_equipment_install",
      materialSystem: "hydro_turbine_system",
      complexity: "infrastructure",
      requiredMaterials: ["турбинное оборудование", "запорная арматура", "кабельные линии", "КИПиА"],
      requiredLabor: ["обследование машинного зала", "монтаж турбины", "ПНР", "испытания"],
      requiredEquipmentOrWarnings: ["кран", "такелаж", "инспекция"],
      requiredLogisticsOrWarnings: ["доставка оборудования", "такелажный план"],
      exclusions: ["ЛЭП и трансформатор", "гидротехнический проект", "водопользование и разрешения"],
      clarifyingQuestions: ["Какой напор H и расход Q?", "Какая схема подключения?", "Какие требования инспекции?"],
    };
  }
  if (/кондицион|кондиционер|сплит|мультисплит|vrf|vrv|чиллер|фанкойл|air\s+conditioning|cooling\s+system|refrigerant\s+line/.test(normalized)) {
    return {
      workKey: "air_conditioning_system_installation",
      titleRu: "Профессиональная предварительная смета на установку системы кондиционирования",
      category: "heating_hvac",
      domain: "hvac",
      object: "air_conditioning_system",
      operation: "installation",
      method: "air_conditioning_system_installation",
      materialSystem: "air_conditioning_system",
      complexity: "complex",
      requiredMaterials: [
        "внутренние блоки кондиционирования",
        "наружные блоки кондиционирования",
        "медная фреоновая трасса",
        "теплоизоляция трассы",
        "дренаж конденсата",
        "кабель питания и управления",
        "кронштейны наружных блоков",
      ],
      requiredLabor: [
        "обследование помещений и тепловых зон",
        "разметка трасс кондиционирования",
        "монтаж внутренних и наружных блоков",
        "прокладка медных трасс и дренажа",
        "опрессовка, вакуумирование и запуск",
      ],
      requiredEquipmentOrWarnings: ["вакуумный насос", "манометрический коллектор", "алмазное бурение", "подъем наружных блоков warning"],
      requiredLogisticsOrWarnings: ["доставка блоков кондиционирования", "подъем оборудования", "вывоз упаковки и расходных остатков"],
      exclusions: ["проект ОВиК", "усиление электропитания здания", "скрытые строительные работы сверх трасс кондиционирования"],
      clarifyingQuestions: ["Сколько тепловых зон и помещений?", "Есть ли проект ОВиК и допустимые места наружных блоков?", "Какие длины трасс и требования по шуму?"],
    };
  }
  if (/вентиляц|ventilation|duct/.test(normalized)) {
    return {
      workKey: "ventilation_area_installation",
      titleRu: "Профессиональная предварительная смета на вентиляцию",
      category: "heating_hvac",
      domain: "ventilation",
      object: "ventilation_network",
      operation: "installation",
      method: "area_based_ventilation_preliminary",
      materialSystem: "ventilation_system",
      complexity: "complex",
      requiredMaterials: ["воздуховоды", "фасонные элементы", "решетки", "вентилятор / установка"],
      requiredLabor: ["обследование", "монтаж воздуховодов", "балансировка"],
      requiredEquipmentOrWarnings: ["подъемник", "измерительный прибор"],
      requiredLogisticsOrWarnings: ["доставка воздуховодов", "подъем материалов"],
      exclusions: ["проект ОВиК", "автоматика сверх базовой", "огнезащита при отсутствии требований"],
      clarifyingQuestions: ["Какой расход воздуха?", "Есть ли проект трасс?", "Нужна ли автоматика и шумоглушение?"],
    };
  }
  return resolveEstimatorDomainSignature(normalized);
}

function pricingPolicy(currency = "KGS") {
  return {
    localContextStatus: "partial" as const,
    currency,
    sourcePolicy: "configured_reference_or_catalog_gap_warning",
    taxPolicy: "local_tax_warning_required",
    allowIndicativePrices: true,
  };
}

function specializeFlooringSignature(signature: WorkSignature, text: string): WorkSignature {
  if (signature.object !== "floor_covering") return signature;
  const normalized = normalizeDimensionText(text).toLocaleLowerCase("ru-RU");
  const parquet = /паркет/.test(normalized);
  const laminate = /ламинат/.test(normalized);
  const pvc = /пвх|рулонн/.test(normalized);
  const linoleum = /линолеум/.test(normalized);
  const replacement = /замен/.test(normalized);

  const coveringName =
    parquet ? "паркет / паркетная доска" :
      laminate ? "ламинат" :
        pvc ? "ПВХ покрытие" :
          linoleum ? "линолеум" :
            "напольное покрытие";
  const materialSystem =
    parquet ? "parquet_flooring_system" :
      laminate ? "laminate_flooring_system" :
        pvc ? "pvc_flooring_system" :
          linoleum ? "linoleum_flooring_system" :
            "floor_covering_system";
  return {
    ...signature,
    titleRu: `Профессиональная предварительная смета: ${coveringName}`,
    materialSystem,
    requiredMaterials: [
      "напольное покрытие",
      "подложка / клей",
      coveringName,
      "плинтус",
      "порожки",
    ],
    requiredLabor: [
      replacement ? "демонтаж старого покрытия warning" : "подготовка основания",
      "раскрой покрытия",
      `укладка покрытия: ${coveringName}`,
      "подрезка примыканий",
    ],
  };
}

function specializeWaterproofingSignature(signature: WorkSignature, text: string): WorkSignature {
  if (signature.object !== "waterproofing_surface") return signature;
  const normalized = normalizeDimensionText(text).toLocaleLowerCase("ru-RU");
  const roof = /кры|кровл|roof/.test(normalized);
  const wetRoom = /ванн|сануз|душ/.test(normalized);
  if (!roof || wetRoom) return signature;
  return {
    ...signature,
    titleRu: "Профессиональная предварительная смета: гидроизоляция кровли",
    materialSystem: "roof_waterproofing_system",
    requiredMaterials: [
      "праймер",
      "гидроизоляционный материал",
      "герметик примыканий",
      "воронки / проходки",
    ],
    requiredLabor: [
      "очистка кровли",
      "ремонт дефектов основания",
      "герметизация примыканий",
      "проверка герметичности",
    ],
    clarifyingQuestions: [
      "Какая кровля: плоская или скатная?",
      "Какой материал выбран: рулонная мембрана, мастика или наплавляемая гидроизоляция?",
      "Есть ли проходки, воронки и примыкания, которые нужно включить в объем?",
    ],
  };
}

function requiresComplexBoqDepth(signature: WorkSignature, quantities: QuantityInputs): boolean {
  const areaM2 = quantities.areaM2 ?? 0;
  return (
    signature.workKey === "concrete_pedestal_pour" ||
    (signature.object === "drywall_system" && areaM2 >= 100) ||
    (signature.object === "masonry_wall" && areaM2 >= 50)
  );
}

function resolveBoqComplexity(signature: WorkSignature, quantities: QuantityInputs, regulated: boolean): EstimatorKernelComplexity {
  const baseComplexity = regulated && signature.complexity !== "infrastructure" ? "complex" : signature.complexity;
  if (signature.object === "industrial_floor" && (quantities.areaM2 ?? 0) >= 1000) return "infrastructure";
  if (baseComplexity === "medium" && requiresComplexBoqDepth(signature, quantities)) return "complex";
  return baseComplexity;
}

export function buildEstimatorReasoningPlan(input: {
  text: string;
  currency?: string;
}): EstimatorReasoningPlan | null {
  if (!isParsableConstructionWork(input.text)) return null;
  const baseSignature = signatureFor(input.text);
  if (!baseSignature) return null;
  const signature = specializeWaterproofingSignature(specializeFlooringSignature(baseSignature, input.text), input.text);
  const quantities = resolveQuantityInputsFromPrompt(input.text);
  const regulated = detectRegulatedConstructionWork(input.text);
  const sections = ["materials", "labor", "equipment", "delivery"];
  const plan: EstimatorReasoningPlan = {
    intent: "estimate",
    workKey: signature.workKey,
    titleRu: signature.titleRu,
    category: signature.category,
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: regulated.regulated,
    semanticFrame: {
      domain: signature.domain,
      object: signature.object,
      operation: signature.operation,
      method: signature.method,
      materialSystem: signature.materialSystem,
      regulated: regulated.regulated,
      confidence: 0.86,
    },
    quantities,
    formulas: [],
    boqPlan: {
      complexity: resolveBoqComplexity(signature, quantities, regulated.regulated),
      sections,
      requiredMaterials: signature.requiredMaterials,
      requiredLabor: signature.requiredLabor,
      requiredEquipmentOrWarnings: signature.requiredEquipmentOrWarnings,
      requiredLogisticsOrWarnings: signature.requiredLogisticsOrWarnings,
      exclusions: signature.exclusions,
      clarifyingQuestions: signature.clarifyingQuestions,
    },
    pricingPolicy: pricingPolicy(input.currency),
  };
  return plan;
}

export type EstimateIntentPriorityInput = {
  text: string;
  selectedCategory?: GlobalWorkCategory | string | null;
};

export type EstimateIntentPriorityDecision = {
  typedKnownWorkDetected: boolean;
  typedWorkWins: boolean;
  selectedCategory?: GlobalWorkCategory;
  selectedCategoryIgnored: boolean;
  resolvedWorkKey?: string;
  resolvedCategory: GlobalWorkCategory;
  reason: "typed_known_work_semantic_plan" | "selected_category_fallback" | "no_estimate_context";
};

const REQUEST_CATEGORY_LABELS_RU: Record<string, GlobalWorkCategory> = {
  "пол": "flooring",
  "сантехника": "plumbing",
  "электрика": "electrical",
  "отделка": "wall_finishing",
  "двери/окна": "doors_windows",
  "ремонт": "other",
  "другое": "other",
};

function isGlobalWorkCategory(value: string): value is GlobalWorkCategory {
  return GLOBAL_WORK_CATEGORIES.includes(value as GlobalWorkCategory);
}

export function normalizeRequestSelectedCategory(value: GlobalWorkCategory | string | null | undefined): GlobalWorkCategory | undefined {
  const normalized = String(value ?? "").trim().toLocaleLowerCase("ru-RU");
  if (!normalized) return undefined;
  const labelCategory = REQUEST_CATEGORY_LABELS_RU[normalized];
  if (labelCategory) return labelCategory;
  return isGlobalWorkCategory(normalized) ? normalized : undefined;
}

export function resolveEstimateIntentPriority(input: EstimateIntentPriorityInput): EstimateIntentPriorityDecision {
  const selectedCategory = normalizeRequestSelectedCategory(input.selectedCategory);
  const plan = buildEstimatorReasoningPlan({ text: input.text });
  if (plan) {
    return {
      typedKnownWorkDetected: true,
      typedWorkWins: true,
      selectedCategory,
      selectedCategoryIgnored: selectedCategory !== undefined && selectedCategory !== plan.category,
      resolvedWorkKey: plan.workKey,
      resolvedCategory: plan.category,
      reason: "typed_known_work_semantic_plan",
    };
  }

  if (selectedCategory) {
    return {
      typedKnownWorkDetected: false,
      typedWorkWins: false,
      selectedCategory,
      selectedCategoryIgnored: false,
      resolvedCategory: selectedCategory,
      reason: "selected_category_fallback",
    };
  }

  return {
    typedKnownWorkDetected: false,
    typedWorkWins: false,
    selectedCategoryIgnored: false,
    resolvedCategory: "other",
    reason: "no_estimate_context",
  };
}

export type RequestCategoryOverridePolicyInput = EstimateIntentPriorityInput;

export type RequestCategoryOverridePolicyDecision = EstimateIntentPriorityDecision & {
  categoryOverrideAllowed: boolean;
};

export function resolveRequestCategoryOverridePolicy(
  input: RequestCategoryOverridePolicyInput,
): RequestCategoryOverridePolicyDecision {
  const decision = resolveEstimateIntentPriority(input);
  return {
    ...decision,
    categoryOverrideAllowed: !decision.typedWorkWins,
  };
}
