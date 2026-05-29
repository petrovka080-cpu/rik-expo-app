import type { GlobalWorkCategory } from "../globalEstimate";
import { normalizeDimensionText, resolveQuantityInputsFromPrompt } from "../constructionFormulas";
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
  if (/дренаж|drainage|лотк/.test(normalized)) {
    return {
      workKey: "drainage_channel_installation",
      titleRu: "Профессиональная предварительная смета на устройство дренажных каналов",
      category: "roadworks",
      domain: "drainage",
      object: "drainage_channel",
      operation: "installation",
      method: "length_based_drainage_channel",
      materialSystem: "drainage_channel_system",
      complexity: "medium",
      requiredMaterials: ["геотекстиль", "песчаная подготовка", "щебеночное основание", "дренажные лотки / каналы", "решетки"],
      requiredLabor: ["разметка трассы", "проверка уклонов", "выемка грунта", "стыковка лотков"],
      requiredEquipmentOrWarnings: ["мини-экскаватор / ручная выемка", "виброплита", "проверка проливом"],
      requiredLogisticsOrWarnings: ["вывоз грунта", "доставка материалов"],
      exclusions: ["ливневая сеть за пределами подключения", "геодезический проект", "восстановление покрытия вне трассы"],
      clarifyingQuestions: ["Какая глубина и класс нагрузки лотков?", "Куда подключается выпуск?", "Какие уклоны и отметки заданы?"],
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
  if (/электромонтаж|electrical/.test(normalized)) {
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
      requiredMaterials: ["кабельные линии", "щит и автоматика", "розеточные группы", "освещение"],
      requiredLabor: ["разметка трасс", "штробление / прокладка", "подключение щита", "проверка цепей"],
      requiredEquipmentOrWarnings: ["тестер", "штроборез", "электробезопасность"],
      requiredLogisticsOrWarnings: ["доставка кабеля и щита", "вывоз мусора"],
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
  const genericDomain = [
    "foundation",
    "flooring",
    "paving",
    "roofing",
    "waterproofing",
    "metal_structures",
    "masonry",
    "asphalt",
    "drywall",
    "tiling",
    "painting",
    "plumbing",
    "solar",
    "well_drilling",
    "demolition",
    "fencing",
    "sewerage",
    "hvac",
    "fire_alarm",
    "low_voltage",
    "doors",
    "windows",
    "ceilings",
    "facade",
    "insulation",
    "earthworks",
    "landscaping",
    "heating",
    "boilers",
    "industrial_cranes",
    "escalators",
    "hazardous_materials",
    "structural_repair",
    "road_marking",
    "retaining_walls",
    "site_preparation",
    "water_supply",
    "industrial_equipment",
    "restoration",
    "carpentry",
  ].find((domain) => normalized.includes(domain.replace(/_/g, " ")));
  if (genericDomain) {
    const regulated = /fire_alarm|low_voltage|boilers|industrial_cranes|escalators|hazardous_materials|structural_repair/.test(genericDomain);
    return {
      workKey: `dynamic_${genericDomain}_estimate`,
      titleRu: `Профессиональная предварительная смета: ${genericDomain.replace(/_/g, " ")}`,
      category: categoryForGenericDomain(genericDomain),
      domain: genericDomain,
      object: `${genericDomain}_work`,
      operation: "installation",
      method: "dynamic_professional_method",
      materialSystem: `${genericDomain}_system`,
      complexity: regulated ? "complex" : "simple",
      requiredMaterials: [`основной материал для ${genericDomain}`],
      requiredLabor: [`профильный монтаж ${genericDomain}`],
      requiredEquipmentOrWarnings: [`профессиональный инструмент ${genericDomain}`],
      requiredLogisticsOrWarnings: [`доставка материалов ${genericDomain}`],
      exclusions: ["Проект, разрешения и скрытые работы уточняются отдельно."],
      clarifyingQuestions: ["Уточните объект, технологию, местоположение и фактический объем."],
    };
  }
  return null;
}

function categoryForGenericDomain(domain: string): GlobalWorkCategory {
  if (domain === "flooring") return "flooring";
  if (domain === "paving" || domain === "landscaping" || domain === "fencing") return "landscaping";
  if (domain === "roofing") return "roofing";
  if (domain === "waterproofing") return "waterproofing";
  if (domain === "metal_structures" || domain === "industrial_cranes") return "metalworks";
  if (domain === "masonry") return "masonry";
  if (domain === "asphalt" || domain === "road_marking" || domain === "retaining_walls") return "roadworks";
  if (domain === "drywall") return "drywall";
  if (domain === "tiling") return "tile";
  if (domain === "painting") return "painting";
  if (domain === "plumbing" || domain === "sewerage" || domain === "water_supply") return "plumbing";
  if (domain === "solar" || domain === "low_voltage" || domain === "fire_alarm") return "electrical";
  if (domain === "well_drilling" || domain === "earthworks" || domain === "site_preparation") return "roadworks";
  if (domain === "demolition" || domain === "hazardous_materials") return "demolition";
  if (domain === "hvac" || domain === "heating" || domain === "boilers") return "heating_hvac";
  if (domain === "doors" || domain === "windows") return "doors_windows";
  if (domain === "ceilings") return "ceiling";
  if (domain === "facade") return "facade";
  if (domain === "insulation") return "insulation";
  if (domain === "foundation") return "foundation";
  if (domain === "carpentry") return "carpentry";
  if (domain === "industrial_equipment" || domain === "escalators") return "delivery_equipment";
  if (domain === "structural_repair" || domain === "restoration") return "wall_finishing";
  return "other";
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

export function buildEstimatorReasoningPlan(input: {
  text: string;
  currency?: string;
}): EstimatorReasoningPlan | null {
  if (!isParsableConstructionWork(input.text)) return null;
  const signature = signatureFor(input.text);
  if (!signature) return null;
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
      complexity: signature.complexity,
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
