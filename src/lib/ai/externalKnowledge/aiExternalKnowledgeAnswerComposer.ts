import {
  requestRequiresAiExternalReview,
} from "./aiExternalKnowledgePolicy";
import {
  planAiExternalKnowledge,
  type AiExternalKnowledgePlan,
  type AiExternalKnowledgePlanInput,
} from "./aiExternalKnowledgePlanner";
import type {
  AiExternalKnowledgeRequest,
  AiExternalKnowledgeResult,
} from "./aiExternalKnowledgeRequest";
import { retrieveAiExternalKnowledgeSources } from "./aiExternalKnowledgeProviderRegistry";
import { rankAiExternalSources } from "./aiExternalSourceRanker";
import { sanitizeAiExternalSources } from "./aiExternalSourceSanitizer";
import { composeAiExternalSourceDisclosure } from "./aiExternalSourceDisclosureComposer";
import { guardAiExternalKnowledge } from "./aiExternalKnowledgeGuard";
import type { AiExternalKnowledgeSourceRef } from "./aiExternalKnowledgeSourceTypes";

export type AiExternalKnowledgeAnswer = {
  plan: AiExternalKnowledgePlan;
  result: AiExternalKnowledgeResult;
  answerTextRu: string;
  guard: ReturnType<typeof guardAiExternalKnowledge>;
  ranks: ReturnType<typeof rankAiExternalSources>;
};

const constructionWorkPack: Record<string, {
  workRu: string;
  steps: string[];
  materials: string[];
  missing: string[];
}> = {
  asphalt_paving: {
    workRu: "асфальт",
    steps: [
      "подготовка и проверка основания",
      "планировка и уплотнение",
      "щебеночное основание, если требуется проектом",
      "битумная эмульсия по проекту/технологии",
      "доставка и укладка асфальтобетонной смеси",
      "уплотнение катком и контроль ровности",
      "обработка краев и уборка",
    ],
    materials: ["асфальтобетонная смесь", "щебень при необходимости", "битумная эмульсия", "техника", "доставка", "рабочие"],
    missing: ["толщина слоя", "состояние основания", "марка смеси", "город/логистика", "демонтаж", "техника"],
  },
  waterproofing: {
    workRu: "гидроизоляция",
    steps: [
      "проверить проектный узел и основание",
      "очистить и подготовить поверхность",
      "проверить праймер/грунт",
      "нанести гидроизоляционный слой по карте материала",
      "проверить примыкания, нахлесты и вводы",
      "зафиксировать фото и акт скрытых работ",
    ],
    materials: ["праймер", "гидроизоляционный материал", "ленты/манжеты примыканий", "инструмент", "защитный слой"],
    missing: ["тип материала", "узел примыкания", "температура/влажность", "требования проекта", "акт скрытых работ"],
  },
  plastering: {
    workRu: "штукатурка",
    steps: [
      "проверить основание и маяки",
      "подготовить поверхность",
      "нанести штукатурный слой",
      "выдержать технологическое время",
      "проверить плоскость, углы и трещины",
    ],
    materials: ["штукатурная смесь", "грунтовка", "маяки", "уголки", "инструмент"],
    missing: ["толщина слоя", "тип смеси", "площадь", "основание", "требования качества"],
  },
  drywall_partitions: {
    workRu: "ГКЛ",
    steps: [
      "разметка перегородки",
      "монтаж направляющих и стоечных профилей",
      "закладные и инженерные проходы",
      "обшивка ГКЛ",
      "шпаклевка швов и контроль плоскости",
    ],
    materials: ["листы ГКЛ", "профиль", "саморезы", "лента", "шпаклевка", "звукоизоляция при необходимости"],
    missing: ["высота", "длина", "слои обшивки", "шаг профиля", "требования к огнестойкости/влагостойкости"],
  },
  default: {
    workRu: "строительные работы",
    steps: ["уточнить проект", "проверить основание", "подготовить материалы", "выполнить работы", "проверить качество и документы"],
    materials: ["материалы по проекту", "крепеж/расходники", "инструмент", "техника/доставка при необходимости"],
    missing: ["проектные требования", "объем", "материал", "город", "срок", "документы приемки"],
  },
};

