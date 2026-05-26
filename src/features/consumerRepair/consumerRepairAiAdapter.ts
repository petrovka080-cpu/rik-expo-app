import {
  buildConsumerRepairAiDraftFromGlobalEstimate,
  type ConsumerRepairAiDraft,
} from "../../lib/consumerRequests";
import { answerBuiltInAi } from "../../lib/ai/builtInAi";
import { formatEstimateUnitLabel, formatEstimateUserTextRu } from "../../lib/ai/globalEstimate";

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

export function isDangerousConsumerRepairProblem(problemText: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(problemText));
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
    titleRu: "Заявка на ремонт дома",
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

export function buildConsumerRepairAiDraft(problemText: string): ConsumerRepairAiDraft {
  const text = problemText.trim();
  const builtInAiEstimate = answerBuiltInAi({
    text,
    screenContext: "request",
    route: "/request",
    role: "consumer",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  if (builtInAiEstimate.toolResult.estimate) {
    return buildConsumerRepairAiDraftFromGlobalEstimate(builtInAiEstimate.toolResult.estimate);
  }
  if (isDangerousConsumerRepairProblem(text)) {
    return {
      ...genericDraft(),
      titleRu: "Заявка специалисту",
      summaryRu: CONSUMER_REPAIR_DANGEROUS_UI_COPY,
      dangerousDiyBlocked: true,
      safetyMessageRu: CONSUMER_REPAIR_DANGEROUS_UI_COPY,
    };
  }
  const lowercaseText = text.toLocaleLowerCase("ru-RU");
  if (lowercaseText.includes("\u043b\u0430\u043c\u0438\u043d\u0430\u0442")) return flooringDraft(text, "\u043b\u0430\u043c\u0438\u043d\u0430\u0442");
  if (lowercaseText.includes("\u043f\u0430\u0440\u043a\u0435\u0442") || lowercaseText.includes("\u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043d")) return flooringDraft(text, "\u043f\u0430\u0440\u043a\u0435\u0442");
  if (/ламинат/i.test(text)) return flooringDraft(text, "ламинат");
  if (/паркет|инженерн/i.test(text)) return flooringDraft(text, "паркет");
  if (/пол|плинтус|подложк/i.test(text)) return flooringDraft(text, "пол");
  if (/сантех|смесител|труб|протеч|кран/i.test(text)) return plumbingDraft();
  return genericDraft();
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
