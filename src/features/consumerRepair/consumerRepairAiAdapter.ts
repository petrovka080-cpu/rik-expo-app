import {
  buildConsumerRepairAiDraftFromGlobalEstimate,
  type ConsumerRepairAiDraft,
  type ConsumerRepairSelectedWork,
} from "../../lib/consumerRequests";
import { answerBuiltInAi } from "../../lib/ai/builtInAi";
import { resolveCountryRegionCity, type GlobalLocalContext } from "../../lib/ai/globalLocalContext";
import { formatEstimateUnitLabel, formatEstimateUserTextRu } from "../../lib/ai/globalEstimate";
import {
  calculateExpandedComplexEstimate,
  isExpandedComplexWorkFamilyId,
  type ExpandedComplexBoqRow,
} from "../../lib/ai/expandedComplexWorks";
import {
  calculateCapitalRenovationFromPrompt,
  capitalRenovationFormulaTrace,
  capitalRenovationQuantitySummary,
} from "../estimates/calculator/families/capitalRenovationCalculator";
import type { CapitalRenovationEstimateRow } from "../estimates/calculator/families/capitalRenovationRecipes";

const DANGEROUS_PATTERNS = [
  /газ|gas/i,
  /проводк|электр|щит|под\s+напряж|напряж|розетк|socket|electrical|wiring/i,
  /несущ|load[-\s]?bearing/i,
  /запах\s+гари|горит|пожар|fire/i,
  /кровл|крыша|высот|roof|height/i,
  /плесен|хими|mold|chemical/i,
] as const;

export const CONSUMER_REPAIR_DANGEROUS_COPY =
  "Это может быть опасно. Не выполняйте ремонт самостоятельно. Я подготовлю заявку для специалиста.";

const CONSUMER_REPAIR_DANGEROUS_UI_COPY = CONSUMER_REPAIR_DANGEROUS_COPY;

export type ConsumerRepairAiDraftOptions = {
  countryCode?: string | null;
  city?: string | null;
  region?: string | null;
  userLocale?: string | null;
  currency?: string | null;
  selectedWorkKey?: string | null;
  selectedWork?: ConsumerRepairSelectedWork | null;
};

export function isDangerousConsumerRepairProblem(problemText: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(problemText));
}

function isExplicitDangerousDiyAttempt(problemText: string): boolean {
  return isDangerousConsumerRepairProblem(problemText) && /сам|сама|самостоятель|своими\s+руками|diy/i.test(problemText);
}

