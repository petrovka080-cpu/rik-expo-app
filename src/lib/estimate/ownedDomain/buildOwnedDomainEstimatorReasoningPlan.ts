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
    : input.owner === "carpentry"
      ? carpentrySikagardWoodPreserverPlan(input.text, currency)
    : input.owner === "fire_safety"
      ? fireSafetySiemensFdb221Plan(input.text, currency)
    : input.owner === "low_voltage"
      ? lowVoltageLegrand049272Plan(input.text, currency)
    : input.owner === "metalwork"
      ? metalworkJotunHardtopXpPlan(input.text, currency)
    : input.owner === "roof_waterproofing"
      ? roofWaterproofingPlan(input.text, currency)
      : insulationPlan(input.text, currency);
}