function inferWorkType(request: AiExternalKnowledgeRequest): keyof typeof constructionWorkPack {
  const text = `${request.workType ?? ""} ${request.normalizedQuestionRu}`.toLowerCase();
  if (text.includes("асфальт")) return "asphalt_paving";
  if (text.includes("гидроизоля")) return "waterproofing";
  if (text.includes("штукатур")) return "plastering";
  if (text.includes("гкл") || text.includes("гипс")) return "drywall_partitions";
  return "default";
}

function buildConstructionParts(request: AiExternalKnowledgeRequest, sources: AiExternalKnowledgeSourceRef[]): AiExternalKnowledgeResult["answerParts"] {
  const pack = constructionWorkPack[inferWorkType(request)];
  const sourceRefIds = sources.map((source) => source.id);
  const quantity = request.quantity ? `${request.quantity.value} ${request.quantity.unit}` : "объем не указан";
  return [
    {
      titleRu: "Проектные данные",
      textRu: "Готовая проектная смета в external knowledge не создается: сначала должны проверяться app data/PDF/internal marketplace.",
      sourceRefIds: [],
      status: "not_found",
    },
    {
      titleRu: request.intent === "construction_technology" ? "Технология и контроль" : "Черновой расчет",
      textRu: `${pack.workRu}: ${quantity}. Состав: ${pack.steps.join("; ")}.`,
      sourceRefIds,
      status: sources.some((source) => source.sourceType === "official_regulation") ? "official_reference" : "draft_assumption",
    },
    {
      titleRu: "Материалы и услуги",
      textRu: pack.materials.join("; "),
      sourceRefIds,
      status: "draft_assumption",
    },
  ];
}

function buildSupplierParts(request: AiExternalKnowledgeRequest, sources: AiExternalKnowledgeSourceRef[]): AiExternalKnowledgeResult["answerParts"] {
  const material = request.materialNameRu ?? "ГКЛ/материал";
  return [
    {
      titleRu: "Внутренний порядок источников",
      textRu: "Сначала проверяются заявка, склад, internal marketplace, approved vendors и supplier history; внешний web идет только после них.",
      sourceRefIds: [],
      status: "external_reference",
    },
    {
      titleRu: "Внешние варианты",
      textRu: `${material}: внешние marketplace/supplier site являются рыночной подсказкой, цена и наличие требуют проверки.`,
      sourceRefIds: sources.map((source) => source.id),
      status: "market_reference",
    },
  ];
}

function buildAccountingParts(request: AiExternalKnowledgeRequest, sources: AiExternalKnowledgeSourceRef[]): AiExternalKnowledgeResult["answerParts"] {
  const country = request.countryCode ?? "не указана";
  return [
    {
      titleRu: "Страна учета",
      textRu: country,
      sourceRefIds: [],
      status: country === "не указана" ? "requires_review" : "official_reference",
    },
    {
      titleRu: "Справочная рекомендация",
      textRu: "Возможная проводка/статья затрат зависит от счета, акта, договора, назначения платежа и учетной политики. Требуется проверка бухгалтером.",
      sourceRefIds: sources.map((source) => source.id),
      status: "requires_review",
    },
  ];
}

function missingDataFor(request: AiExternalKnowledgeRequest): string[] {
  if (request.intent === "marketplace_supplier_search" || request.intent === "market_price_reference") {
    return ["точная спецификация", "единица измерения", "город доставки", "срок", "требования к поставщику"];
  }
  if (["accounting_entry_help", "tax_reference", "finance_reference", "document_requirement_reference"].includes(request.intent)) {
    return ["счет", "акт", "договор", "назначение платежа", "учетная политика", "подтверждение приемки"];
  }
  return constructionWorkPack[inferWorkType(request)].missing;
}

