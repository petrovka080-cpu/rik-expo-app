import { resolveEstimateReferencePrice } from "./estimatePriceResolver";
import {
  calculateAsphaltDerivedQuantities,
  calculateFlooringDerivedQuantities,
  calculatePlasterDerivedQuantities,
  defaultAreaForWorkType,
  extractEstimateArea,
} from "./estimateQuantityCalculator";
import { getConstructionWorkTypeLabelRu, resolveConstructionWorkType } from "./constructionWorkTypeResolver";
import type { ConstructionEstimateAnswer, ConstructionEstimateLine, ConstructionWorkType } from "./estimateTypes";

function line(nameRu: string, quantity: number, unit: string, priceItemId: string): ConstructionEstimateLine {
  const price = resolveEstimateReferencePrice(priceItemId);
  const total = Math.round(quantity * price.unitPrice);
  return {
    nameRu,
    quantity,
    unit,
    unitPrice: price.unitPrice,
    total,
    source: "reference_price_book",
  };
}

function manualLine(nameRu: string, quantity: number, unit: string, total: number): ConstructionEstimateLine {
  return {
    nameRu,
    quantity,
    unit,
    total,
    source: "manual",
  };
}

function sum(lines: ConstructionEstimateLine[]): number {
  return lines.reduce((total, item) => total + (item.total ?? 0), 0);
}

function buildFlooringEstimate(questionRu: string, workType: ConstructionWorkType, areaValue: number): ConstructionEstimateAnswer {
  const q = calculateFlooringDerivedQuantities(areaValue);
  const coveringPriceId = workType === "laminate_flooring"
    ? "flooring.covering.laminate"
    : "flooring.covering.parquet_laminate";
  const coveringName = workType === "laminate_flooring" ? "Ламинат" : "Паркет / ламинат";
  const materials = [
    line(coveringName, q.coveringM2, "м²", coveringPriceId),
    line("Подложка", q.underlayM2, "м²", "flooring.underlay"),
    line("Плинтус", q.plinthM, "пог. м", "flooring.plinth"),
    line("Пороги / стыки", q.thresholdsPcs, "шт", "flooring.threshold"),
    line("Расходники", 1, "комплект", "flooring.consumables"),
  ];
  const works = [
    line("Подготовка основания", q.workM2, "м²", "flooring.work.prep"),
    line("Укладка покрытия", q.workM2, "м²", "flooring.work.install"),
    line("Монтаж плинтуса", q.plinthM, "пог. м", "flooring.work.plinth_install"),
    line("Установка порогов", q.thresholdsPcs, "шт", "flooring.work.threshold_install"),
    line("Уборка после работ", 1, "комплект", "flooring.work.cleanup"),
  ];
  const delivery = resolveEstimateReferencePrice("flooring.delivery_lift").unitPrice;
  const materialsTotal = sum(materials);
  const worksTotal = sum(works);
  return {
    questionRu,
    workType,
    area: { value: areaValue, unit: "m2" },
    currency: "KGS",
    assumptions: [
      "запас покрытия 10%",
      "подложка заложена с небольшим запасом",
      "плинтус рассчитан ориентировочно как 0.8 пог. м на 1 м² площади",
      "цены являются ориентиром из reference price book и требуют проверки перед закупкой",
    ],
    materials,
    works,
    totals: {
      materialsTotal,
      worksTotal,
      deliveryTotal: delivery,
      grandTotal: materialsTotal + worksTotal + delivery,
      formulaRu: `${materialsTotal} + ${worksTotal} + ${delivery}`,
    },
    missingInputs: [
      "точный тип покрытия: паркет, ламинат или инженерная доска",
      "нужна ли подготовка основания",
      "нужен ли демонтаж старого покрытия",
      "город, доставка и подъем",
    ],
    sourceDisclosure: {
      appDataUsed: false,
      externalSourcesUsed: true,
      referencePriceBookUsed: true,
      checkedAt: resolveEstimateReferencePrice(coveringPriceId).checkedAt,
    },
    answerStartsWithResult: true,
  };
}

function buildAsphaltEstimate(questionRu: string, areaValue: number): ConstructionEstimateAnswer {
  const q = calculateAsphaltDerivedQuantities(areaValue);
  const materials = [
    line("Асфальтобетонная смесь с укладкой", q.asphaltM2, "м²", "asphalt.mix_and_laying"),
    manualLine("Битумная эмульсия / праймер", q.bitumenPrimerSet, "комплект", 12000),
  ];
  const works = [
    line("Подготовка основания", q.basePrepM2, "м²", "asphalt.base_prep"),
    manualLine("Доставка техники и смеси", q.deliverySet, "комплект", 15000),
  ];
  const materialsTotal = sum(materials);
  const worksTotal = sum(works);
  return {
    questionRu,
    workType: "asphalt_paving",
    area: { value: areaValue, unit: "m2" },
    currency: "KGS",
    assumptions: [
      "расчет ориентировочный для площади без сложной геометрии",
      "толщина слоя и основание должны быть подтверждены проектом",
      "цены являются черновым ориентиром",
    ],
    materials,
    works,
    totals: {
      materialsTotal,
      worksTotal,
      grandTotal: materialsTotal + worksTotal,
      formulaRu: `${materialsTotal} + ${worksTotal}`,
    },
    missingInputs: ["толщина слоя", "состояние основания", "марка смеси", "доступ техники", "город и логистика"],
    sourceDisclosure: {
      appDataUsed: false,
      externalSourcesUsed: true,
      referencePriceBookUsed: true,
      checkedAt: resolveEstimateReferencePrice("asphalt.mix_and_laying").checkedAt,
    },
    answerStartsWithResult: true,
  };
}

