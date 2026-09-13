import type { DirectConsumerRepairOpenWorldOwner } from "./directConsumerRepairOpenWorldRouting";
import {
  ELECTRICAL_CANONICAL_CALCULATION_VERSION,
  resolveElectricalCanonicalParameters,
  type ElectricalCanonicalParameterValues,
} from "../v4/electrical/electricalCanonicalV1";
import type { EstimatorReasoningPlan } from "../../ai/estimatorKernel/estimatorKernelTypes";
import {
  extractSarnafilAt18CanonicalParametersV1,
  sarnafilAt18MissingQuestionsRuV1,
} from "./roofingSarnafilAt18ProductionBindingV1";
import {
  extractRockwoolComfortboard80CanonicalParametersV1,
  rockwoolComfortboard80MissingQuestionsRuV1,
} from "./insulationRockwoolComfortboard80ProductionBindingV1";
import {
  extractSiemensSintesoFdb221CanonicalParametersV1,
  siemensSintesoFdb221MissingQuestionsRuV1,
} from "./fireSafetySiemensFdb221ProductionBindingV1";
import {
  extractLegrand049272BusScsCanonicalParametersV1,
  legrand049272BusScsMissingQuestionsRuV1,
} from "./lowVoltageLegrand049272ProductionBindingV1";
import {
  extractJotunHardtopXpCanonicalParametersV1,
  jotunHardtopXpMissingQuestionsRuV1,
} from "./metalworkJotunHardtopXpProductionBindingV1";
import {
  extractSikagardWoodPreserverCanonicalParametersV1,
  sikagardWoodPreserverMissingQuestionsRuV1,
} from "./carpentrySikagardWoodPreserverProductionBindingV1";
import {
  extractWavinOsmaC3766BkCanonicalParametersV1,
  wavinOsmaC3766BkMissingQuestionsRuV1,
} from "./sewerageWavinOsmaC3766BkProductionBindingV1";
import {
  extractRockwoolFixrockCanonicalParametersV1,
  rockwoolFixrockMissingQuestionsRuV1,
} from "./facadeRockwoolFixrockProductionBindingV1";
import {
  extractKgAuthorSupervisionCanonicalParametersV1,
  kgAuthorSupervisionMissingQuestionsRuV1,
} from "./servicesKgAuthorSupervisionProductionBindingV1";
import {
  extractRicsNrm2FormworkCanonicalParametersV1,
  ricsNrm2FormworkMissingQuestionsRuV1,
} from "./formworkRicsNrm2ProductionBindingV1";
import {
  extractReinforcementBarScheduleCanonicalParametersV1,
  reinforcementBarScheduleMissingQuestionsRuV1,
} from "./reinforcementBarScheduleProductionBindingV1";
import {
  extractFordTransitDeliveryCanonicalParametersV1,
  fordTransitDeliveryMissingQuestionsRuV1,
} from "./deliveryFordTransitProductionBindingV1";
import { extractTennantT350CanonicalParametersV1, tennantT350MissingQuestionsRuV1 } from "./cleaningTennantT350ProductionBindingV1";
import { extractUnitedRentalsCaOneShiftCanonicalParametersV1,
  unitedRentalsCaOneShiftMissingQuestionsRuV1 } from "./equipmentRentUnitedRentalsProductionBindingV1";
import { extractRainBirdXfdCanonicalParametersV1,
  rainBirdXfdMissingQuestionsRuV1 } from "./landscapingRainBirdXfdProductionBindingV1";
import { extractSoudafoamGeniusCanonicalParametersV1,
  soudafoamGeniusMissingQuestionsRuV1 } from "./windowsDoorsSoudafoamProductionBindingV1";
import { extractFhwaFp24Section208CanonicalParametersV1,
  fhwaFp24Section208MissingQuestionsRuV1 } from "./earthworksFhwaFp24ProductionBindingV1";
import { epaCdWasteMissingQuestionsRuV1, extractEpaCdWasteCanonicalParametersV1 } from "./wasteRemovalEpaProductionBindingV1";
import { biaTn10MasonryMissingQuestionsRuV1,
  extractBiaTn10MasonryCanonicalParametersV1 } from "./masonryBiaTn10ProductionBindingV1";
import { extractKrer46DemolitionCanonicalParametersV1,
  krer46DemolitionMissingQuestionsRuV1 } from "./demolitionKrer46ProductionBindingV1";

function positiveNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function areaFromPrompt(text: string): number | undefined {
  return positiveNumber(
    text.match(
      /(\d+(?:[,.]\d+)?)\s*(?:кв\.?\s*м|м2|м²|sq(?:uare)?[_\s-]*m|sqm)/iu,
    )?.[1],
  );
}

function pricingPolicy(currency: string): EstimatorReasoningPlan["pricingPolicy"] {
  return {
    localContextStatus: "partial",
    currency,
    sourcePolicy: "configured_reference_or_catalog_gap_warning",
    taxPolicy: "local_tax_warning_required",
    allowIndicativePrices: false,
  };
}

