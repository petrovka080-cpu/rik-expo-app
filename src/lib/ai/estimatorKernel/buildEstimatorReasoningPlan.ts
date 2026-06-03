import type { GlobalWorkCategory } from "../globalEstimate";
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

function signatureFor(text: string): WorkSignature | null {
  const normalized = normalizeDimensionText(text);
  if (/^(?:смета\s+на\s+)?(?:демонтаж|снос|разборк)/.test(normalized) && !/и\s+уклад/.test(normalized)) {
    return resolveEstimatorDomainSignature(normalized);
  }
  if (/лифт|elevator/.test(normalized)) {
    return {
      workKey: "passenger_elevator_installation",
      titleRu: "Профессиональная предварительная смета на установку пассажирского лифта",
      category: "other",
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
  if (/пнр|пусконалад|наладк/.test(normalized) && /итп|индивидуальн[а-яё]*\s+теплов[а-яё]*\s+пункт/.test(normalized)) {
    return {
      workKey: "dynamic_boiler_itp_estimate",
      titleRu: "Профессиональная предварительная смета на ПНР ИТП",
      category: "heating_hvac",
      domain: "itp_commissioning",
      object: "itp_commissioning",
      operation: "commissioning",
      method: "itp_commissioning_and_handover",
      materialSystem: "itp_automation_and_hydraulics",
      complexity: "complex",
      requiredMaterials: ["контроллер ИТП", "датчики температуры и давления", "запорная арматура", "кабельные линии автоматики", "расходники маркировки"],
      requiredLabor: ["обследование ИТП", "проверка обвязки и КИП", "ПНР ИТП", "настройка погодозависимого регулирования", "испытания и сдача"],
      requiredEquipmentOrWarnings: ["измерительный прибор", "ноутбук пусконаладки", "теплотехнический допуск warning"],
      requiredLogisticsOrWarnings: ["выезд инженера КИПиА", "исполнительная ведомость параметров"],
      exclusions: ["проект ИТП", "замена теплообменников и насосов сверх перечня", "согласования с теплоснабжающей организацией"],
      clarifyingQuestions: ["Какая схема ИТП и автоматика установлена?", "Есть ли проект и доступ к контроллеру?", "Какие контуры нужно наладить и какие параметры сдачи требуются?"],
    };
  }
  if (/(цод|дата[-\s]?центр|серверн|bms).*(мониторинг|температур|датчик|климат|bms)|(мониторинг|температур|датчик|климат|bms).*(цод|дата[-\s]?центр|серверн|bms)/.test(normalized)) {
    return {
      workKey: "dynamic_bms_estimate",
      titleRu: "Профессиональная предварительная смета на мониторинг температуры ЦОД",
      category: "electrical",
      domain: "bms_monitoring",
      object: "bms_temperature_monitoring",
      operation: "installation",
      method: "bms_temperature_sensor_network",
      materialSystem: "bms_monitoring_system",
      complexity: "complex",
      requiredMaterials: ["датчики температуры", "BMS контроллер / шлюз", "слаботочный кабель", "шкаф автоматики", "ПО мониторинга"],
      requiredLabor: ["обследование ЦОД", "разметка точек датчиков", "монтаж датчиков температуры", "прокладка слаботочных линий", "настройка BMS и тревог", "ПНР мониторинга"],
      requiredEquipmentOrWarnings: ["кабельный тестер", "ноутбук пусконаладки", "работы в действующем ЦОД warning"],
      requiredLogisticsOrWarnings: ["доставка оборудования мониторинга", "исполнительная схема датчиков"],
      exclusions: ["проект BMS", "серверное оборудование и стойки", "СКС и электропитание сверх линий датчиков"],
      clarifyingQuestions: ["Сколько датчиков и какие зоны ЦОД?", "Нужна интеграция в существующую BMS или отдельный мониторинг?", "Какие пороги тревог и протокол передачи данных?"],
    };
  }
  if (/дозир|реагент|дозац|насос[-\s]?дозатор/.test(normalized)) {
    return {
      workKey: "dynamic_water_treatment_estimate",
      titleRu: "Профессиональная предварительная смета на дозирующую станцию",
      category: "plumbing",
      domain: "water_treatment_dosing",
      object: "chemical_dosing_station",
      operation: "installation",
      method: "dosing_station_installation",
      materialSystem: "water_treatment_dosing_system",
      complexity: "complex",
      requiredMaterials: ["дозирующий насос", "бак реагента", "обвязка реагентной линии", "шкаф управления", "датчики уровня"],
      requiredLabor: ["обследование точки врезки", "монтаж дозирующей станции", "обвязка реагентной линии", "настройка дозирования", "ПНР и пробный запуск"],
      requiredEquipmentOrWarnings: ["измерительный прибор", "средства химической безопасности warning", "калибровочная емкость"],
      requiredLogisticsOrWarnings: ["доставка дозирующего оборудования", "инструктаж по реагентам"],
      exclusions: ["проект водоподготовки", "реагенты постоянной эксплуатации сверх стартового комплекта", "лабораторные анализы воды"],
      clarifyingQuestions: ["Какой реагент и расход воды?", "Есть ли сигнал расходомера или импульсный ввод?", "Куда выполняется врезка и есть ли дренаж аварийного пролива?"],
    };
  }
  if (/уф|ультрафиолет/.test(normalized) && /обеззаражив|станц|вод/.test(normalized)) {
    return {
      workKey: "dynamic_uv_disinfection_estimate",
      titleRu: "Профессиональная предварительная смета на УФ обеззараживание",
      category: "plumbing",
      domain: "water_treatment_uv",
      object: "uv_disinfection_unit",
      operation: "installation",
      method: "uv_disinfection_installation",
      materialSystem: "uv_water_treatment_system",
      complexity: "complex",
      requiredMaterials: ["УФ реактор", "лампы и кварцевые чехлы", "датчик интенсивности", "шкаф управления", "обвязка трубопровода"],
      requiredLabor: ["обследование трубопровода", "монтаж УФ реактора", "обвязка и байпас", "подключение автоматики", "ПНР обеззараживания"],
      requiredEquipmentOrWarnings: ["измеритель УФ интенсивности", "сантехнический инструмент", "электробезопасность warning"],
      requiredLogisticsOrWarnings: ["доставка УФ оборудования", "паспорт и журнал обслуживания"],
      exclusions: ["лабораторные анализы воды", "замена насосов и фильтров сверх перечня", "проект водоподготовки"],
      clarifyingQuestions: ["Какой расход воды и диаметр линии?", "Нужно ли резервирование или байпас?", "Есть ли требования по журналу и сигнализации аварий?"],
    };
  }
  if (/биологическ[а-яё]*\s+станц|станц[а-яё]*\s+биологическ|лос|очистн[а-яё]*\s+сооруж/.test(normalized)) {
    return {
      workKey: "dynamic_wastewater_treatment_estimate",
      titleRu: "Профессиональная предварительная смета на биологическую станцию очистки",
      category: "plumbing",
      domain: "wastewater_treatment",
      object: "biological_treatment_station",
      operation: "installation",
      method: "wastewater_treatment_station_install",
      materialSystem: "wastewater_treatment_station_system",
      complexity: "infrastructure",
      requiredMaterials: ["корпус станции очистки", "компрессор / насосное оборудование", "трубы подвода и выпуска", "песчаное основание", "электрокабель питания"],
      requiredLabor: ["обследование участка", "разработка котлована", "монтаж станции очистки", "подключение трубопроводов", "ПНР биологической очистки"],
      requiredEquipmentOrWarnings: ["мини-экскаватор", "такелаж корпуса станции", "электробезопасность warning"],
      requiredLogisticsOrWarnings: ["доставка станции очистки", "вывоз грунта", "инструктаж эксплуатации"],
      exclusions: ["проект наружной канализации", "разрешения и лабораторные анализы", "дренажное поле сверх указанного объема"],
      clarifyingQuestions: ["Какая производительность м3/сутки?", "Какой уровень грунтовых вод и глубина выпуска?", "Есть ли место под котлован и подъезд техники?"],
    };
  }
  if (/тепловиз|термограф|thermal/.test(normalized)) {
    return {
      workKey: "thermal_imaging_survey",
      titleRu: "Профессиональная предварительная смета на тепловизионное обследование",
      category: "facade",
      domain: "thermal_survey",
      object: "thermal_imaging_survey",
      operation: "survey",
      method: "thermal_imaging_facade_survey",
      materialSystem: "diagnostic_survey",
      complexity: "medium",
      requiredMaterials: ["отчетный комплект термограмм", "план фасада / зон обследования", "маркировка дефектных зон"],
      requiredLabor: ["подготовка маршрута обследования", "тепловизионная съемка фасада", "анализ термограмм", "оформление дефектной ведомости"],
      requiredEquipmentOrWarnings: ["тепловизор", "лазерный дальномер", "автовышка warning"],
      requiredLogisticsOrWarnings: ["выезд инженера", "погодное окно для съемки"],
      exclusions: ["ремонт фасада и монтаж подсистемы", "лабораторные вскрытия", "проект утепления"],
      clarifyingQuestions: ["Нужна дневная или ночная съемка?", "Есть доступ ко всем фасадам и кровле?", "Какой формат отчета и точность привязки дефектов?"],
    };
  }
  if (/пнр|пусконалад|наладк/.test(normalized) && /пожаротуш|спринклер|дренчер/.test(normalized)) {
    return {
      workKey: "dynamic_fire_suppression_estimate",
      titleRu: "Профессиональная предварительная смета на ПНР пожаротушения",
      category: "electrical",
      domain: "fire_suppression_commissioning",
      object: "fire_suppression_system",
      operation: "commissioning",
      method: "regulated_fire_suppression_commissioning",
      materialSystem: "fire_suppression_system",
      complexity: "complex",
      requiredMaterials: ["контрольные манометры", "расходные материалы для испытаний", "маркировка линий", "исполнительная документация"],
      requiredLabor: ["обследование системы пожаротушения", "проверка клапанов и насосов", "ПНР пожаротушения", "испытания автоматики", "оформление протоколов"],
      requiredEquipmentOrWarnings: ["измерительный прибор", "испытательное оборудование", "лицензированный подрядчик warning"],
      requiredLogisticsOrWarnings: ["выезд пусконаладочной бригады", "координация с ответственным за пожарную безопасность"],
      exclusions: ["проект АУПТ", "замена насосов и трубопроводов", "официальные согласования сверх протоколов"],
      clarifyingQuestions: ["Какая система: спринклерная, дренчерная, газовая или порошковая?", "Есть ли проект и исполнительная схема?", "Какие зоны и насосные группы входят в ПНР?"],
    };
  }
  if (/стяжк|наливн[а-яё]*\s+пол|выравнивани[а-яё]*\s+основан/.test(normalized)) {
    return {
      workKey: "floor_screed",
      titleRu: "Профессиональная предварительная смета на бетонную стяжку пола",
      category: "concrete",
      domain: "floor_screed",
      object: "floor_screed",
      operation: "screed_installation",
      method: "cement_sand_screed",
      materialSystem: "floor_screed_system",
      complexity: "medium",
      requiredMaterials: ["цементно-песчаная смесь", "грунтовка", "маяки", "демпферная лента", "фибра warning"],
      requiredLabor: ["очистка основания", "грунтование основания", "установка маяков", "укладка стяжки", "затирка и уход"],
      requiredEquipmentOrWarnings: ["миксер / растворонасос", "правило и лазерный уровень"],
      requiredLogisticsOrWarnings: ["доставка сухих смесей", "вынос мешков и отходов"],
      exclusions: ["демонтаж старой стяжки", "теплый пол и шумоизоляция без явного запроса", "финишное покрытие"],
      clarifyingQuestions: ["Какая толщина стяжки?", "Нужна полусухая, мокрая или сухая система?", "Есть требования по ровности и сроку набора прочности?"],
    };
  }
  if (/бетонн[а-яё]*\s+плит|плита\s+\d|slab/.test(normalized)) {
    return {
      workKey: "concrete_slab",
      titleRu: "Профессиональная предварительная смета на бетонную плиту",
      category: "concrete",
      domain: "concrete",
      object: "concrete_slab",
      operation: "concrete_pour",
      method: "reinforced_concrete_slab",
      materialSystem: "concrete_slab_system",
      complexity: "medium",
      requiredMaterials: ["бетон для плиты", "арматурная сетка / каркас", "опалубка по периметру", "фиксаторы защитного слоя", "пленка / разделительный слой"],
      requiredLabor: ["подготовка основания", "вязка арматуры плиты", "монтаж опалубки", "заливка бетонной плиты", "уход за бетоном"],
      requiredEquipmentOrWarnings: ["вибратор", "бетононасос warning", "лазерный уровень"],
      requiredLogisticsOrWarnings: ["доставка бетона", "доставка арматуры и опалубки"],
      exclusions: ["проект КЖ и расчет основания", "земляные работы сверх подготовки", "гидроизоляция и утепление без явного запроса"],
      clarifyingQuestions: ["Какая толщина плиты и класс бетона?", "Есть ли проект армирования?", "Какой доступ для миксера или бетононасоса?"],
    };
  }
  if (/тумб|пьедестал|pedestal/.test(normalized) || (/бетон/.test(normalized) && !/колонн|column/.test(normalized) && /(0\.\d+\s*x|ширина|высота|длина)/.test(normalized))) {
    return {
      workKey: "concrete_pedestal_pour",
      titleRu: "Профессиональная предварительная смета на заливку бетонных тумб",
      category: "concrete",
      domain: "concrete",
      object: "concrete_pedestal",
      operation: "concrete_pour",
      method: "rectangular_concrete_element",
      materialSystem: "concrete_rebar_formwork",
      complexity: "medium",
      requiredMaterials: ["бетон", "арматура", "вязальная проволока", "фиксаторы защитного слоя", "опалубка"],
      requiredLabor: ["разметка осей", "вязка арматуры", "монтаж опалубки", "заливка бетона", "уход за бетоном"],
      requiredEquipmentOrWarnings: ["вибратор", "подача бетона warning", "леса / подмости warning"],
      requiredLogisticsOrWarnings: ["доставка материалов", "резерв"],
      exclusions: ["проект КЖ и расчет несущей способности", "геология и усиление основания", "закладные детали сверх указанных"],
      clarifyingQuestions: ["Есть ли рабочая схема КЖ?", "Какая марка бетона и армирование?", "Как подается бетон на высоту?"],
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
  const carpet = /ковролин|carpet/.test(normalized);
  const quartzVinyl = /кварцвинил/.test(normalized);
  const replacement = /замен/.test(normalized);

  const coveringName =
    parquet ? "паркет / паркетная доска" :
      laminate ? "ламинат" :
        pvc ? "ПВХ покрытие" :
          linoleum ? "линолеум" :
            carpet ? "ковролин" :
              quartzVinyl ? "кварцвинил" :
                "напольное покрытие";
  const materialSystem =
    parquet ? "parquet_flooring_system" :
      laminate ? "laminate_flooring_system" :
        pvc ? "pvc_flooring_system" :
          linoleum ? "linoleum_flooring_system" :
            carpet ? "carpet_flooring_system" :
              quartzVinyl ? "quartz_vinyl_flooring_system" :
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
