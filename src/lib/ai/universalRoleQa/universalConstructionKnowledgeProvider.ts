import type { ConstructionWorkType } from "./universalEntityExtractor";
import type { UniversalRoleQaFilters } from "./universalFilterExtractor";

export type UniversalConstructionKnowledgeDraft = {
  workType: ConstructionWorkType;
  titleRu: string;
  assumptionsRu: string[];
  workStepsRu: string[];
  materialsRu: string[];
  missingDataRu: string[];
  requiresReview: true;
};

const labels: Record<ConstructionWorkType, string> = {
  asphalt_paving: "асфальт",
  paving_blocks: "брусчатка",
  concrete_screed: "бетонная стяжка",
  concrete_foundation: "бетон/фундамент",
  masonry: "кладка",
  drywall_partitions: "ГКЛ перегородки",
  plastering: "штукатурка",
  painting: "покраска",
  flooring: "напольное покрытие",
  roofing: "кровля",
  facade: "фасад",
  windows_installation: "монтаж окон",
  doors_installation: "монтаж дверей",
  electrical: "электрика",
  plumbing: "сантехника",
  heating: "отопление",
  ventilation: "вентиляция",
  fire_safety: "пожарная безопасность",
  low_voltage: "слаботочные сети",
  earthworks: "земляные работы",
  roadworks: "дорожные работы",
  landscaping: "благоустройство",
  metal_structures: "металлоконструкции",
  waterproofing: "гидроизоляция",
  insulation: "утепление",
  tiles: "плитка",
  ceiling: "потолок",
  demolition: "демонтаж",
  unknown: "строительные работы",
};

export function getUniversalConstructionKnowledgeDraft(
  filters: UniversalRoleQaFilters,
): UniversalConstructionKnowledgeDraft {
  const workType = filters.workType?.key ?? "unknown";
  const quantity = filters.quantity ? `${filters.quantity.value} ${filters.quantity.unit}` : "объем не указан";
  const titleRu = `${labels[workType]}: черновой расчет (${quantity})`;

  if (workType === "asphalt_paving") {
    return {
      workType,
      titleRu,
      assumptionsRu: [`площадь: ${quantity}`, "толщина слоя не указана", "основание и регион цен не указаны"],
      workStepsRu: ["подготовка основания", "планировка и уплотнение", "битумная эмульсия при необходимости", "доставка смеси", "укладка асфальта", "уплотнение катком"],
      materialsRu: ["асфальтобетонная смесь", "щебень при необходимости", "битумная эмульсия", "техника", "доставка", "рабочие"],
      missingDataRu: ["толщина слоя", "состояние основания", "марка асфальта", "город", "доставка и техника"],
      requiresReview: true,
    };
  }

  return {
    workType,
    titleRu,
    assumptionsRu: [`объем: ${quantity}`, "проектная спецификация не передана", "цены нужно уточнить"],
    workStepsRu: ["проверка проекта", "подготовка основания/зоны", "закупка материалов", "выполнение работ", "контроль качества", "актирование"],
    materialsRu: [labels[workType], "расходные материалы", "доставка", "работы", "инструмент/техника при необходимости"],
    missingDataRu: ["проектные размеры", "марка материалов", "город/цены", "условия производства работ"],
    requiresReview: true,
  };
}
