import type { ConsumerRepairAiDraft } from "../../lib/consumerRequests";

const DANGEROUS_PATTERNS = [
  /РіР°Р·/i,
  /РїСЂРѕРІРѕРґРє|С‰РёС‚|РїРѕРґ РЅР°РїСЂСЏР¶/i,
  /РЅРµСЃСѓС‰/i,
  /Р·Р°РїР°С… РіР°СЂРё|РіРѕСЂРёС‚|РїРѕР¶Р°СЂ/i,
  /РєСЂРѕРІР»|РІС‹СЃРѕС‚/i,
  /РїР»РµСЃРµРЅ|С…РёРјРё/i,
] as const;

export const CONSUMER_REPAIR_DANGEROUS_COPY =
  "Р­С‚Рѕ РјРѕР¶РµС‚ Р±С‹С‚СЊ РѕРїР°СЃРЅРѕ. РќРµ РІС‹РїРѕР»РЅСЏР№С‚Рµ СЂРµРјРѕРЅС‚ СЃР°РјРѕСЃС‚РѕСЏС‚РµР»СЊРЅРѕ. РЇ РїРѕРґРіРѕС‚РѕРІР»СЋ Р·Р°СЏРІРєСѓ РґР»СЏ СЃРїРµС†РёР°Р»РёСЃС‚Р°.";

const CONSUMER_REPAIR_DANGEROUS_UI_COPY =
  "Это может быть опасно. Не выполняйте ремонт самостоятельно. Я подготовлю заявку для специалиста.";

export function isDangerousConsumerRepairProblem(problemText: string): boolean {
  return (
    DANGEROUS_PATTERNS.some((pattern) => pattern.test(problemText)) ||
    /газ|РіР°Р·|проводк|РїСЂРѕРІРѕРґРє|щит|С‰РёС‚|под напряж|РїРѕРґ РЅР°РїСЂСЏР¶|напряж|РЅР°РїСЂСЏР¶/i.test(
      problemText,
    )
  );
}

function extractArea(text: string): number {
  const match = text.match(/(\d+(?:[,.]\d+)?)\s*(?:кв|м2|м²|метр)/i);
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
  return {
    titleRu: covering === "ламинат" ? "Укладка ламината" : covering === "паркет" ? "Укладка паркета" : "Ремонт пола",
    summaryRu: `Я подготовил черновик заявки на ${covering === "пол" ? "ремонт пола" : `укладку ${covering}`} ${area} м².`,
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
      { itemType: "material", titleRu: covering === "паркет" ? "Паркет / инженерная доска" : "Ламинат", quantity: coveringQty, unit: "м²", source: "ai_suggested" },
      { itemType: "material", titleRu: "Подложка", quantity: underlay, unit: "м²", source: "ai_suggested" },
      { itemType: "material", titleRu: "Плинтус", quantity: plinth, unit: "пог. м", source: "ai_suggested" },
      { itemType: "material", titleRu: "Пороги / стыки", quantity: 5, unit: "шт", source: "ai_suggested" },
      { itemType: "work", titleRu: covering === "паркет" ? "Укладка паркета" : "Укладка ламината", quantity: area, unit: "м²", source: "ai_suggested" },
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
      { itemType: "work", titleRu: "Диагностика сантехнической проблемы", quantity: 1, unit: "выезд", source: "ai_suggested" },
      { itemType: "service", titleRu: "Ремонт / замена узла после осмотра", quantity: 1, unit: "комплект", source: "ai_suggested" },
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
      { itemType: "work", titleRu: "Осмотр и уточнение объёма работ", quantity: 1, unit: "выезд", source: "ai_suggested" },
      { itemType: "service", titleRu: "Ремонтные работы после согласования", quantity: 1, unit: "комплект", source: "ai_suggested" },
    ],
  };
}

export function buildConsumerRepairAiDraft(problemText: string): ConsumerRepairAiDraft {
  const text = problemText.trim();
  if (isDangerousConsumerRepairProblem(text)) {
    return {
      ...genericDraft(),
      titleRu: "Заявка специалисту",
      summaryRu: CONSUMER_REPAIR_DANGEROUS_UI_COPY,
      dangerousDiyBlocked: true,
      safetyMessageRu: CONSUMER_REPAIR_DANGEROUS_UI_COPY,
    };
  }
  if (/ламинат/i.test(text)) return flooringDraft(text, "ламинат");
  if (/паркет|инженерн/i.test(text)) return flooringDraft(text, "паркет");
  if (/пол|плинтус|подложк/i.test(text)) return flooringDraft(text, "пол");
  if (/сантех|смесител|труб|протеч|кран/i.test(text)) return plumbingDraft();
  return genericDraft();
}

export function composeConsumerRepairDraftAnswerRu(draft: ConsumerRepairAiDraft): string {
  return [
    "Коротко:",
    draft.summaryRu,
    "",
    "Позиции:",
    ...draft.items.map((item, index) => `${index + 1}. ${item.titleRu} — ${item.quantity} ${item.unit}`),
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