function electricalPlan(
  text: string,
  currency: string,
  overrides?: ElectricalCanonicalParameterValues,
): EstimatorReasoningPlan {
  const resolved = resolveElectricalCanonicalParameters({
    text,
    overrides,
    changedAt: "estimator-plan",
  });
  const areaM2 = typeof resolved.values.area_m2 === "number"
    ? resolved.values.area_m2
    : undefined;
  const routeLengthM = typeof resolved.values.route_length_m === "number"
    ? resolved.values.route_length_m
    : undefined;
  const panelIncluded = resolved.values.panel_included === true;
  const protectiveDevicesIncluded = resolved.values.protective_devices_included === true;
  const groundingIncluded = resolved.values.grounding_included === true;
  const demolitionIncluded = resolved.values.demolition_included === true;
  const outletCount = typeof resolved.values.outlet_count === "number"
    ? resolved.values.outlet_count
    : 0;
  const switchCount = typeof resolved.values.switch_count === "number"
    ? resolved.values.switch_count
    : 0;
  const lightingPointCount = typeof resolved.values.lighting_point_count === "number"
    ? resolved.values.lighting_point_count
    : 0;
  return {
    intent: "estimate",
    workKey: "electrical_area_installation",
    titleRu: "Профессиональная предварительная смета на электромонтаж",
    category: "electrical",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: false,
    semanticFrame: {
      domain: "electrical",
      object: "electrical_network",
      operation: "installation",
      method: "area_points_preliminary",
      materialSystem: "electrical_installation",
      regulated: false,
      confidence: 0.86,
    },
    quantities: {
      areaM2,
      lengthM: routeLengthM,
      rawDimensions: [],
    },
    canonicalParameters: resolved.values,
    calculationVersion: ELECTRICAL_CANONICAL_CALCULATION_VERSION,
    formulas: [],
    boqPlan: {
      complexity: "complex",
      sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: [
        ...(routeLengthM != null ? ["кабельные линии", "гофра / кабель-канал"] : []),
        ...(outletCount + switchCount > 0 ? ["подрозетники"] : []),
        ...(outletCount > 0 ? ["розетки"] : []),
        ...(switchCount > 0 ? ["выключатели"] : []),
        ...(lightingPointCount > 0 ? ["точки освещения"] : []),
        ...(panelIncluded ? ["электрический щит"] : []),
        ...(protectiveDevicesIncluded ? ["автоматы и УЗО"] : []),
        ...(groundingIncluded ? ["шина заземления"] : []),
      ],
      requiredLabor: [
        "схема электрики",
        ...(areaM2 != null || routeLengthM != null ? ["разметка трасс"] : []),
        ...(routeLengthM != null ? ["штробление / прокладка кабеля"] : []),
        ...(outletCount + switchCount > 0 ? ["монтаж подрозетников"] : []),
        ...(outletCount > 0 ? ["монтаж розеток"] : []),
        ...(switchCount > 0 ? ["монтаж выключателей"] : []),
        ...(lightingPointCount > 0 ? ["монтаж точек освещения"] : []),
        ...(demolitionIncluded ? ["демонтаж существующей проводки"] : []),
        "проверка цепей",
      ],
      requiredEquipmentOrWarnings: [
        "тестер",
        "измеритель сопротивления изоляции",
        ...(resolved.values.wiring_method === "open" ? [] : ["штроборез"]),
      ],
      requiredLogisticsOrWarnings: [
        "доставка кабеля, розеток и щита",
        ...(demolitionIncluded ? ["вывоз мусора"] : []),
      ],
      exclusions: [
        "проект электрики",
        "вводной кабель и согласования",
        "скрытые дефекты существующей сети",
      ],
      clarifyingQuestions: [
        "Сколько точек, групп и фаз?",
        "Нужны ли слаботочные сети?",
        "Есть ли проект и выделенная мощность?",
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

function fireSafetySiemensFdb221Plan(
  text: string,
  currency: string,
): EstimatorReasoningPlan {
  const canonicalParameters = extractSiemensSintesoFdb221CanonicalParametersV1(text);
  const designedPointCount = canonicalParameters?.designed_detector_point_count;
  return {
    intent: "estimate",
    workKey: "fire_alarm_installation",
    titleRu: "Профессиональная предварительная смета: адресная пожарная сигнализация Siemens Sinteso",
    category: "electrical",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: {
      domain: "fire_alarm",
      object: "fire_alarm_system",
      operation: "installation",
      method: "regulated_fire_alarm_install",
      materialSystem: "fire_alarm_system",
      regulated: true,
      confidence: 0.9,
    },
    quantities: {
      count: typeof designedPointCount === "number" ? designedPointCount : undefined,
      rawDimensions: [],
    },
    formulas: [],
    boqPlan: {
      complexity: "complex",
      sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: [
        "пожарные извещатели по утверждённому проекту",
        "основания адресных извещателей Siemens Sinteso FDB221 (не извещатели)",
        "прибор адресной пожарной сигнализации",
        "огнестойкий кабель пожарной сигнализации",
        "светозвуковые оповещатели",
        "резервное питание",
      ],
      requiredLabor: [
        "проверка утверждённой топологии шлейфов и совместимости извещателей",
        "прокладка огнестойкого кабеля",
        "монтаж оснований и адресных пожарных извещателей",
        "адресация и функциональная проверка точек",
        "пусконаладка и приёмочные испытания пожарной сигнализации",
      ],
      requiredEquipmentOrWarnings: [
        "кабельный тестер линий АПС",
        "измеритель сопротивления изоляции",
        "комплект функциональной проверки извещателей",
      ],
      requiredLogisticsOrWarnings: [
        "доставка оборудования пожарной сигнализации",
        "защищённое хранение адресных устройств",
      ],
      exclusions: [
        "Число и расстановка извещателей принимаются только из утверждённого проекта АПС и не выводятся из площади.",
        "FDB221 является основанием; извещатель, влажностная насадка, клеммы, обогрев, фиксатор и табличка учитываются отдельно.",
      ],
      clarifyingQuestions: [
        "Есть ли утверждённый проект АПС с числом точек и нормативной основой?",
        "Какая модель извещателя выбрана и какой документ подтверждает её совместимость с FDB221?",
        ...siemensSintesoFdb221MissingQuestionsRuV1(canonicalParameters),
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

function lowVoltageLegrand049272Plan(
  text: string,
  currency: string,
): EstimatorReasoningPlan {
  const canonicalParameters = extractLegrand049272BusScsCanonicalParametersV1(text);
  const approvedRouteLength = canonicalParameters?.approved_route_length_linear_m;
  return {
    intent: "estimate",
    workKey: "low_voltage_legrand_049272_bus_scs_cable",
    titleRu: "Профессиональная предварительная смета: кабель BUS/SCS Legrand 049272",
    category: "electrical",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: {
      domain: "low_voltage",
      object: "nurse_call_bus_scs_system",
      operation: "installation",
      method: "approved_bus_scs_circuit_routing",
      materialSystem: "legrand_049272_bus_scs_system",
      regulated: true,
      confidence: 0.9,
    },
    quantities: {
      lengthM: typeof approvedRouteLength === "number" ? approvedRouteLength : undefined,
      rawDimensions: [],
    },
    formulas: [],
    boqPlan: {
      complexity: "complex",
      sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: [
        "кабель Legrand 049272 BUS/SCS 2×0,56 мм² (не UTP)",
        "отдельная трасса или труба BUS/SCS с разделением от силовых кабелей",
        "оконечные и маркировочные элементы по проекту системы",
      ],
      requiredLabor: [
        "проверка утверждённой ведомости цепей BUS/SCS точка-точка",
        "разметка отдельной слаботочной трассы",
        "прокладка кабеля Legrand 049272 по утверждённым цепям",
        "оконцевание и маркировка BUS/SCS",
        "испытания и сертификация смонтированных цепей",
      ],
      requiredEquipmentOrWarnings: [
        "кабельный тестер BUS/SCS",
        "инструмент контролируемого оконцевания",
      ],
      requiredLogisticsOrWarnings: [
        "доставка 200-метровых барабанов Legrand 049272",
        "учёт и повторное использование остатков барабанов по карте раскроя",
      ],
      exclusions: [
        "Legrand 049272 — специальный BUS/SCS-кабель для питания системы и рабочих сигналов; подмена обычным UTP запрещена.",
        "Подземная применимость требует отдельного проектного подтверждения из-за расхождения ревизий источника.",
        "Округление до барабанов выполняется только после полной агрегации цепей и утверждения карты раскроя остатков.",
      ],
      clarifyingQuestions: [
        "Утверждены ли схема BUS/SCS и ведомость всех соединений точка-точка?",
        "Подтверждена ли раздельная прокладка от силовых цепей выше 50 В?",
        ...legrand049272BusScsMissingQuestionsRuV1(canonicalParameters),
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

function metalworkJotunHardtopXpPlan(
  text: string,
  currency: string,
): EstimatorReasoningPlan {
  const canonicalParameters = extractJotunHardtopXpCanonicalParametersV1(text);
  const coatedArea = canonicalParameters?.coated_steel_area_m2;
  return {
    intent: "estimate",
    workKey: "metalwork_jotun_hardtop_xp_100um_coating",
    titleRu: "Профессиональная предварительная смета: покрытие стали Jotun Hardtop XP",
    category: "painting",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: {
      domain: "metalwork",
      object: "steel_protective_coating_system",
      operation: "coating",
      method: "approved_two_component_topcoat_application",
      materialSystem: "jotun_hardtop_xp_coating_system",
      regulated: true,
      confidence: 0.9,
    },
    quantities: {
      areaM2: typeof coatedArea === "number" ? coatedArea : undefined,
      rawDimensions: [],
    },
    formulas: [],
    boqPlan: {
      complexity: "complex",
      sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: [
        "двухкомпонентное покрытие Jotun Hardtop XP",
        "материалы маскирования и защиты смежных поверхностей",
        "материалы контроля и ремонта совместимого предыдущего слоя",
      ],
      requiredLabor: [
        "проверка системы покрытия и профиля поверхности",
        "подготовка и обеспыливание стальной поверхности",
        "смешивание компонентов Jotun Hardtop XP 10:1",
        "нанесение покрытия утверждённым способом",
        "контроль толщины сухой плёнки 100 мкм",
      ],
      requiredEquipmentOrWarnings: [
        "оборудование утверждённого способа нанесения",
        "толщиномер сухой плёнки",
        "средства вентиляции и защиты персонала",
      ],
      requiredLogisticsOrWarnings: [
        "доставка комплектов Jotun Hardtop XP",
        "хранение компонентов по паспорту производителя",
      ],
      exclusions: [
        "Теоретические 6,3 м²/л не включают потери нанесения, геометрию профиля и ремонт дефектов.",
        "Округление до комплектов 5/20 л выполняется только после выбора закупочной комбинации.",
        "Яркие и специальные цвета требуют отдельной проверки указаний производителя.",
      ],
      clarifyingQuestions: [
        "Утверждены ли вся система покрытия и совместимость предыдущего слоя?",
        "Какой профиль поверхности и способ нанесения зафиксированы технологической картой?",
        ...jotunHardtopXpMissingQuestionsRuV1(canonicalParameters),
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

function carpentrySikagardWoodPreserverPlan(
  text: string,
  currency: string,
): EstimatorReasoningPlan {
  const canonicalParameters = extractSikagardWoodPreserverCanonicalParametersV1(text);
  const treatedArea = canonicalParameters?.treated_timber_surface_area_m2;
  return {
    intent: "estimate",
    workKey: "carpentry_sikagard_wood_preserver_preventative",
    titleRu: "Профессиональная предварительная смета: профилактическая защита древесины Sikagard",
    category: "carpentry",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: false,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: {
      domain: "carpentry",
      object: "timber_preservation_system",
      operation: "preservative_treatment",
      method: "preventative_brush_or_spray_treatment",
      materialSystem: "sikagard_wood_preserver_system",
      regulated: false,
      confidence: 0.9,
    },
    quantities: {
      areaM2: typeof treatedArea === "number" ? treatedArea : undefined,
      rawDimensions: [],
    },
    formulas: [],
    boqPlan: {
      complexity: "medium",
      sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: [
        "Sikagard Wood Preserver в выбранной комбинации банок 1/5 л",
        "материалы защиты смежных поверхностей",
        "финишное покрытие или лак для наружного применения warning",
      ],
      requiredLabor: [
        "проверка состояния и влажности древесины",
        "очистка необработанной деревянной поверхности",
        "нанесение первого слоя защитного состава",
        "нанесение второго слоя защитного состава",
        "контроль сплошности профилактической обработки",
      ],
      requiredEquipmentOrWarnings: [
        "кисти или утверждённое распылительное оборудование",
        "средства защиты персонала и вентиляции",
      ],
      requiredLogisticsOrWarnings: [
        "доставка выбранной комбинации банок 1/5 л",
        "защищённое хранение готового к применению состава",
      ],
      exclusions: [
        "Состав готов к применению и не разбавляется.",
        "Поглощение древесиной и проектные потери не добавляются автоматически.",
        "Наружная обработка требует отдельного финишного покрытия или лака; поверхности приготовления пищи исключены.",
      ],
      clarifyingQuestions: [
        "Подтверждены ли чистая сухая поверхность и профилактическое назначение обработки?",
        "Какая комбинация банок 1/5 л выбрана для закупки?",
        ...sikagardWoodPreserverMissingQuestionsRuV1(canonicalParameters),
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

function sewerageWavinOsmaC3766BkPlan(
  text: string,
  currency: string,
): EstimatorReasoningPlan {
  const canonicalParameters = extractWavinOsmaC3766BkCanonicalParametersV1(text);
  const routeLength = canonicalParameters?.approved_pipe_route_linear_m;
  return {
    intent: "estimate",
    workKey: "sewerage_wavin_osma_c3766bk_110mm_3m",
    titleRu: "Профессиональная предварительная смета: надземная канализация Wavin Osma C3766BK",
    category: "plumbing",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: {
      domain: "sewerage",
      object: "above_ground_soil_waste_pipe_system",
      operation: "pipe_installation",
      method: "socketed_pressureless_pvc_u",
      materialSystem: "wavin_osma_c3766bk_110mm_3m",
      regulated: true,
      confidence: 0.95,
    },
    quantities: {
      lengthM: typeof routeLength === "number" ? routeLength : undefined,
      rawDimensions: [],
    },
    formulas: [],
    boqPlan: {
      complexity: "complex",
      sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: [
        "труба Wavin Osma C3766BK PVC-U DN100/OD110 длиной 3 м",
        "фитинги, ответвления, прочистки и смещения по отдельной ведомости",
        "опоры, огнезаделка и акустические материалы по проекту",
      ],
      requiredLabor: [
        "проверка утверждённой трассы и подключаемых приборов",
        "раскрой труб с учётом повторного использования отрезков",
        "монтаж раструбных соединений с проектной глубиной вставки",
        "монтаж опор и компенсация температурных перемещений",
        "испытание и контроль безнапорной канализационной системы",
      ],
      requiredEquipmentOrWarnings: [
        "оборудование для перпендикулярной резки и снятия фаски",
        "измерительный инструмент для контроля уклонов и вставки",
      ],
      requiredLogisticsOrWarnings: [
        "проектный заказ трёхметровых труб задаётся явно",
        "заводская упаковка поставщика 57 шт. не является нормой расхода проекта",
      ],
      exclusions: [
        "Геометрическая норма 1:1 не является опубликованным производителем расходом.",
        "Фитинги, раструбная вставка, повторное использование отрезков и припуск не добавляются автоматически.",
        "Подземные, напорные и иные диаметры или коммерческие длины требуют другого профиля.",
      ],
      clarifyingQuestions: [
        "Подтверждены ли гидравлический расчёт, приборы и точная надземная область применения?",
        "Утверждены ли ведомости фитингов, опор, проходок, акустики и температурных перемещений?",
        ...wavinOsmaC3766BkMissingQuestionsRuV1(canonicalParameters),
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

function facadeRockwoolFixrockPlan(
  text: string,
  currency: string,
): EstimatorReasoningPlan {
  const canonicalParameters = extractRockwoolFixrockCanonicalParametersV1(text);
  const insulationArea = canonicalParameters?.facade_insulation_area_m2;
  return {
    intent: "estimate",
    workKey: "facade_rockwool_fixrock_conventional_holders",
    titleRu: "Профессиональная предварительная смета: крепление фасадной теплоизоляции ROCKWOOL Fixrock",
    category: "facade",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: false,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: {
      domain: "facade",
      object: "ventilated_facade_insulation_system",
      operation: "insulation_holder_fixing",
      method: "conventional_vhf_fixing",
      materialSystem: "rockwool_fixrock_conventional_system",
      regulated: false,
      confidence: 0.94,
    },
    quantities: {
      areaM2: typeof insulationArea === "number" ? insulationArea : undefined,
      rawDimensions: [],
    },
    formulas: [],
    boqPlan: {
      complexity: "medium",
      sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: [
        "держатели теплоизоляции ROCKWOOL Fixrock для обычного крепления VHF",
        "плиты Fixrock выбранной проектом толщины",
        "элементы фасадной подсистемы по проектной раскладке",
      ],
      requiredLabor: [
        "разметка мест крепления по утверждённой раскладке",
        "установка плит фасадной теплоизоляции",
        "монтаж обычных держателей теплоизоляции",
        "контроль прилегания и непрерывности теплоизоляционного слоя",
      ],
      requiredEquipmentOrWarnings: [
        "буровой инструмент под основание и выбранный держатель",
        "средства доступа и защиты для фасадных работ",
      ],
      requiredLogisticsOrWarnings: [
        "доставка и защищённое хранение плит и держателей",
        "проверка основания и длины анкеровки выполняется отдельно",
      ],
      exclusions: [
        "Клеевой вариант крепления не включён.",
        "Вариант одного дюбеля на плиту требует отдельного согласования и технической консультации ROCKWOOL.",
        "Дополнительный процент запаса держателей автоматически не добавляется.",
      ],
      clarifyingQuestions: [
        "Подтверждены ли обычное крепление держателями и точная площадь утепления?",
        "Исключены ли клеевой вариант и вариант одного дюбеля на плиту?",
        ...rockwoolFixrockMissingQuestionsRuV1(canonicalParameters),
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

function servicesKgAuthorSupervisionPlan(
  text: string,
  currency: string,
): EstimatorReasoningPlan {
  const canonicalParameters = extractKgAuthorSupervisionCanonicalParametersV1(text);
  return {
    intent: "estimate",
    workKey: "services_kg_author_supervision_order_52_npa",
    titleRu: "Профессиональный расчёт: авторский надзор по приказу Минстроя КР №52-нпа",
    category: "documents_design",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: {
      domain: "services",
      object: "author_supervision_service",
      operation: "normative_cost_calculation",
      method: "kg_order_52_npa_appendix_5",
      materialSystem: "kg_order_52_npa_author_supervision",
      regulated: true,
      confidence: 0.98,
    },
    quantities: { count: 1, rawDimensions: [] },
    formulas: [],
    boqPlan: {
      complexity: "complex",
      sections: ["labor", "documents", "delivery"],
      requiredMaterials: ["утверждённый сводный сметный расчёт с выделенной базой глав 1–9"],
      requiredLabor: [
        "авторский надзор по обязательному для объекта объёму",
        "проверка текущей применимости приказа и последующих изменений",
        "ведение и согласование документов авторского надзора",
      ],
      requiredEquipmentOrWarnings: [
        "нормативное число выездов источником не установлено",
      ],
      requiredLogisticsOrWarnings: [
        "проезд на объект и обратно не входит в 0,4% и рассчитывается отдельно при необходимости",
      ],
      exclusions: [
        "Проезд сотрудников проектной организации не включён в нормативную стоимость.",
        "Число выездов и стоимость одного выезда автоматически не выводятся.",
        "Расчёт блокируется без подтверждения текущей юридической применимости.",
      ],
      clarifyingQuestions: [
        "Подтверждены ли обязательность надзора и точная стоимость строительства по главам 1–9?",
        "Проверены ли текущая применимость приказа и более поздние изменения?",
        ...kgAuthorSupervisionMissingQuestionsRuV1(canonicalParameters),
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

function demolitionKrer46Plan(text: string, currency: string): EstimatorReasoningPlan {
  const canonicalParameters = extractKrer46DemolitionCanonicalParametersV1(text);
  const quantity = canonicalParameters?.measured_project_quantity;
  const unit = canonicalParameters?.selected_table_measurement_unit;
  return { intent: "estimate", workKey: "demolition_krer46_selected_table",
    titleRu: "Демонтаж по выбранной таблице КРЕР №46", category: "demolition",
    confidence: "medium", templateExactMatch: false, parsableWorkDetected: true, regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: { domain: "demolition", object: "krer46_selected_demolition_table", operation: "measurement",
      method: "exact_selected_table_same_unit_routing", materialSystem: "kg_krer46_selected_demolition_table",
      regulated: true, confidence: 0.98 },
    quantities: { areaM2: unit === "m2" && typeof quantity === "number" ? quantity : undefined,
      count: unit !== "m2" && typeof quantity === "number" ? quantity : undefined, rawDimensions: [] }, formulas: [],
    boqPlan: { complexity: "complex", sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: ["ведомость сохраняемых и удаляемых материалов по выбранной таблице"],
      requiredLabor: ["демонтаж по составу работ точной таблицы КРЕР №46", "контроль проектного объёма и условий применения"],
      requiredEquipmentOrWarnings: ["машины и механизмы только из выбранных ресурсных строк таблицы"],
      requiredLogisticsOrWarnings: ["вывоз и обращение с материалами по отдельному подтверждённому составу"],
      exclusions: ["Страница сборника не публикует единую универсальную расценку демонтажа.",
        "КРЕР №46 не применяется автоматически к обычному ремонту; единицы, ресурсы, коэффициенты и индексы не угадываются."],
      clarifyingQuestions: ["Подтверждены ли область реконструкции, точная таблица, состав работ и совпадение единиц?",
        "Какие редакция, коэффициенты, ресурсные строки, цены, индексы и условия доступа согласованы?",
        ...krer46DemolitionMissingQuestionsRuV1(canonicalParameters)] }, pricingPolicy: pricingPolicy(currency) };
}

function masonryBiaTn10Plan(text: string, currency: string): EstimatorReasoningPlan {
  const canonicalParameters = extractBiaTn10MasonryCanonicalParametersV1(text);
  return { intent: "estimate", workKey: "masonry_bia_tn10_selected_table_4",
    titleRu: "Кирпичная кладка по выбранной строке BIA TN 10 Table 4", category: "masonry",
    confidence: "medium", templateExactMatch: false, parsableWorkDetected: true, regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: { domain: "masonry", object: "bia_tn10_fired_clay_brick_wall", operation: "measurement_and_procurement",
      method: "selected_table_4_with_project_corrections", materialSystem: "bia_tn10_fired_clay_brick",
      regulated: true, confidence: 0.98 },
    quantities: { areaM2: typeof canonicalParameters?.measured_net_brick_wall_area_m2 === "number"
      ? canonicalParameters.measured_net_brick_wall_area_m2 : undefined, rawDimensions: [] }, formulas: [],
    boqPlan: { complexity: "complex", sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: ["обожжённый глиняный кирпич по выбранной строке BIA TN 10 Table 4",
        "кладочный раствор по выбранной строке BIA TN 10 Table 4"],
      requiredLabor: ["кладка по утверждённой геометрии, толщине стены и типу перевязки", "контроль швов и чистой площади стены"],
      requiredEquipmentOrWarnings: ["средства подачи и подмащивания по отдельному ППР"],
      requiredLogisticsOrWarnings: ["поставка и округление только по подтверждённым упаковкам поставщика"],
      exclusions: ["BIA TN 10 применим только к обожжённому глиняному кирпичу, не к AAC, силикатным или бетонным блокам.",
        "Универсальные расходы кирпича, клея, сетки и раствора не подставляются; Table 4 исключает проектный запас."],
      clarifyingQuestions: ["Подтверждены ли чистая площадь после проёмов, размеры кирпича, шов, стена, перевязка и точная строка Table 4?",
        "Какие поправки, проектный запас, упаковки и согласование применяются?",
        ...biaTn10MasonryMissingQuestionsRuV1(canonicalParameters)] }, pricingPolicy: pricingPolicy(currency) };
}

function formworkRicsNrm2Plan(
  text: string,
  currency: string,
): EstimatorReasoningPlan {
  const canonicalParameters = extractRicsNrm2FormworkCanonicalParametersV1(text);
  const measuredArea = canonicalParameters?.measured_formwork_contact_area_m2;
  return {
    intent: "estimate",
    workKey: "formwork_rics_nrm2_measured_contact_area",
    titleRu: "Профессиональный обмер опалубки по RICS NRM 2",
    category: "concrete",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: {
      domain: "formwork",
      object: "measured_formwork_contact_area",
      operation: "measurement_and_execution",
      method: "rics_nrm2_work_section_11",
      materialSystem: "rics_nrm2_formwork_measurement",
      regulated: true,
      confidence: 0.98,
    },
    quantities: {
      areaM2: typeof measuredArea === "number" ? measuredArea : undefined,
      rawDimensions: [],
    },
    formulas: [],
    boqPlan: {
      complexity: "complex",
      sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: [
        "система опалубки по проектной спецификации",
        "крепёж, связи и разделительный состав по выбранной системе",
      ],
      requiredLabor: [
        "монтаж и демонтаж по фактической площади контакта",
        "устройство проёмов, углов и специальных поверхностей по чертежам",
        "контроль геометрии и класса отделки",
      ],
      requiredEquipmentOrWarnings: [
        "подъём и средства доступа назначаются отдельно по проекту производства работ",
      ],
      requiredLogisticsOrWarnings: [
        "оборачиваемость и поставка системы не выводятся из площади контакта автоматически",
      ],
      exclusions: [
        "Универсальный коэффициент 2,4 м²/м³ не применяется.",
        "Пакет или участок 50 м² автоматически не предполагается.",
        "RICS NRM 2 задаёт правило измерения, а не цену материала или труда.",
      ],
      clarifyingQuestions: [
        "Подтверждены ли все измеряемые грани, проёмы, класс поверхности и односторонняя либо двусторонняя схема?",
        "Какая ревизия чертежа и проектное правило вычетов приняты сметчиком?",
        ...ricsNrm2FormworkMissingQuestionsRuV1(canonicalParameters),
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

function reinforcementBarSchedulePlan(
  text: string,
  currency: string,
): EstimatorReasoningPlan {
  const canonicalParameters = extractReinforcementBarScheduleCanonicalParametersV1(text);
  const approvedWeight = canonicalParameters?.approved_reinforcement_schedule_weight_kg;
  return {
    intent: "estimate",
    workKey: "reinforcement_approved_bar_schedule_weight",
    titleRu: "Профессиональная масса арматуры по утверждённой ведомости стержней",
    category: "concrete",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: {
      domain: "reinforcement",
      object: "approved_reinforcement_bar_schedule",
      operation: "measurement_and_procurement",
      method: "approved_bbs_with_selected_standard_mass_table",
      materialSystem: "fhwa_rics_reinforcement_schedule",
      regulated: true,
      confidence: 0.98,
    },
    quantities: {
      count: typeof approvedWeight === "number" ? approvedWeight : undefined,
      rawDimensions: [],
    },
    formulas: [],
    boqPlan: {
      complexity: "complex",
      sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: [
        "арматурная сталь по утверждённой ведомости стержней",
        "фиксаторы, соединители и аксессуары по проектному составу",
      ],
      requiredLabor: [
        "изготовление арматуры по ведомости стержней",
        "монтаж, вязка и соединение по конструктивным чертежам",
        "приёмочный контроль класса, диаметра, формы и положения",
      ],
      requiredEquipmentOrWarnings: [
        "резка, гибка и подъём назначаются отдельно по ведомости и ППР",
      ],
      requiredLogisticsOrWarnings: [
        "длины поставки и пакетирование применяются только как документированные ограничения поставщика",
      ],
      exclusions: [
        "Универсальный расход 95 кг/м³ бетона не применяется.",
        "Формула d²/162 не заменяет выбранную стандартную или продуктовую таблицу массы.",
        "Автоматический запас и округление до пакета не добавляются.",
      ],
      clarifyingQuestions: [
        "Утверждены ли ведомость стержней, чертёж, стандарт, класс, размеры и формы?",
        "Включены ли нахлёсты, крюки, фиксаторы, соединители и запас изготовления в утверждённую массу?",
        ...reinforcementBarScheduleMissingQuestionsRuV1(canonicalParameters),
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

function deliveryFordTransitPlan(text: string, currency: string): EstimatorReasoningPlan {
  const canonicalParameters = extractFordTransitDeliveryCanonicalParametersV1(text);
  return {
    intent: "estimate", workKey: "delivery_ford_transit_v363_selected_limits",
    titleRu: "Расчёт рейсов выбранного Ford Transit V363",
    category: "delivery_equipment", confidence: "medium", templateExactMatch: false,
    parsableWorkDetected: true, regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: {
      domain: "delivery", object: "selected_vehicle_delivery", operation: "transport",
      method: "weight_and_volume_constrained_trip_count", materialSystem: "ford_transit_v363_delivery",
      regulated: true, confidence: 0.98,
    },
    quantities: { count: 1, rawDimensions: [] }, formulas: [],
    boqPlan: {
      complexity: "complex", sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: ["крепёжные и упаковочные материалы по подтверждённой схеме груза"],
      requiredLabor: ["погрузка, крепление и разгрузка груза по подтверждённой схеме"],
      requiredEquipmentOrWarnings: ["выбранный Ford Transit V363 500 L4 H3 с подтверждёнными ограничениями"],
      requiredLogisticsOrWarnings: ["рейсы Ford Transit по ограничениям массы и объёма"],
      exclusions: [
        "Рекламные 2357 кг и 15,1 м³ не применяются к произвольной модификации.",
        "Тариф, маршрут, крепление, осевые нагрузки и совместимость не выводятся автоматически.",
      ],
      clarifyingQuestions: [
        "Какие фактические грузоподъёмность и полезный объём подтверждены для выбранной машины?",
        "Подтверждены ли осевые нагрузки, крепление, маршрут, доступ и отдельный тариф перевозчика?",
        ...fordTransitDeliveryMissingQuestionsRuV1(canonicalParameters),
      ],
    }, pricingPolicy: pricingPolicy(currency),
  };
}

function cleaningTennantT350Plan(text: string, currency: string): EstimatorReasoningPlan {
  const canonicalParameters = extractTennantT350CanonicalParametersV1(text);
  return {
    intent: "estimate", workKey: "cleaning_tennant_t350_600mm_conventional", titleRu: "Машинная уборка Tennant T350 600 мм conventional",
    category: "cleaning", confidence: "medium", templateExactMatch: false, parsableWorkDetected: true, regulatedWorkDetected: false,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: { domain: "cleaning", object: "mechanized_hard_floor_cleaning", operation: "cleaning",
      method: "conventional_practical_productivity", materialSystem: "tennant_t350_conventional", regulated: false, confidence: 0.98 },
    quantities: { areaM2: typeof canonicalParameters?.cleanable_hard_floor_area_m2 === "number" ? canonicalParameters.cleanable_hard_floor_area_m2 : undefined, rawDimensions: [] },
    formulas: [], boqPlan: { complexity: "medium", sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: ["моющий раствор и расходные материалы по отдельной карте загрязнения"],
      requiredLabor: ["оператор поломоечной машины", "ручная детальная уборка недоступных зон"],
      requiredEquipmentOrWarnings: ["Tennant T350 600 мм dual-disk в режиме conventional"],
      requiredLogisticsOrWarnings: ["доставка, зарядка, слив и заполнение по проектной схеме"],
      exclusions: ["Производительность ec-H2O 2874 м²/ч не применяется.", "Труд оператора, ручная детализация и шаг тарификации поставщика считаются отдельно."],
      clarifyingQuestions: ["Подтверждены ли площадь, число проходов, загрязнение и препятствия?", ...tennantT350MissingQuestionsRuV1(canonicalParameters)] },
    pricingPolicy: pricingPolicy(currency),
  };
}

function equipmentRentUnitedRentalsPlan(text: string, currency: string): EstimatorReasoningPlan {
  const canonicalParameters = extractUnitedRentalsCaOneShiftCanonicalParametersV1(text);
  return {
    intent: "estimate", workKey: "equipment_rent_united_rentals_ca_one_shift",
    titleRu: "Аренда оборудования United Rentals Canada — одна смена",
    category: "delivery_equipment", confidence: "medium", templateExactMatch: false,
    parsableWorkDetected: true, regulatedWorkDetected: false,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: { domain: "equipment_rent", object: "selected_equipment_rental", operation: "rent",
      method: "supplier_one_shift_normal_use_allowance", materialSystem: "united_rentals_canada_one_shift",
      regulated: false, confidence: 0.98 },
    quantities: { count: typeof canonicalParameters?.shift_count === "number" ? canonicalParameters.shift_count : 1,
      rawDimensions: [] }, formulas: [],
    boqPlan: { complexity: "medium", sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: ["топливо и расходные материалы по отдельной позиции договора"],
      requiredLabor: ["оператор выбранной машины по отдельной трудовой калькуляции"],
      requiredEquipmentOrWarnings: ["точно выбранное power equipment по договору United Rentals Canada"],
      requiredLogisticsOrWarnings: ["доставка, вывоз и календарный период аренды по подтверждённому договору"],
      exclusions: ["8 часов в день — лимит нормальной эксплуатации, а не производительность и не формула цены.",
        "Двойная/тройная смена, выходные, топливо, налоги, оператор, страхование и тариф поставщика считаются отдельно."],
      clarifyingQuestions: ["Подтверждены ли даты, одна смена, выбранная машина и отдельные начисления?",
        ...unitedRentalsCaOneShiftMissingQuestionsRuV1(canonicalParameters)] },
    pricingPolicy: pricingPolicy(currency),
  };
}

function landscapingRainBirdXfdPlan(text: string, currency: string): EstimatorReasoningPlan {
  const canonicalParameters = extractRainBirdXfdCanonicalParametersV1(text);
  return {
    intent: "estimate", workKey: "landscaping_rain_bird_xfd_06_12_500",
    titleRu: "Капельный полив Rain Bird XFD-06-12-500", category: "landscaping",
    confidence: "medium", templateExactMatch: false, parsableWorkDetected: true, regulatedWorkDetected: false,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: { domain: "irrigation", object: "irrigation_system", operation: "installation",
      method: "hydraulically_approved_dripline_route", materialSystem: "rain_bird_xfd_06_12_500",
      regulated: false, confidence: 0.98 },
    quantities: { lengthM: typeof canonicalParameters?.approved_dripline_route_linear_m === "number"
      ? canonicalParameters.approved_dripline_route_linear_m : undefined, rawDimensions: [] }, formulas: [],
    boqPlan: { complexity: "medium", sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: ["Rain Bird XFD-06-12-500", "фитинги, коллекторы и промывочные точки по отдельным ведомостям"],
      requiredLabor: ["укладка капельной линии по утверждённой трассе", "промывка и гидравлическая проверка зоны"],
      requiredEquipmentOrWarnings: ["фильтрация 120 mesh и регулирование давления по проекту"],
      requiredLogisticsOrWarnings: ["бухты 152,4 м раскраиваются по явному плану повторного использования остатков"],
      exclusions: ["Единица длины на единицу трассы — геометрическая тождественность, а не универсальная норма расхода.",
        "Производитель не задаёт общий процент запаса; фитинги, коллекторы, промывка и округление бухт считаются отдельно."],
      clarifyingQuestions: ["Подтверждены ли точная модель, ячейка таблицы lateral length и гидравлический проект зоны?",
        ...rainBirdXfdMissingQuestionsRuV1(canonicalParameters)] }, pricingPolicy: pricingPolicy(currency),
  };
}

function windowsDoorsSoudafoamPlan(text: string, currency: string): EstimatorReasoningPlan {
  const canonicalParameters = extractSoudafoamGeniusCanonicalParametersV1(text);
  return { intent: "estimate", workKey: "windows_doors_soudafoam_genius_9900539",
    titleRu: "Монтажный шов Soudafoam Window & Door Genius 600 мл", category: "doors_windows",
    confidence: "medium", templateExactMatch: false, parsableWorkDetected: true, regulatedWorkDetected: false,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: { domain: "windows_doors", object: "window_door_joint", operation: "installation",
      method: "onsite_validated_joint_yield", materialSystem: "soudafoam_genius_9900539", regulated: false, confidence: 0.98 },
    quantities: { lengthM: typeof canonicalParameters?.qualified_joint_length_linear_m === "number"
      ? canonicalParameters.qualified_joint_length_linear_m : undefined, rawDimensions: [] }, formulas: [],
    boqPlan: { complexity: "medium", sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: ["Soudafoam Window & Door Genius 600 мл", "ленты, мембраны и герметики по отдельной системе шва"],
      requiredLabor: ["подготовка и увлажнение основания", "послойное заполнение монтажного шва"],
      requiredEquipmentOrWarnings: ["контроль температур баллона, воздуха и поверхности"],
      requiredLogisticsOrWarnings: ["хранение и срок годности по подтверждённой партии"],
      exclusions: ["Справочные 16 м по EN 17333-1 не применяются как фиксированный площадочный выход.",
        "Значение 26 м для другого 750 мл gun-grade продукта, UV-защита, крепления, ленты и мембраны исключены."],
      clarifyingQuestions: ["Подтверждены ли геометрия шва и фактический выход 600 мл баллона на объекте?",
        ...soudafoamGeniusMissingQuestionsRuV1(canonicalParameters)] }, pricingPolicy: pricingPolicy(currency) };
}

function earthworksFhwaFp24Plan(text: string, currency: string): EstimatorReasoningPlan {
  const canonicalParameters = extractFhwaFp24Section208CanonicalParametersV1(text);
  return { intent: "estimate", workKey: "earthworks_fhwa_fp24_section208_structural_backfill",
    titleRu: "Послойная обратная засыпка FHWA FP-24 §208", category: "roadworks",
    confidence: "medium", templateExactMatch: false, parsableWorkDetected: true, regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: { domain: "earthworks", object: "structural_backfill", operation: "backfill",
      method: "fhwa_fp24_section208_lifts", materialSystem: "fhwa_fp24_section208", regulated: true, confidence: 0.98 },
    quantities: { lengthM: typeof canonicalParameters?.compacted_backfill_depth_m === "number"
      ? canonicalParameters.compacted_backfill_depth_m : undefined, rawDimensions: [] }, formulas: [],
    boqPlan: { complexity: "complex", sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: ["structural backfill по квалификации §704.01"],
      requiredLabor: ["равномерная послойная укладка вокруг сооружения", "приёмка плотности каждого слоя"],
      requiredEquipmentOrWarnings: ["уплотняющее оборудование по явному проектному выбору", "два in-place density tests на слой"],
      requiredLogisticsOrWarnings: ["источник материала и ограничения котлована по проекту"],
      exclusions: ["6 дюймов — максимальная, а не автоматически назначаемая толщина уплотнённого слоя.",
        "Каменистый материал, текущий водоток и региональная геотехника требуют отдельных процедур."],
      clarifyingQuestions: ["Подтверждены ли применимость §208, дополнение проекта, материал, плотность и метод испытаний?",
        ...fhwaFp24Section208MissingQuestionsRuV1(canonicalParameters)] }, pricingPolicy: pricingPolicy(currency) };
}

function wasteRemovalEpaPlan(text: string, currency: string): EstimatorReasoningPlan {
  const canonicalParameters = extractEpaCdWasteCanonicalParametersV1(text);
  const concrete = canonicalParameters?.waste_material_class_confirmed === "EPA_CD_CONCRETE";
  return { intent: "estimate", workKey: concrete ? "waste_removal_us_epa_cd_concrete" : "waste_removal_us_epa_cd_composite",
    titleRu: concrete ? "Плановая масса бетонного лома по US EPA" : "Плановая масса смешанных C&D отходов по US EPA",
    category: "demolition", confidence: "medium", templateExactMatch: false, parsableWorkDetected: true, regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: { domain: "waste_removal", object: "epa_cd_waste_planning_mass", operation: "conversion",
      method: "epa_2016_volume_to_weight", materialSystem: concrete ? "us_epa_cd_concrete" : "us_epa_cd_composite",
      regulated: true, confidence: 0.98 },
    quantities: { volumeM3: typeof canonicalParameters?.measured_epa_compatible_concrete_debris_volume_m3 === "number"
      ? canonicalParameters.measured_epa_compatible_concrete_debris_volume_m3 :
      typeof canonicalParameters?.measured_epa_compatible_composite_cd_volume_m3 === "number"
        ? canonicalParameters.measured_epa_compatible_composite_cd_volume_m3 : undefined, rawDimensions: [] }, formulas: [],
    boqPlan: { complexity: "medium", sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: ["класс отходов и состояние измеренного объёма по точной строке EPA"],
      requiredLabor: ["обмер объёма и проверка фактической массы на весовой"],
      requiredEquipmentOrWarnings: ["контейнер и уплотнение по отдельным правилам перевозчика"],
      requiredLogisticsOrWarnings: ["грузоподъёмность, рейсы и утилизация рассчитываются отдельно"],
      exclusions: ["EPA-конверсия — предварительная масса для планирования, не локальная плотность и не тариф.",
        "Фактическая масса весовой имеет приоритет; контейнеры, рейсы и disposal fee не выводятся из коэффициента."],
      clarifyingQuestions: ["Подтверждены ли точная строка EPA, совместимое состояние объёма и наличие данных весовой?",
        ...epaCdWasteMissingQuestionsRuV1(canonicalParameters)] }, pricingPolicy: pricingPolicy(currency) };
}

function roofWaterproofingPlan(text: string, currency: string): EstimatorReasoningPlan {
  const canonicalParameters = extractSarnafilAt18CanonicalParametersV1(text);
  return {
    intent: "estimate",
    workKey: "dynamic_waterproofing_estimate",
    titleRu: "Профессиональная предварительная смета: гидроизоляция кровли",
    category: "waterproofing",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    // Preserve the current universal-plan safety classification for a roof
    // prompt: work at height is handled as a regulated professional scope.
    regulatedWorkDetected: true,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: {
      domain: "waterproofing",
      object: "waterproofing_surface",
      operation: "waterproofing",
      method: "membrane_or_mastic_waterproofing",
      materialSystem: "roof_waterproofing_system",
      regulated: true,
      confidence: 0.86,
    },
    quantities: {
      areaM2: areaFromPrompt(text),
      rawDimensions: [],
    },
    formulas: [],
    boqPlan: {
      complexity: "complex",
      sections: ["materials", "labor", "equipment", "delivery"],
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
      requiredEquipmentOrWarnings: [
        "газовая горелка warning",
        "ручной инструмент",
      ],
      requiredLogisticsOrWarnings: [
        "доставка гидроизоляции",
        "утилизация отходов",
      ],
      exclusions: [
        "Проектирование, разрешения и скрытые работы уточняются отдельно.",
        "Демонтаж, доставка, подъем и вывоз мусора включаются только при подтверждении условий площадки.",
      ],
      clarifyingQuestions: [
        "Какая кровля: плоская или скатная?",
        "Какой материал выбран: рулонная мембрана, мастика или наплавляемая гидроизоляция?",
        "Есть ли проходки, воронки и примыкания, которые нужно включить в объем?",
        ...sarnafilAt18MissingQuestionsRuV1(canonicalParameters),
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

function insulationPlan(text: string, currency: string): EstimatorReasoningPlan {
  const canonicalParameters = extractRockwoolComfortboard80CanonicalParametersV1(text);
  return {
    intent: "estimate",
    workKey: "dynamic_insulation_estimate",
    titleRu: "Профессиональная предварительная смета: теплоизоляция",
    category: "insulation",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: false,
    canonicalParameters: canonicalParameters ?? undefined,
    semanticFrame: {
      domain: "insulation",
      object: "insulation_system",
      operation: "installation",
      method: "thermal_insulation_install",
      materialSystem: "insulation_system",
      regulated: false,
      confidence: 0.86,
    },
    quantities: { areaM2: areaFromPrompt(text), rawDimensions: [] },
    formulas: [],
    boqPlan: {
      complexity: "medium",
      sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: [
        "утеплитель",
        "клей / крепеж утеплителя",
        "ветрозащитная мембрана",
        "армирующая сетка warning",
      ],
      requiredLabor: [
        "подготовка основания",
        "монтаж утеплителя",
        "крепление тарельчатыми дюбелями",
        "контроль мостиков холода",
      ],
      requiredEquipmentOrWarnings: ["нож для утеплителя", "леса warning"],
      requiredLogisticsOrWarnings: ["доставка утеплителя", "хранение сухим способом"],
      exclusions: [
        "Теплотехнический расчёт и региональные требования подтверждаются проектом.",
        "Раскройный запас и число упаковок считаются только по полной карте раскроя.",
      ],
      clarifyingQuestions: [
        "Где выполняется утепление: фасад, кровля, пол или внутренняя стена?",
        "Каковы требования проекта к тепловому сопротивлению и пожарной безопасности?",
        ...rockwoolComfortboard80MissingQuestionsRuV1(canonicalParameters),
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

/**
 * Builds the same estimator-kernel plan after the request router has already
 * resolved one of its two owned domains. This avoids repeating the universal
 * 11,610-work lexicon scan on Hermes; it is not an exact-prompt lookup.
 */
export function buildOwnedDomainEstimatorReasoningPlan(input: {
  text: string;
  owner: DirectConsumerRepairOpenWorldOwner;
  currency?: string;
  canonicalParameters?: ElectricalCanonicalParameterValues;
}): EstimatorReasoningPlan {
  const currency = input.currency ?? "KGS";
  return input.owner === "electrical"
    ? electricalPlan(input.text, currency, input.canonicalParameters)
    : input.owner === "demolition"
      ? demolitionKrer46Plan(input.text, currency)
    : input.owner === "waste_removal"
      ? wasteRemovalEpaPlan(input.text, currency)
    : input.owner === "earthworks"
      ? earthworksFhwaFp24Plan(input.text, currency)
    : input.owner === "windows_doors"
      ? windowsDoorsSoudafoamPlan(input.text, currency)
    : input.owner === "landscaping"
      ? landscapingRainBirdXfdPlan(input.text, currency)
    : input.owner === "equipment_rent"
      ? equipmentRentUnitedRentalsPlan(input.text, currency)
    : input.owner === "cleaning"
      ? cleaningTennantT350Plan(input.text, currency)
    : input.owner === "delivery"
      ? deliveryFordTransitPlan(input.text, currency)
    : input.owner === "carpentry"
      ? carpentrySikagardWoodPreserverPlan(input.text, currency)
    : input.owner === "fire_safety"
      ? fireSafetySiemensFdb221Plan(input.text, currency)
    : input.owner === "low_voltage"
      ? lowVoltageLegrand049272Plan(input.text, currency)
    : input.owner === "metalwork"
      ? metalworkJotunHardtopXpPlan(input.text, currency)
    : input.owner === "facade"
      ? facadeRockwoolFixrockPlan(input.text, currency)
    : input.owner === "services"
      ? servicesKgAuthorSupervisionPlan(input.text, currency)
    : input.owner === "masonry"
      ? masonryBiaTn10Plan(input.text, currency)
    : input.owner === "formwork"
      ? formworkRicsNrm2Plan(input.text, currency)
    : input.owner === "reinforcement"
      ? reinforcementBarSchedulePlan(input.text, currency)
    : input.owner === "sewerage"
      ? sewerageWavinOsmaC3766BkPlan(input.text, currency)
    : input.owner === "roof_waterproofing"
      ? roofWaterproofingPlan(input.text, currency)
      : insulationPlan(input.text, currency);
}