function composeAnswerText(
  request: AiExternalKnowledgeRequest,
  result: AiExternalKnowledgeResult,
): string {
  const sources = result.sources.map((source) =>
    `- ${source.titleRu}; тип: ${source.sourceType}; дата проверки: ${source.checkedAt}; URL: ${source.url ?? "не применимо"}; confidence: ${source.confidence}`,
  );
  return [
    "Коротко:",
    result.answerParts[0]?.textRu ?? "Внешняя справка подготовлена.",
    "",
    "Что найдено в приложении:",
    request.internalContextSummaryRu ?? "Данные приложения должны проверяться до внешних источников; внешний источник не является фактом приложения.",
    "",
    "Внешние источники:",
    sources.length ? sources.join("\n") : "- внешний web не подключен или источник не требуется",
    "",
    "Расчет / рекомендация:",
    result.answerParts.map((part) => `- ${part.titleRu}: ${part.textRu}`).join("\n"),
    "",
    "Допущения:",
    result.assumptions.map((assumption) => `- ${assumption}`).join("\n"),
    "",
    "Чего не хватает:",
    result.missingData.map((missing) => `- ${missing}`).join("\n"),
    "",
    "Следующий шаг:",
    request.intent === "marketplace_supplier_search"
      ? "Сверить внутренний marketplace и историю поставщиков, затем запросить КП у выбранных поставщиков."
      : request.intent === "accounting_entry_help"
        ? "Передать справку бухгалтеру и сверить первичные документы."
        : "Уточнить недостающие параметры и сверить проект/PDF до точного расчета.",
    "",
    "Статус:",
    requestRequiresAiExternalReview(request)
      ? "Справка. Требуется проверка. Данные не изменены."
      : "Черновик. Данные проекта не изменены.",
  ].join("\n");
}

export function answerAiExternalKnowledge(
  input: AiExternalKnowledgePlanInput,
  providedSources?: AiExternalKnowledgeSourceRef[],
): AiExternalKnowledgeAnswer {
  const plan = planAiExternalKnowledge(input);
  const rawSources = plan.enabled
    ? (providedSources ?? retrieveAiExternalKnowledgeSources(plan.request))
    : [];
  const sanitized = sanitizeAiExternalSources(rawSources);
  const rankedIds = new Set(rankAiExternalSources(sanitized.allowedSources).map((rank) => rank.sourceRefId));
  const sources = sanitized.allowedSources
    .filter((source) => rankedIds.has(source.id))
    .slice(0, plan.request.maxResults);
  const request = plan.request;
  const answerParts = request.intent === "marketplace_supplier_search" || request.intent === "market_price_reference"
    ? buildSupplierParts(request, sources)
    : ["accounting_entry_help", "tax_reference", "finance_reference", "document_requirement_reference"].includes(request.intent)
      ? buildAccountingParts(request, sources)
      : buildConstructionParts(request, sources);
  const result: AiExternalKnowledgeResult = {
    requestId: request.requestId,
    sources,
    answerParts,
    assumptions: [
      "внешний источник не подтверждает внутренние факты приложения",
      "общие знания являются черновиком",
      ...(request.quantity ? [`объем из вопроса: ${request.quantity.value} ${request.quantity.unit}`] : []),
    ],
    warnings: [...sanitized.warningsRu, ...sanitized.blockedSources.map((item) => item.reasonRu)],
    missingData: missingDataFor(request),
    sourceDisclosure: composeAiExternalSourceDisclosure(sources),
    safetyStatus: {
      canBePresentedAsProjectFact: false,
      requiresHumanReview: requestRequiresAiExternalReview(request) || sources.some((source) => source.requiresReview),
      changedData: false,
      finalSubmit: false,
    },
  };
  const answerTextRu = composeAnswerText(request, result);
  const guard = guardAiExternalKnowledge({
    request,
    result,
    internalQuestion: !plan.enabled,
    answerTextRu,
  });
  return {
    plan,
    result,
    answerTextRu,
    guard,
    ranks: rankAiExternalSources(sources),
  };
}