function buildPlasterEstimate(questionRu: string, areaValue: number): ConstructionEstimateAnswer {
  const q = calculatePlasterDerivedQuantities(areaValue);
  const materials = [
    line("Штукатурная смесь", q.plasterKg, "кг", "plaster.mix"),
    manualLine("Грунтовка", q.primerSet, "комплект", q.primerSet * 5000),
    manualLine("Маяки", q.beaconsM, "пог. м", Math.round(q.beaconsM * 60)),
    manualLine("Уголки", q.cornerBeadsM, "пог. м", Math.round(q.cornerBeadsM * 80)),
  ];
  const works = [
    line("Штукатурные работы", q.workM2, "м²", "plaster.work"),
  ];
  const materialsTotal = sum(materials);
  const worksTotal = sum(works);
  return {
    questionRu,
    workType: "plastering",
    area: { value: areaValue, unit: "m2" },
    currency: "KGS",
    assumptions: [
      "расход смеси взят ориентировочно 16 кг/м²",
      "толщина слоя и тип смеси должны быть уточнены на объекте",
      "цены являются ориентиром из reference price book",
    ],
    materials,
    works,
    totals: {
      materialsTotal,
      worksTotal,
      grandTotal: materialsTotal + worksTotal,
      formulaRu: `${materialsTotal} + ${worksTotal}`,
    },
    missingInputs: ["толщина слоя", "тип основания", "тип смеси", "требование к качеству поверхности"],
    sourceDisclosure: {
      appDataUsed: false,
      externalSourcesUsed: true,
      referencePriceBookUsed: true,
      checkedAt: resolveEstimateReferencePrice("plaster.mix").checkedAt,
    },
    answerStartsWithResult: true,
  };
}

export function buildConstructionEstimateAnswer(questionRu: string): ConstructionEstimateAnswer {
  const workType = resolveConstructionWorkType(questionRu);
  const area = extractEstimateArea(questionRu)?.value ?? defaultAreaForWorkType(workType);

  if (workType === "asphalt_paving") return buildAsphaltEstimate(questionRu, area);
  if (workType === "plastering") return buildPlasterEstimate(questionRu, area);
  return buildFlooringEstimate(
    questionRu,
    workType === "laminate_flooring" ? "laminate_flooring" : workType === "engineered_flooring" ? "engineered_flooring" : "parquet_flooring",
    area,
  );
}

function money(value?: number, currency = "KGS"): string {
  if (value === undefined) return "по цене после проверки";
  return `${Math.round(value).toLocaleString("ru-RU")} ${currency}`;
}

function price(value?: number, currency = "KGS", unit?: string): string {
  if (value === undefined) return "уточнить";
  return `${Math.round(value).toLocaleString("ru-RU")} ${currency}${unit ? ` / ${unit}` : ""}`;
}

function formatLines(lines: ConstructionEstimateLine[], currency: string): string {
  return lines.map((item, index) => [
    `${index + 1}. ${item.nameRu}`,
    `   Количество: ${item.quantity.toLocaleString("ru-RU")} ${item.unit}`,
    item.unitPrice !== undefined ? `   Цена: ${price(item.unitPrice, currency, item.unit)}` : null,
    `   Итого: ${money(item.total, currency)}`,
  ].filter(Boolean).join("\n")).join("\n\n");
}

export function composeConstructionEstimateAnswerRu(answer: ConstructionEstimateAnswer): string {
  const workLabel = getConstructionWorkTypeLabelRu(answer.workType);
  const areaLabel = answer.area ? `${answer.area.value.toLocaleString("ru-RU")} м²` : "указанный объем";
  const isConsumption = answer.workType === "plastering" && /расход/i.test(answer.questionRu);
  return [
    "Коротко:",
    isConsumption
      ? `Расчет расхода для работы "${workLabel}" на ${areaLabel} готов. Ниже объемы материалов, работы и ориентировочная сумма.`
      : `Смета на ${workLabel} на ${areaLabel} готова. Заложены черновые нормы и ориентировочные цены в ${answer.currency}.`,
    "",
    isConsumption ? "Расчет:" : "Смета:",
    "",
    "Материалы:",
    formatLines(answer.materials, answer.currency),
    "",
    "Работы:",
    formatLines(answer.works, answer.currency),
    "",
    "Итого:",
    answer.totals.materialsTotal !== undefined ? `Материалы: ${money(answer.totals.materialsTotal, answer.currency)}` : null,
    answer.totals.worksTotal !== undefined ? `Работы: ${money(answer.totals.worksTotal, answer.currency)}` : null,
    answer.totals.deliveryTotal !== undefined ? `Доставка / подъем: ${money(answer.totals.deliveryTotal, answer.currency)}` : null,
    answer.totals.grandTotal !== undefined ? `Общий ориентир: ${money(answer.totals.grandTotal, answer.currency)}` : null,
    answer.totals.formulaRu ? `Формула: ${answer.totals.formulaRu}` : null,
    "",
    "Что уточнить:",
    ...answer.missingInputs.map((item) => `- ${item}`),
    "",
    "Источники:",
    "Показать",
    "",
    "Статус:",
    "Черновая смета. Данные проекта не изменены, цены нужно проверить перед закупкой или договором.",
  ].filter((line): line is string => line !== null).join("\n");
}