function extractArea(text: string): number {
  const match = text.match(/(\d+(?:[,.]\d+)?)\s*(?:кв\.?\s*м|кв|квадрат|метр|м2|м²|sqm|sq\.?\s*m)/i);
  if (!match) return 20;
  return Math.max(1, Number(match[1].replace(",", ".")) || 20);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function flooringDraft(problemText: string, covering: "ламинат" | "паркет" | "пол"): ConsumerRepairAiDraft {
  const area = extractArea(problemText);
  const coveringQty = round(area * 1.1);
  const underlay = round(area * 1.05);
  const plinth = round(area * 0.8);
  const isParquet = covering === "паркет";
  const isGenericFloor = covering === "пол";

  return {
    titleRu: isParquet ? "Укладка паркета" : isGenericFloor ? "Ремонт пола" : "Укладка ламината",
    summaryRu: `Я подготовил черновик заявки на ${isGenericFloor ? "ремонт пола" : `укладку ${covering}`} ${area} м².`,
    repairType: "flooring",
    dangerousDiyBlocked: false,
    missingData: [
      "город",
      "нужен ли демонтаж старого покрытия",
      "точный тип покрытия",
      "нужна ли доставка материала",
      "когда удобно принять мастера",
    ],
    items: [
      {
        itemType: "material",
        titleRu: isParquet ? "Паркет / инженерная доска" : "Ламинат",
        quantity: coveringQty,
        unit: "м²",
        source: "ai_suggested",
      },
      { itemType: "material", titleRu: "Подложка", quantity: underlay, unit: "м²", source: "ai_suggested" },
      { itemType: "material", titleRu: "Плинтус", quantity: plinth, unit: "пог. м", source: "ai_suggested" },
      { itemType: "material", titleRu: "Пороги / стыки", quantity: 5, unit: "шт", source: "ai_suggested" },
      {
        itemType: "work",
        titleRu: isParquet ? "Укладка паркета" : "Укладка ламината",
        quantity: area,
        unit: "м²",
        source: "ai_suggested",
      },
      { itemType: "work", titleRu: "Монтаж плинтуса", quantity: plinth, unit: "пог. м", source: "ai_suggested" },
    ],
  };
}

function plumbingDraft(): ConsumerRepairAiDraft {
  return {
    titleRu: "Сантехническая заявка",
    summaryRu: "Я подготовил черновик заявки для сантехника. Количество и состав можно изменить.",
    repairType: "plumbing",
    dangerousDiyBlocked: false,
    missingData: ["город", "точный адрес", "фото проблемного места", "когда удобно принять мастера"],
    items: [
      {
        itemType: "work",
        titleRu: "Диагностика сантехнической проблемы",
        quantity: 1,
        unit: "выезд",
        source: "ai_suggested",
      },
      {
        itemType: "service",
        titleRu: "Ремонт / замена узла после осмотра",
        quantity: 1,
        unit: "комплект",
        source: "ai_suggested",
      },
    ],
  };
}

function genericDraft(): ConsumerRepairAiDraft {
  return {
    titleRu: "Заявка на ремонт",
    summaryRu: "Я подготовил черновик заявки. Проверьте позиции и добавьте фото, если они есть.",
    repairType: "repair",
    dangerousDiyBlocked: false,
    missingData: ["город", "адрес", "фото проблемы", "желаемая дата", "контактный телефон"],
    items: [
      {
        itemType: "work",
        titleRu: "Осмотр и уточнение объёма работ",
        quantity: 1,
        unit: "выезд",
        source: "ai_suggested",
      },
      {
        itemType: "service",
        titleRu: "Ремонтные работы после согласования",
        quantity: 1,
        unit: "комплект",
        source: "ai_suggested",
      },
    ],
  };
}

function capitalRenovationItemType(row: CapitalRenovationEstimateRow): "material" | "work" | "service" {
  if (row.lineType === "material") return "material";
  if (row.lineType === "work") return "work";
  return "service";
}

function expandedComplexItemType(row: ExpandedComplexBoqRow): "material" | "work" | "service" {
  if (row.lineType === "material") return "material";
  if (row.lineType === "work") return "work";
  return "service";
}

function expandedComplexDraft(problemText: string, options?: ConsumerRepairAiDraftOptions): ConsumerRepairAiDraft | null {
  const forcedFamilyId = options?.selectedWorkKey && isExpandedComplexWorkFamilyId(options.selectedWorkKey)
    ? options.selectedWorkKey
    : null;
  const result = calculateExpandedComplexEstimate({ prompt: problemText, familyId: forcedFamilyId });
  if (!result) return null;
  const currency = options?.currency ?? "KGS";
  const rows = [
    ...result.material_rows,
    ...result.work_rows,
    ...result.equipment_rows,
    ...result.service_rows,
  ];
  const selectedWork: ConsumerRepairSelectedWork = options?.selectedWork
    ? {
      selectedWorkKey: options.selectedWork.selectedWorkKey,
      selectedWorkTitleRu: options.selectedWork.selectedWorkTitleRu,
      selectedWorkCategoryKey: options.selectedWork.selectedWorkCategoryKey,
      selectedWorkCategoryTitleRu: options.selectedWork.selectedWorkCategoryTitleRu,
      selectedWorkRawInput: problemText,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    }
    : {
      selectedWorkKey: result.work_family_id,
      selectedWorkTitleRu: result.professionalNameRu,
      selectedWorkCategoryKey: "other",
      selectedWorkCategoryTitleRu: "Инженерные и промышленные работы",
      selectedWorkRawInput: problemText,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    };

  return {
    titleRu: result.professionalNameRu,
    summaryRu: [
      `${result.professionalNameRu}. Предварительная BOQ-смета по инженерным нормам.`,
      `Строк: ${rows.length}; цены не заполнены, итог не рассчитывается.`,
      result.missing_design_inputs.length > 0 ? `Для детальной сметы нужны: ${result.missing_design_inputs.slice(0, 4).join("; ")}.` : "",
    ].filter(Boolean).join(" "),
    repairType: result.work_family_id,
    selectedWork,
    dangerousDiyBlocked: false,
    missingData: result.missing_design_inputs,
    items: rows.map((row, rowIndex) => ({
      itemType: expandedComplexItemType(row),
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      unitLabel: formatEstimateUnitLabel(row.unit),
      unitPrice: null,
      currency,
      source: "reference_price_book",
      category: row.group,
      sourceId: row.normSourceId,
      sourceLabel: "Источник цены не выбран",
      formulaId: row.formulaId,
      quantityFormula: row.quantityFormula,
      calculationTrace: `${row.code}: ${row.quantityFormula}`,
      sourceParameters: {
        ...row.sourceParameters,
        expandedComplexCalculator: true,
        expandedComplexWorkFamilyId: result.work_family_id,
        expandedComplexProfessionalNameRu: result.professionalNameRu,
        expandedComplexLineType: row.lineType,
        expandedComplexRowIndex: rowIndex,
        expandedComplexEstimateLevel: result.estimate_level,
        includedInProcurement: row.includedInProcurement,
      },
      templateId: `${result.work_family_id}_${result.estimate_level.toLowerCase()}_expanded_complex_v1`,
      templateVersion: "1.0.0",
      normId: row.normId,
      normFamilyId: row.normFamilyId,
      normSourceId: row.normSourceId,
      normSourceTitle: row.normSourceTitle,
      normVersion: row.normVersion,
      normReviewStatus: row.normReviewStatus,
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Источник цены не выбран",
      costConfidence: "missing",
      confidence: "medium",
      addedBy: "ai",
      materialKey: row.materialKey ?? null,
      rateKey: `expanded_complex_${row.code}`,
    })),
  };
}

function capitalRenovationDraft(problemText: string, options?: ConsumerRepairAiDraftOptions): ConsumerRepairAiDraft | null {
  const result = calculateCapitalRenovationFromPrompt(problemText);
  if (!result) return null;
  const currency = options?.currency ?? "KGS";
  const derived = capitalRenovationQuantitySummary(result.geometry);
  const selectedWork: ConsumerRepairSelectedWork = {
    selectedWorkKey: "apartment_capital_renovation",
    selectedWorkTitleRu: "Капитальный ремонт квартиры",
    selectedWorkCategoryKey: "special_repair",
    selectedWorkCategoryTitleRu: "Ремонт",
    selectedWorkRawInput: problemText,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
  return {
    titleRu: "Капитальный ремонт квартиры",
    summaryRu: [
      "Предварительный расчёт по допущениям. Требуется уточнение.",
      `Площадь: ${result.geometry.areaM2} м²; потолок: ${result.geometry.ceilingHeightM} м; санузлы: ${result.geometry.bathroomsCount}.`,
      "Полный итог не рассчитан: цены не заполнены, источник цен не выбран.",
    ].join(" "),
    repairType: "apartment_capital_renovation",
    selectedWork,
    dangerousDiyBlocked: false,
    missingData: result.missingParameters,
    items: result.rows.map((row, rowIndex) => ({
      itemType: capitalRenovationItemType(row),
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      unitLabel: formatEstimateUnitLabel(row.unit),
      unitPrice: null,
      currency,
      source: "reference_price_book",
      category: row.groupId,
      sourceId: "src_professional_norm_pack_capital_renovation_calculator_v1",
      sourceLabel: "Источник цены не выбран",
      formulaId: `capital_renovation_${row.code}_formula_v1`,
      quantityFormula: row.formula,
      calculationTrace: capitalRenovationFormulaTrace(row, result.geometry),
      sourceParameters: {
        rowCode: row.code,
        capitalRenovationCalculator: true,
        capitalRenovationGroupId: row.groupId,
        capitalRenovationGroupTitle: row.groupTitle,
        capitalRenovationLineType: row.lineType,
        capitalRenovationRowIndex: rowIndex,
        includedInProcurement: row.includedInProcurement,
        ...derived,
      },
      templateId: "capital_renovation_professional_calculator_v1",
      templateVersion: "1.0.0",
      normId: `norm:capital_renovation:${row.code}:v1`,
      normFamilyId: `norm_family:capital_renovation:${row.groupId}`,
      normSourceId: "src_professional_norm_pack_capital_renovation_calculator_v1",
      normSourceTitle: "Профессиональные нормы капитального ремонта квартиры: предварительный расчет по допущениям",
      normVersion: "2026.07.03",
      normReviewStatus: "quantity_engineering_reviewed",
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Источник цены не выбран",
      costConfidence: "missing",
      confidence: "medium",
      addedBy: "ai",
      materialKey: row.materialKey ?? null,
      rateKey: row.materialKey ? `capital_renovation_${row.materialKey}` : null,
    })),
  };
}

function safeTriageDraft(problemText: string, safeMessageRu: string | undefined): ConsumerRepairAiDraft {
  const safeMessage = safeMessageRu?.toLocaleLowerCase("ru-RU") ?? "";
  const objectOptions =
    safeMessage.includes("кров") && safeMessage.includes("ванн")
      ? ["объект: кровля, ванная / санузел, фундамент, подвал или балкон / терраса"]
      : [];
  return {
    titleRu: "Нужна ручная сметная проверка",
    summaryRu: safeMessageRu ?? "По запросу нужны уточнения или governed template/source evidence. Я не подставляю generic строки и fake цены.",
    repairType: "estimate_triage",
    dangerousDiyBlocked: false,
    missingData: [
      ...objectOptions,
      "город и страна",
      "точный объект работ",
      "технология / материал",
      "объем и единицы измерения",
      "фото или проектные данные",
    ],
    items: [],
  };
}

function compactText(value: string | null | undefined): string | undefined {
  const compacted = String(value ?? "").trim();
  return compacted.length > 0 ? compacted : undefined;
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function resolveRequestLocalContext(
  text: string,
  options: ConsumerRepairAiDraftOptions | undefined,
): GlobalLocalContext | null {
  if (!options) return null;
  const locationPrompt = unique([text, compactText(options.city) ?? "", compactText(options.region) ?? ""]).join(" ");
  return resolveCountryRegionCity({
    prompt: locationPrompt,
    countryCode: compactText(options.countryCode),
    city: compactText(options.city),
    region: compactText(options.region),
    userLocale: compactText(options.userLocale),
    currency: compactText(options.currency),
  });
}

function applyLocalContextWarnings(
  draft: ConsumerRepairAiDraft,
  context: GlobalLocalContext | null,
): ConsumerRepairAiDraft {
  if (!context?.warnings.length) return draft;
  const warning = context.warnings[0];
  return {
    ...draft,
    summaryRu: draft.summaryRu.includes(warning) ? draft.summaryRu : `${draft.summaryRu} ${warning}`,
    missingData: unique([...context.warnings, ...draft.missingData, "страна и город объекта"]),
  };
}

export function buildConsumerRepairAiDraft(
  problemText: string,
  options?: ConsumerRepairAiDraftOptions,
): ConsumerRepairAiDraft {
  const text = problemText.trim();
  const localContext = resolveRequestLocalContext(text, options);
  const aiCountryCode = localContext
    ? localContext.completeness === "LOCAL_CONTEXT_MISSING" ? "XX" : localContext.countryCode ?? "XX"
    : "KG";
  const aiCity = localContext
    ? localContext.completeness === "LOCAL_CONTEXT_MISSING" ? undefined : localContext.city
    : "Bishkek";
  if (isExplicitDangerousDiyAttempt(text)) {
    return applyLocalContextWarnings({
      ...genericDraft(),
      titleRu: "\u0417\u0430\u044f\u0432\u043a\u0430 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u0443",
      summaryRu: CONSUMER_REPAIR_DANGEROUS_UI_COPY,
      dangerousDiyBlocked: true,
      safetyMessageRu: CONSUMER_REPAIR_DANGEROUS_UI_COPY,
    }, localContext);
  }
  const capitalRenovation = capitalRenovationDraft(text, options);
  if (capitalRenovation) return applyLocalContextWarnings(capitalRenovation, localContext);
  const expandedComplex = expandedComplexDraft(text, options);
  if (expandedComplex) return applyLocalContextWarnings(expandedComplex, localContext);
  if (options?.selectedWorkKey) {
    const selectedAnswer = answerBuiltInAi({
      text,
      screenContext: "request",
      route: "/request",
      role: "consumer",
      countryCode: aiCountryCode,
      cityOrRegion: aiCity,
      explicitWorkKey: options.selectedWorkKey,
    });
    const selectedEstimate = selectedAnswer.toolResult.estimate;
    if (!selectedEstimate) return applyLocalContextWarnings(safeTriageDraft(text, selectedAnswer.toolResult.fallbackUsed), localContext);
    return applyLocalContextWarnings(
      buildConsumerRepairAiDraftFromGlobalEstimate(selectedEstimate, undefined, options.selectedWork ?? undefined),
      localContext,
    );
  }
  const builtInAiEstimate = answerBuiltInAi({
    text,
    screenContext: "request",
    route: "/request",
    role: "consumer",
    countryCode: aiCountryCode,
    cityOrRegion: aiCity,
  });
  if (builtInAiEstimate.toolResult.estimate) {
    return applyLocalContextWarnings(
      buildConsumerRepairAiDraftFromGlobalEstimate(builtInAiEstimate.toolResult.estimate),
      localContext,
    );
  }
  if (
    builtInAiEstimate.toolResult.blockedBy === "AMBIGUOUS_NEEDS_DISAMBIGUATION" ||
    builtInAiEstimate.toolResult.blockedBy === "TEMPLATE_GAP_SAFE_TRIAGE"
  ) {
    return applyLocalContextWarnings(safeTriageDraft(text, builtInAiEstimate.toolResult.fallbackUsed), localContext);
  }
  if (isDangerousConsumerRepairProblem(text)) {
    return applyLocalContextWarnings({
      ...genericDraft(),
      titleRu: "\u0417\u0430\u044f\u0432\u043a\u0430 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u0443",
      summaryRu: CONSUMER_REPAIR_DANGEROUS_UI_COPY,
      dangerousDiyBlocked: true,
      safetyMessageRu: CONSUMER_REPAIR_DANGEROUS_UI_COPY,
    }, localContext);
  }
  const lowercaseText = text.toLocaleLowerCase("ru-RU");
  if (lowercaseText.includes("\u043b\u0430\u043c\u0438\u043d\u0430\u0442")) return applyLocalContextWarnings(flooringDraft(text, "\u043b\u0430\u043c\u0438\u043d\u0430\u0442"), localContext);
  if (lowercaseText.includes("\u043f\u0430\u0440\u043a\u0435\u0442") || lowercaseText.includes("\u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043d")) return applyLocalContextWarnings(flooringDraft(text, "\u043f\u0430\u0440\u043a\u0435\u0442"), localContext);
  if (/ламинат/i.test(text)) return applyLocalContextWarnings(flooringDraft(text, "ламинат"), localContext);
  if (/паркет|инженерн/i.test(text)) return applyLocalContextWarnings(flooringDraft(text, "паркет"), localContext);
  if (/пол|плинтус|подложк/i.test(text)) return applyLocalContextWarnings(flooringDraft(text, "пол"), localContext);
  if (/сантех|смесител|труб|протеч|кран/i.test(text)) return applyLocalContextWarnings(plumbingDraft(), localContext);
  return applyLocalContextWarnings(genericDraft(), localContext);
}

export function composeConsumerRepairDraftAnswerRu(draft: ConsumerRepairAiDraft): string {
  return [
    "Коротко:",
    formatEstimateUserTextRu(draft.summaryRu),
    "",
    "Позиции:",
    ...draft.items.map((item, index) => `${index + 1}. ${item.titleRu} - ${item.quantity} ${formatEstimateUnitLabel(item.unit)}`),
    "",
    "Что уточнить:",
    ...draft.missingData.map((item) => `- ${item}`),
    "",
    "Следующий шаг:",
    "Проверьте количество и нажмите «Утвердить заявку».",
    "",
    "Статус:",
    "Черновик. Не отправлен.",
  ].join("\n");
}
