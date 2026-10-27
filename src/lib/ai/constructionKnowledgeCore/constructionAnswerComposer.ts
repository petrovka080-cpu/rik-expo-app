import { resolveConstructionNorms } from "./constructionNormsResolver";
import { retrieveConstructionRoleScopedContext } from "./constructionRoleScopedRetriever";
import type {
  ConstructionAnswer,
  ConstructionAnswerFact,
  ConstructionClaimKind,
  ConstructionKnowledgeSource,
  ConstructionQuestionRequest,
} from "./constructionKnowledgeTypes";

const GENERAL_SOURCE: ConstructionKnowledgeSource = {
  id: "source:general:construction-knowledge",
  type: "general_construction_knowledge",
  labelRu: "Общее строительное правило",
  confidence: "high",
};

function normalize(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function sourceAllowedForClaim(
  claimKind: ConstructionClaimKind,
  source: ConstructionKnowledgeSource,
): boolean {
  if (claimKind === "general") return source.type === "general_construction_knowledge";
  if (claimKind === "project") return ["project_pdf", "architecture_pdf", "engineering_pdf", "specification"].includes(source.type);
  if (claimKind === "estimate") return ["estimate_pdf", "boq"].includes(source.type);
  if (claimKind === "country_norm") return ["country_profile", "normative_pdf", "company_standard"].includes(source.type);
  if (claimKind === "company_standard") return source.type === "company_standard";
  if (claimKind === "supplier" || claimKind === "price") return ["supplier_offer", "procurement_request"].includes(source.type);
  if (claimKind === "stock") return source.type === "warehouse_stock";
  if (claimKind === "payment") return source.type === "payment" || source.type === "approval";
  if (claimKind === "document") return ["project_pdf", "architecture_pdf", "engineering_pdf", "estimate_pdf", "boq", "specification", "act", "report", "photo"].includes(source.type);
  if (claimKind === "role_scope") return source.type === "approval" || source.type === "chat_message" || source.type === "work";
  return false;
}

function sourceById(sources: ConstructionKnowledgeSource[]): Map<string, ConstructionKnowledgeSource> {
  return new Map(sources.map((source) => [source.id, source]));
}

export function validateConstructionAnswerFactSources(params: {
  fact: ConstructionAnswerFact;
  sources: ConstructionKnowledgeSource[];
}): boolean {
  const byId = sourceById(params.sources);
  const refs = params.fact.sourceRefs.map((ref) => byId.get(ref)).filter(Boolean) as ConstructionKnowledgeSource[];
  if (params.fact.claimKind === "general") {
    return refs.some((source) => source.type === "general_construction_knowledge");
  }
  return refs.some((source) => sourceAllowedForClaim(params.fact.claimKind, source));
}

function fact(
  id: string,
  textRu: string,
  claimKind: ConstructionClaimKind,
  sourceRefs: string[],
  confidence: ConstructionAnswerFact["confidence"] = "medium",
): ConstructionAnswerFact {
  return { id, textRu, claimKind, sourceRefs, confidence };
}

function firstSourceOf(
  sources: ConstructionKnowledgeSource[],
  types: ConstructionKnowledgeSource["type"][],
): ConstructionKnowledgeSource | null {
  return sources.find((source) => types.includes(source.type)) ?? null;
}

function factsForQuestion(params: {
  questionRu: string;
  sources: ConstructionKnowledgeSource[];
}): {
  facts: ConstructionAnswerFact[];
  missingData: string[];
  risks: string[];
  nextStepRu: string;
  status: ConstructionAnswer["status"];
} {
  const q = normalize(params.questionRu);
  const facts: ConstructionAnswerFact[] = [
    fact(
      "fact:general:evidence-boundary",
      "Общее строительное правило: конкретные требования проекта, сметы, нормы, поставщики, цены и оплаты можно утверждать только при наличии привязанного источника.",
      "general",
      [GENERAL_SOURCE.id],
      "high",
    ),
  ];
  const missingData: string[] = [];
  const risks: string[] = [];
  let nextStepRu = "Проверьте источники и откройте связанный объект, работу, документ или заявку.";
  let status: ConstructionAnswer["status"] = "data_not_changed";

  const projectSource = firstSourceOf(params.sources, ["project_pdf", "architecture_pdf", "engineering_pdf", "specification"]);
  const estimateSource = firstSourceOf(params.sources, ["estimate_pdf", "boq"]);
  const supplierSource = firstSourceOf(params.sources, ["supplier_offer", "procurement_request"]);
  const stockSource = firstSourceOf(params.sources, ["warehouse_stock"]);
  const paymentSource = firstSourceOf(params.sources, ["payment", "approval"]);
  const documentSource = firstSourceOf(params.sources, ["act", "report", "photo", "project_pdf", "architecture_pdf", "engineering_pdf", "estimate_pdf", "boq", "specification"]);
  const workSource = firstSourceOf(params.sources, ["work", "object", "zone"]);

  if (/проект|pdf|чертеж|требован|спецификац/.test(q)) {
    if (projectSource) {
      facts.push(fact(
        "fact:project:source-present",
        `По проектному источнику можно отвечать только с привязкой к документу: ${projectSource.labelRu}${projectSource.page ? `, стр. ${projectSource.page}` : ""}.`,
        "project",
        [projectSource.id],
      ));
    } else {
      missingData.push("Не найден проектный PDF, архитектурный PDF, инженерный PDF или спецификация.");
      risks.push("Проектное требование нельзя утверждать без PDF/source trace.");
      status = "blocked_missing_source";
    }
  }

  if (/смет|объем|объ[её]м|boq|количеств/.test(q)) {
    if (estimateSource) {
      facts.push(fact(
        "fact:estimate:source-present",
        `Сметный вывод разрешен только по источнику: ${estimateSource.labelRu}${estimateSource.linkedEstimateLineId ? `, строка ${estimateSource.linkedEstimateLineId}` : ""}.`,
        "estimate",
        [estimateSource.id],
      ));
    } else {
      missingData.push("Не найдена смета, BOQ или сметная строка.");
      risks.push("Объем или стоимость нельзя утверждать без сметного источника.");
      status = "blocked_missing_source";
    }
  }

  if (/норм|стра[нн]|кыргыз|kg|снип|гост|стандарт/.test(q)) {
    const norms = resolveConstructionNorms({ sources: params.sources });
    facts.push(fact("fact:general:norm-boundary", norms.generalBasisRu, "general", [GENERAL_SOURCE.id], "high"));
    if (norms.allowedToMakeNormClaim) {
      facts.push(fact(
        "fact:norm:source-present",
        `Нормативный вывод можно делать только по привязанному источнику: ${norms.sources[0]?.labelRu ?? "нормативный источник"}.`,
        "country_norm",
        norms.sources.map((source) => source.id),
      ));
    } else {
      missingData.push(...norms.missingData);
      risks.push("Норма страны или компании не подтверждена источником.");
      status = "blocked_missing_source";
    }
  }

  if (/поставщик|вариант|цена|аналог|купить|закуп/.test(q)) {
    if (supplierSource) {
      facts.push(fact(
        "fact:supplier:source-present",
        `Варианты закупки можно показывать только из источника: ${supplierSource.labelRu}.`,
        "supplier",
        [supplierSource.id],
      ));
    } else {
      missingData.push("Нет approved vendors, supplier offers, market catalog или истории закупок.");
      risks.push("Поставщиков, цены и availability нельзя выдумывать.");
      status = "blocked_missing_source";
    }
  }

  if (/склад|остат|выдать|приход|материал/.test(q)) {
    if (stockSource) {
      facts.push(fact(
        "fact:stock:source-present",
        `Складской вывод основан на источнике: ${stockSource.labelRu}.`,
        "stock",
        [stockSource.id],
      ));
    } else {
      missingData.push("Нет складского источника по остатку, приходу или выдаче.");
      risks.push("Остатки, приемку, выдачу и списание нельзя создавать из AI-ответа.");
      status = status === "data_not_changed" ? "blocked_missing_source" : status;
    }
  }

  if (/оплат|счет|сч[её]т|деньг|cash|акт/.test(q)) {
    if (paymentSource || documentSource) {
      const selected = paymentSource ?? documentSource;
      if (selected) {
        facts.push(fact(
          "fact:finance:source-present",
          `Финансовый или актовый вывод основан на источнике: ${selected.labelRu}.`,
          selected.type === "payment" ? "payment" : "document",
          [selected.id],
        ));
      }
    } else {
      missingData.push("Нет счета, оплаты, акта, approval или документа-основания.");
      risks.push("Оплату, акт или первичный документ нельзя выдумывать и нельзя финально проводить из AI.");
      status = "blocked_missing_source";
    }
  }

  if (/работ|закрыть|сделано|подряд|что горит|блокир/.test(q)) {
    if (workSource) {
      facts.push(fact(
        "fact:work:source-present",
        `Рабочий контекст найден в источнике: ${workSource.labelRu}.`,
        "document",
        [workSource.id],
      ));
    } else {
      missingData.push("Нет связанной работы, объекта, зоны или подрядного источника.");
      status = status === "data_not_changed" ? "blocked_missing_source" : status;
    }
  }

  if (/подготов|черновик|акт|отчет|отч[её]т/.test(q) && status !== "blocked_missing_source") {
    status = "draft_prepared";
    nextStepRu = "Подготовьте черновик и отправьте на человеческую проверку источников.";
  }
  if (/соглас|approval|утверд/.test(q)) {
    status = "requires_approval";
    nextStepRu = "Передайте пакет на согласование; данные и статусы не меняются автоматически.";
  }

  return {
    facts,
    missingData,
    risks,
    nextStepRu,
    status,
  };
}

function sourceLabel(source: ConstructionKnowledgeSource): string {
  const page = source.page ? `, стр. ${source.page}` : "";
  const estimateLine = source.linkedEstimateLineId ? `, строка ${source.linkedEstimateLineId}` : "";
  return `${source.labelRu}${page}${estimateLine}`;
}

function statusText(status: ConstructionAnswer["status"]): string {
  if (status === "draft_prepared") return "Черновик подготовлен";
  if (status === "requires_approval") return "Требуется согласование";
  return "Данные не изменены";
}

export function composeConstructionAnswer(params: {
  questionRu: string;
  sources: ConstructionKnowledgeSource[];
  facts: ConstructionAnswerFact[];
  missingData: string[];
  risks: string[];
  nextStepRu: string;
  status: ConstructionAnswer["status"];
  providerTrace: string[];
  blockedReasons?: string[];
}): ConstructionAnswer {
  const sources = [GENERAL_SOURCE, ...params.sources];
  const validFacts = params.facts.filter((item) => validateConstructionAnswerFactSources({
    fact: item,
    sources,
  }));
  const invalidFacts = params.facts.filter((item) => !validFacts.includes(item));
  const missingData = [
    ...params.missingData,
    ...invalidFacts.map((item) => `Факт "${item.textRu}" не показан: нет допустимого source trace.`),
  ];
  const usedSourceIds = new Set(validFacts.flatMap((item) => item.sourceRefs));
  const usedSources = sources.filter((source) => usedSourceIds.has(source.id));
  const shortRu = validFacts.length > 1
    ? "Найдены данные с источниками; неподтвержденные утверждения оставлены как missing data."
    : "Есть только общий строительный ориентир; конкретные факты требуют источников.";

  const answerRu = [
    "Ответ",
    "",
    "Коротко:",
    shortRu,
    "",
    "Данные:",
    ...(validFacts.length ? validFacts.map((item) => `- ${item.textRu}`) : ["- Конкретные подтвержденные данные не найдены."]),
    "",
    "Источники:",
    ...(usedSources.length ? usedSources.map((source) => `- ${sourceLabel(source)}`) : ["- Источник не найден."]),
    "",
    "Что не хватает:",
    ...(missingData.length ? missingData.map((item) => `- ${item}`) : ["- Не выявлено по переданным источникам."]),
    "",
    "Риски:",
    ...(params.risks.length ? params.risks.map((item) => `- ${item}`) : ["- Нет подтвержденного риска по переданным источникам."]),
    "",
    "Следующий шаг:",
    params.nextStepRu,
    "",
    "Статус:",
    statusText(params.status),
  ].join("\n");

  return {
    answerRu,
    shortRu,
    facts: validFacts,
    sources: usedSources,
    missingData,
    risks: params.risks,
    nextStepRu: params.nextStepRu,
    status: invalidFacts.length > 0 && params.status === "data_not_changed"
      ? "blocked_missing_source"
      : params.status,
    changedData: false,
    providerTrace: params.providerTrace,
    blockedReasons: params.blockedReasons ?? [],
  };
}

export function answerConstructionQuestion(
  request: ConstructionQuestionRequest,
): ConstructionAnswer {
  const retrieved = retrieveConstructionRoleScopedContext({
    scope: { role: request.role, screenId: request.screenId },
    sources: [GENERAL_SOURCE, ...request.sources],
    events: request.events,
  });
  const built = factsForQuestion({
    questionRu: request.questionRu,
    sources: retrieved.sources,
  });
  const blockedReasons = retrieved.deniedSourceIds.length > 0
    ? [`Role scope removed ${retrieved.deniedSourceIds.length} source(s).`]
    : [];
  return composeConstructionAnswer({
    questionRu: request.questionRu,
    sources: retrieved.sources.filter((source) => source.id !== GENERAL_SOURCE.id),
    facts: built.facts,
    missingData: built.missingData,
    risks: built.risks,
    nextStepRu: built.nextStepRu,
    status: built.status,
    providerTrace: [
      "constructionAnswerComposer",
      "constructionRoleScopedRetriever",
      "aiConstructionKnowledgeProvider",
      ...retrieved.providerTrace,
    ],
    blockedReasons,
  });
}

export const constructionAnswerComposer = composeConstructionAnswer;
