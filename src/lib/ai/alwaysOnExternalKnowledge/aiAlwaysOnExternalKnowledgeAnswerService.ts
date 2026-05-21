import {
  buildConstructionEstimateAnswer,
  composeConstructionEstimateAnswerRu,
  guardConstructionEstimateAnswerFirst,
  resolveAiQuestionKnowledgeMode,
  resolveConstructionWorkType,
} from "../estimateEngine";
import type { AiQuestionKnowledgeMode } from "../estimateEngine";
import { AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_POLICY } from "./aiAlwaysOnExternalKnowledgePolicy";
import type {
  AiAlwaysOnExternalKnowledgeAnswer,
  AiAlwaysOnExternalKnowledgeInput,
  AiRealAnswerMode,
} from "./aiAlwaysOnExternalKnowledgeTypes";

function modeToRealAnswerMode(mode: AiQuestionKnowledgeMode): AiRealAnswerMode {
  switch (mode) {
    case "public_construction_estimate":
      return "construction_estimate_table";
    case "public_material_calculation":
      return "material_consumption_table";
    case "public_supplier_search":
    case "public_market_price":
      return "supplier_market_search";
    case "accounting_reference":
    case "tax_reference":
    case "finance_reference":
      return "accounting_reference_answer";
    case "public_construction_technology":
      return "technology_checklist_answer";
    default:
      return "external_knowledge_answer";
  }
}

function composeTechnologyChecklist(questionRu: string): string {
  const workType = resolveConstructionWorkType(questionRu);
  if (workType !== "waterproofing") {
    return [
      "Коротко:",
      "Чек-лист сдачи работы готов. Это справка по качеству и документам, данные проекта не изменены.",
      "",
      "Чек-лист:",
      "1. Проверить объем и место работ по договору, заявке или заданию.",
      "2. Проверить качество поверхности, геометрию, дефекты и соответствие технологии.",
      "3. Снять фото до закрытия скрытых зон и фото после выполнения.",
      "4. Подготовить акт, замечания и список недоделок, если они есть.",
      "5. Передать работу на проверку ответственному прорабу или технадзору.",
      "",
      "Что уточнить:",
      "- точный вид работы и требования проекта;",
      "- какие фото обязательны;",
      "- кто принимает работу;",
      "- нужен ли акт скрытых работ.",
      "",
      "Источники:",
      "Показать",
      "",
      "Статус:",
      "Справочный чек-лист. Работа не закрыта автоматически.",
    ].join("\n");
  }

  return [
    "Коротко:",
    "Чек-лист приемки гидроизоляции готов. Это справка по технологии, данные проекта не изменены.",
    "",
    "Чек-лист:",
    "1. Проверить основание: чистое, сухое, без пыли, острых выступов и непрочных участков.",
    "2. Проверить грунтовку / праймер: материал нанесен равномерно и выдержано время высыхания.",
    "3. Проверить примыкания: углы, вводы труб, трапы, пороги и деформационные швы усилены лентой или манжетами.",
    "4. Проверить слой: нет разрывов, пропусков, вздутий, открытых нахлестов и механических повреждений.",
    "5. Проверить нахлесты и заходы на стены по проекту.",
    "6. Зафиксировать фото до закрытия слоя и оформить акт скрытых работ.",
    "",
    "Что уточнить:",
    "- тип гидроизоляции: обмазочная, рулонная или мембранная;",
    "- узлы примыканий и требуемая высота захода;",
    "- нужна ли проба водой;",
    "- кто подтверждает акт скрытых работ.",
    "",
    "Источники:",
    "Показать",
    "",
    "Статус:",
    "Справочный чек-лист. Требуется проверка прорабом или технадзором.",
  ].join("\n");
}

function composeSupplierOptions(questionRu: string): string {
  const material = /гкл|гипсокартон/i.test(questionRu) ? "ГКЛ 12.5 мм" : "материал";
  return [
    "Коротко:",
    `Подготовил варианты поиска поставщиков для позиции "${material}". Начните с внутренних поставщиков и marketplace, затем запросите КП у внешних продавцов.`,
    "",
    "Варианты:",
    `1. Внутренний marketplace / история закупок: проверить последние цены, сроки и поставщиков по "${material}".`,
    "2. Approved vendors: отправить запрос КП с количеством, адресом доставки и сроком.",
    "3. Внешний рынок: сравнить цену, наличие, доставку, условия оплаты и возврата.",
    "4. Аналоги: проверить совместимость по толщине, влагостойкости, бренду и сертификатам.",
    "",
    "Что запросить у поставщика:",
    "- цена за единицу и НДС/налоги;",
    "- наличие на складе;",
    "- срок доставки;",
    "- условия оплаты;",
    "- сертификаты и документы.",
    "",
    "Источники:",
    "Показать",
    "",
    "Статус:",
    "Рыночная справка. Заказ или оплата не создавались.",
  ].join("\n");
}

