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
  if (hasConcretePedestalObject(normalized) || (/бетон/.test(normalized) && !/колонн|column/.test(normalized) && !hasConcreteSurfaceObject(normalized) && /(0\.\d+\s*x|ширина|высота|длина)/.test(normalized))) {
    return {
      workKey: "concrete_pedestal_pour",
      titleRu: "Профессиональная предварительная смета на заливку бетонных тумб",
      category: "concrete",
      domain: "concrete",
      object: "concrete_pedestal",
      operation: "pour",
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
