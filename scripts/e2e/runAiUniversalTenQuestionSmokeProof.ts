import fs from "node:fs";
import path from "node:path";

import {
  answerLiveAiForContext,
  type ExternalMarketplaceSearchResult,
  type ExternalWebSearchResult,
  type LiveAiContextId,
  type LiveAiQueryIntent,
  type LiveAiQueryIntentSources,
} from "../../src/lib/ai/liveUi";

const PREFIX = "S_AI_UNIVERSAL_TEN_QUESTION_SMOKE";
const artifactsDir = path.join(process.cwd(), "artifacts");

const webResults: ExternalWebSearchResult[] = [
  {
    id: "web-asphalt-reference",
    title: "Технология укладки асфальта: подготовка, выравнивание и уплотнение",
    snippetRu:
      "Укладка асфальта включает подготовку нижележащего слоя, выравнивание, обработку основания и уплотнение смеси катками.",
    url: "https://nflg.ru/stati/post/tehnologii-ukladki-asfalta",
    sourceDomain: "nflg.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
  {
    id: "web-monolith-reference",
    title: "Этапы выполнения монолитных работ",
    snippetRu:
      "Монолитные работы включают армирование, установку опалубки, бетонирование, демонтаж опалубки и уход за бетоном.",
    url: "https://bhng.ru/clauses/stati-o-proektirovanii/etapy-vypolneniya-monolitnykh-rabot/",
    sourceDomain: "bhng.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
  {
    id: "web-windows-reference",
    title: "Монтаж окон: отлив, подоконник и герметизация",
    snippetRu:
      "При монтаже окна учитывают подставочный профиль, отлив, подоконник, герметизацию и отделку откосов.",
    url: "https://www.ivd.ru/stroitelstvo-i-remont/okna/montazh-okon-v-kvartire-na-chto-obratit-vnimanie-i-kak-izbezhat-oshibok-25071",
    sourceDomain: "ivd.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
  {
    id: "web-doors-reference",
    title: "Что входит в установку дверей: полный перечень работ",
    snippetRu:
      "Установка дверей включает сборку и монтаж коробки, навешивание полотна, петли, замок/защёлку и проверку работы двери.",
    url: "https://dveri-max.ru/stati/29-chto-vkhodit-v-ustanovku-dverej-polnyj-perechen-rabot-2",
    sourceDomain: "dveri-max.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
  {
    id: "web-gkl-supplier-reference",
    title: "КНАУФ ГКЛ 12.5 мм 2500x1200 мм",
    snippetRu:
      "Карточка строительного материала ГКЛ 12.5 мм с описанием товара и условиями доставки у поставщика.",
    url: "https://www.baza5.ru/knauf-gkl-125-mm-25001200-mm-gipsokarton-12-mm",
    sourceDomain: "baza5.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
];

const marketplaceResults: ExternalMarketplaceSearchResult[] = [
  {
    id: "ext-market-gkl-1",
    titleRu: "Внешний marketplace: ГКЛ 12.5 мм, поставщик с доставкой",
    url: "https://www.baza5.ru/knauf-gkl-125-mm-25001200-mm-gipsokarton-12-mm",
    sourceDomain: "baza5.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
];

const connectedSources: LiveAiQueryIntentSources = {
  procurementRequests: [
    {
      id: "MR-101",
      createdAt: "2026-05-03",
      objectRu: "Дом 1",
      zoneRu: "Секция А",
      floorRu: "1 этаж",
      itemRu: "ГКЛ 12.5 мм",
      statusRu: "approved",
      nextStepRu: "подобрать поставщиков",
      sourceRefs: ["src:request:MR-101", "src:object:house-1-floor-1"],
    },
    {
      id: "MR-108",
      createdAt: "2026-05-14",
      objectRu: "Дом 1",
      zoneRu: "Секция Б",
      floorRu: "1 этаж",
      itemRu: "Профиль стоечный",
      statusRu: "pending",
      nextStepRu: "дождаться согласования",
      sourceRefs: ["src:request:MR-108", "src:object:house-1-floor-1"],
    },
    {
      id: "MR-205",
      createdAt: "2026-04-22",
      objectRu: "Дом 2",
      zoneRu: "Секция В",
      floorRu: "2 этаж",
      itemRu: "Краска интерьерная",
      statusRu: "closed",
      nextStepRu: "данные не изменены",
      sourceRefs: ["src:request:MR-205", "src:object:house-2-floor-2"],
    },
  ],
};

type SmokeCase = {
  id: string;
  group: "app" | "web";
  context: LiveAiContextId;
  questionRu: string;
  expectedIntents: LiveAiQueryIntent[];
  requiredSignals: string[];
  forbiddenSignals: string[];
  expectPublicWebFact: boolean;
  expectInternalOnly: boolean;
  webResultIds?: string[];
  useMarketplace?: boolean;
};

const cases: SmokeCase[] = [
  {
    id: "app-count-requests-may",
    group: "app",
    context: "buyer",
    questionRu: "сколько заявок было за месяц май",
    expectedIntents: ["app_data_count"],
    requiredSignals: ["май 2026", "Всего", "MR", "Данные приложения"],
    forbiddenSignals: ["Интернет: использован", "монтаж перегородок", "PAY-GKL"],
    expectPublicWebFact: false,
    expectInternalOnly: true,
  },
  {
    id: "app-list-first-floor-requests",
    group: "app",
    context: "foreman",
    questionRu: "выдай заявки все по первому этажу",
    expectedIntents: ["procurement_request_search", "app_data_list"],
    requiredSignals: ["заявки", "MR-101", "1 этаж", "Данные приложения"],
    forbiddenSignals: ["Интернет: использован", "PAY-GKL"],
    expectPublicWebFact: false,
    expectInternalOnly: true,
  },
  {
    id: "app-warehouse-deficits",
    group: "app",
    context: "warehouse",
    questionRu: "какие материалы в дефиците",
    expectedIntents: ["warehouse_query"],
    requiredSignals: ["дефицит", "Источник ответа", "Следующий шаг"],
    forbiddenSignals: ["Интернет: использован", "смета на асфальт"],
    expectPublicWebFact: false,
    expectInternalOnly: true,
  },
  {
    id: "app-director-today",
    group: "app",
    context: "director",
    questionRu: "что мне решить сегодня",
    expectedIntents: ["role_summary_query"],
    requiredSignals: ["Коротко", "Источник ответа", "Следующий шаг"],
    forbiddenSignals: ["Интернет: использован", "смета"],
    expectPublicWebFact: false,
    expectInternalOnly: true,
  },
  {
    id: "app-accountant-missing-docs",
    group: "app",
    context: "accountant",
    questionRu: "каких документов не хватает для оплаты",
    expectedIntents: ["finance_query", "document_pdf_query"],
    requiredSignals: ["документ", "Источник ответа", "Следующий шаг"],
    forbiddenSignals: ["Интернет: использован", "асфальт"],
    expectPublicWebFact: false,
    expectInternalOnly: true,
  },
  {
    id: "web-asphalt-100m2",
    group: "web",
    context: "foreman",
    questionRu: "дай мне смету на укладку асфальта на площади 100 кв метров",
    expectedIntents: ["construction_estimate_request"],
    requiredSignals: ["асфальт", "100", "смета", "основан", "Интернет: использован", "Черновик"],
    forbiddenSignals: ["монтаж перегородок", "PAY-GKL"],
    expectPublicWebFact: true,
    expectInternalOnly: false,
    webResultIds: ["web-asphalt-reference"],
  },
  {
    id: "web-monolith-1200m2",
    group: "web",
    context: "foreman",
    questionRu: "дай смету на заливку монолита на 1200 кв метров",
    expectedIntents: ["construction_estimate_request"],
    requiredSignals: ["монолит", "1200", "смета", "опалуб", "армирован", "Интернет: использован"],
    forbiddenSignals: ["монтаж перегородок", "ГКЛ", "PAY-GKL"],
    expectPublicWebFact: true,
    expectInternalOnly: false,
    webResultIds: ["web-monolith-reference"],
  },
  {
    id: "web-windows-10",
    group: "web",
    context: "director",
    questionRu: "смета на установку окон 10 штук",
    expectedIntents: ["construction_estimate_request"],
    requiredSignals: ["окн", "10", "смета", "монтаж", "Интернет: использован"],
    forbiddenSignals: ["PAY-GKL", "платёж", "ГКЛ"],
    expectPublicWebFact: true,
    expectInternalOnly: false,
    webResultIds: ["web-windows-reference"],
  },
  {
    id: "web-doors-install",
    group: "web",
    context: "warehouse",
    questionRu: "дай смету на монтаж дверей",
    expectedIntents: ["construction_estimate_request"],
    requiredSignals: ["двер", "смета", "монтаж", "Интернет: использован"],
    forbiddenSignals: ["ГКЛ", "монтаж перегородок", "PAY-GKL"],
    expectPublicWebFact: true,
    expectInternalOnly: false,
    webResultIds: ["web-doors-reference"],
  },
  {
    id: "web-gkl-suppliers",
    group: "web",
    context: "buyer",
    questionRu: "найди поставщиков ГКЛ",
    expectedIntents: ["marketplace_product_request"],
    requiredSignals: ["ГКЛ", "поставщик", "marketplace", "Интернет: использован"],
    forbiddenSignals: ["смета на асфальт", "PAY-GKL"],
    expectPublicWebFact: true,
    expectInternalOnly: false,
    webResultIds: ["web-gkl-supplier-reference"],
    useMarketplace: true,
  },
];

function normalizeForCheck(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е");
}

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sourcesForCase(item: SmokeCase): LiveAiQueryIntentSources {
  return {
    ...connectedSources,
    externalWeb: item.webResultIds
      ? {
          enabled: true,
          results: webResults.filter((result) => item.webResultIds?.includes(result.id)),
        }
      : undefined,
    externalMarketplace: item.useMarketplace
      ? {
          enabled: true,
          results: marketplaceResults,
        }
      : undefined,
  };
}

const transcripts = cases.map((item) => {
  const answer = answerLiveAiForContext({
    context: item.context,
    userText: item.questionRu,
    intentSources: sourcesForCase(item),
  });
  const text = normalizeForCheck(answer.answerTextRu);
  const requiredMissing = item.requiredSignals.filter((signal) => !text.includes(normalizeForCheck(signal)));
  const forbiddenPresent = item.forbiddenSignals.filter((signal) => text.includes(normalizeForCheck(signal)));
  const publicWebFacts = answer.sourceProvenance.filter((source) =>
    source.origin === "public_web" && source.canBePresentedAsFact,
  );
  const sourceOrigins = answer.sourceProvenance.map((source) => source.origin);
  const blockers = [
    ...(item.expectedIntents.includes(answer.queryIntent) ? [] : [`intent mismatch: ${answer.queryIntent}`]),
    ...(requiredMissing.length ? [`missing signals: ${requiredMissing.join(", ")}`] : []),
    ...(forbiddenPresent.length ? [`forbidden signals: ${forbiddenPresent.join(", ")}`] : []),
    ...(answer.sourceProvenanceBlockers.length ? answer.sourceProvenanceBlockers : []),
    ...(answer.answerTextRu.includes("Источник ответа:") ? [] : ["source disclosure missing"]),
    ...(answer.answerTextRu.includes("Следующий шаг:") ? [] : ["next step missing"]),
    ...(answer.answerTextRu.includes("Статус:") ? [] : ["status missing"]),
    ...(item.expectPublicWebFact && publicWebFacts.length === 0 ? ["expected public web fact source"] : []),
    ...(item.expectInternalOnly && publicWebFacts.length > 0 ? ["internal app question used public web fact"] : []),
    ...(answer.dangerousMutationsFound > 0 ? ["dangerous mutation found"] : []),
    ...(answer.approvalBypassFound > 0 ? ["approval bypass found"] : []),
    ...(answer.genericAnswerUsed ? ["generic answer used"] : []),
  ];
  return {
    id: item.id,
    group: item.group,
    route: `/ai?context=${item.context}`,
    questionRu: item.questionRu,
    queryIntent: answer.queryIntent,
    explicitUserIntentUsed: answer.explicitUserIntentUsed,
    sourceOrigins,
    publicWebFacts: publicWebFacts.map((source) => ({
      label: source.sourceLabelRu,
      url: source.sourceUrl,
      checkedAt: source.checkedAt,
    })),
    providerTrace: answer.providerTrace,
    sourceTrace: answer.sourceTrace,
    sourceDisclosureRu: answer.sourceDisclosureRu,
    shortRu: answer.shortRu,
    nextStepRu: answer.nextStepRu,
    status: answer.status,
    answerTextRu: answer.answerTextRu,
    requiredMissing,
    forbiddenPresent,
    blockers,
  };
});

const blockers = transcripts.flatMap((item) => item.blockers.map((blocker) => `${item.id}: ${blocker}`));
const passed = blockers.length === 0;
const summary = {
  wave: "S_AI_UNIVERSAL_TEN_QUESTION_SMOKE_PROOF",
  final_status: passed
    ? "GREEN_AI_UNIVERSAL_TEN_QUESTION_SMOKE_READY"
    : "BLOCKED_AI_UNIVERSAL_TEN_QUESTION_SMOKE",
  questions_total: transcripts.length,
  app_questions: transcripts.filter((item) => item.group === "app").length,
  web_questions: transcripts.filter((item) => item.group === "web").length,
  public_web_fact_questions: transcripts.filter((item) => item.publicWebFacts.length > 0).length,
  generic_answers_found: transcripts.filter((item) => item.answerTextRu.toLowerCase().includes("generic fallback")).length,
  dangerous_mutations_found: transcripts.reduce((sum, item) => sum + (item.answerTextRu.includes("dangerousMutation") ? 1 : 0), 0),
  blockers,
  fake_green_claimed: false,
};

writeJson(`artifacts/${PREFIX}_transcripts.json`, transcripts);
writeJson(`artifacts/${PREFIX}_summary.json`, summary);
fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactsDir, `${PREFIX}_proof.md`),
  [
    "# S_AI_UNIVERSAL_TEN_QUESTION_SMOKE_PROOF",
    "",
    `final_status: ${summary.final_status}`,
    `questions_total: ${summary.questions_total}`,
    `app_questions: ${summary.app_questions}`,
    `web_questions: ${summary.web_questions}`,
    `public_web_fact_questions: ${summary.public_web_fact_questions}`,
    `fake_green_claimed: ${summary.fake_green_claimed}`,
    "",
    "## Blockers",
    blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
    "",
  ].join("\n"),
  "utf8",
);

console.log(JSON.stringify({
  summary,
  results: transcripts.map((item) => ({
    id: item.id,
    intent: item.queryIntent,
    publicWebFacts: item.publicWebFacts.length,
    blockers: item.blockers,
    shortRu: item.shortRu,
  })),
}, null, 2));

if (!passed) {
  process.exitCode = 1;
}