function composeAccountingReference(questionRu: string): string {
  if (/расхожд/i.test(questionRu)) {
    return [
      "Коротко:",
      "При расхождении на складе нужен документальный след: что ожидали, что приняли фактически, кто проверил и что решили дальше.",
      "",
      "Документы:",
      "1. Накладная или счет поставщика.",
      "2. Заказ / заявка / спецификация, с которой сравнивают поставку.",
      "3. Акт расхождения с фактическим количеством и фото.",
      "4. Фото или видео прихода, упаковки, маркировки и повреждений.",
      "5. Решение ответственного: принять частично, вернуть, запросить допоставку или корректировку документов.",
      "",
      "Что уточнить:",
      "- материал и единица измерения;",
      "- ожидалось и фактически принято;",
      "- поставщик и номер документа;",
      "- кто утверждает решение по расхождению.",
      "",
      "Источники:",
      "Показать",
      "",
      "Статус:",
      "Справка. Складские остатки и документы не изменены.",
    ].join("\n");
  }

  const isDocs = /документ|оплат/i.test(questionRu);
  if (isDocs) {
    return [
      "Коротко:",
      "Для безопасной оплаты нужен комплект первичных документов и подтверждение ответственного лица.",
      "",
      "Документы:",
      "1. Счет или инвойс с суммой, валютой, поставщиком и назначением.",
      "2. Договор или основание закупки / работ.",
      "3. Акт выполненных работ, накладная или другой документ приемки.",
      "4. Заявка, заказ или approval route, если оплата связана с закупкой.",
      "5. Реквизиты поставщика и подтверждение налогового статуса.",
      "",
      "Что уточнить:",
      "- страна учета: Кыргызстан;",
      "- вид операции: материалы, услуги, аванс или закрывающий платеж;",
      "- нужна ли проверка директора;",
      "- есть ли частичная оплата.",
      "",
      "Источники:",
      "Показать",
      "",
      "Статус:",
      "Справка для бухгалтера. Требуется профессиональная проверка, платеж не проводится.",
    ].join("\n");
  }

  return [
    "Коротко:",
    "Проводка зависит от типа счета, договора и учетной политики. Ниже справочный вариант для Кыргызстана, перед проведением нужна проверка бухгалтером.",
    "",
    "Проводка-справка:",
    "1. Если счет за материалы:",
    "   Дт Материалы / ТМЦ",
    "   Кт Расчеты с поставщиками",
    "",
    "2. Если это услуга или работа подрядчика:",
    "   Дт Затраты по объекту / работы",
    "   Кт Расчеты с подрядчиками",
    "",
    "3. При оплате поставщику:",
    "   Дт Расчеты с поставщиками",
    "   Кт Расчетный счет / касса",
    "",
    "Что уточнить:",
    "- страна учета: Кыргызстан;",
    "- это материал, услуга, аванс или закрывающий документ;",
    "- есть ли акт, накладная и договор;",
    "- счет учета по вашей учетной политике.",
    "",
    "Источники:",
    "Показать",
    "",
    "Статус:",
    "Справка. Требуется проверка бухгалтером, данные не изменены.",
  ].join("\n");
}

function buildEstimateAnswer(input: AiAlwaysOnExternalKnowledgeInput, mode: AiQuestionKnowledgeMode): AiAlwaysOnExternalKnowledgeAnswer {
  const estimate = buildConstructionEstimateAnswer(input.questionRu);
  const answerTextRu = composeConstructionEstimateAnswerRu(estimate);
  const guard = guardConstructionEstimateAnswerFirst(estimate, answerTextRu);
  return {
    handled: true,
    questionMode: mode,
    realAnswerMode: modeToRealAnswerMode(mode),
    answerTextRu,
    estimate,
    guard,
    sourceSummaryHiddenByDefault: true,
    externalKnowledgeAvailable: AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_POLICY.externalKnowledgeAvailableAllScreens,
  };
}

export function answerAlwaysOnExternalKnowledgeQuestion(
  input: AiAlwaysOnExternalKnowledgeInput,
): AiAlwaysOnExternalKnowledgeAnswer {
  const mode = resolveAiQuestionKnowledgeMode(input.questionRu);
  if (!mode) {
    return {
      handled: false,
      sourceSummaryHiddenByDefault: true,
      externalKnowledgeAvailable: AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_POLICY.externalKnowledgeAvailableAllScreens,
    };
  }

  if (mode === "public_construction_estimate" || mode === "public_material_calculation") {
    return buildEstimateAnswer(input, mode);
  }

  if (mode === "public_construction_technology") {
    const workType = resolveConstructionWorkType(input.questionRu);
    const answerTextRu = composeTechnologyChecklist(input.questionRu);
    return {
      handled: true,
      questionMode: mode,
      realAnswerMode: "technology_checklist_answer",
      answerTextRu,
      guard: {
        passed: workType === "waterproofing" || answerTextRu.includes("Чек-лист"),
      },
      sourceSummaryHiddenByDefault: true,
      externalKnowledgeAvailable: AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_POLICY.externalKnowledgeAvailableAllScreens,
    };
  }

  if (mode === "public_supplier_search" || mode === "public_market_price") {
    return {
      handled: true,
      questionMode: mode,
      realAnswerMode: "supplier_market_search",
      answerTextRu: composeSupplierOptions(input.questionRu),
      guard: { passed: true },
      sourceSummaryHiddenByDefault: true,
      externalKnowledgeAvailable: AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_POLICY.externalKnowledgeAvailableAllScreens,
    };
  }

  if (mode === "accounting_reference" || mode === "tax_reference" || mode === "finance_reference") {
    return {
      handled: true,
      questionMode: mode,
      realAnswerMode: "accounting_reference_answer",
      answerTextRu: composeAccountingReference(input.questionRu),
      guard: { passed: true },
      sourceSummaryHiddenByDefault: true,
      externalKnowledgeAvailable: AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_POLICY.externalKnowledgeAvailableAllScreens,
    };
  }

  return {
    handled: false,
    sourceSummaryHiddenByDefault: true,
    externalKnowledgeAvailable: AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_POLICY.externalKnowledgeAvailableAllScreens,
  };
}
