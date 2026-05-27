import type { WorldConstructionOperation } from "./worldConstructionTypes";

export type ConstructionOperationRule = {
  operation: WorldConstructionOperation;
  keywords: readonly string[];
  labelRu: string;
};

export const CONSTRUCTION_OPERATION_RULES: readonly ConstructionOperationRule[] = [
  { operation: "waterproofing", labelRu: "гидроизоляция", keywords: ["гидроизоля", "waterproof"] },
  { operation: "installation", labelRu: "монтаж / установка", keywords: ["монтаж", "установ", "улож", "смонт", "install", "lay"] },
  { operation: "replacement", labelRu: "замена", keywords: ["замен", "replace"] },
  { operation: "repair", labelRu: "ремонт", keywords: ["ремонт", "repair"] },
  { operation: "masonry", labelRu: "кладка", keywords: ["кладк", "кирпич", "masonry", "brick"] },
  { operation: "paving", labelRu: "асфальтирование", keywords: ["асфальт", "paving", "asphalt"] },
  { operation: "drilling", labelRu: "бурение", keywords: ["бурен", "скважин", "drilling", "well"] },
  { operation: "demolition", labelRu: "демонтаж", keywords: ["демонтаж", "снос", "demolition"] },
  { operation: "painting", labelRu: "окраска", keywords: ["покрас", "краск", "paint"] },
  { operation: "tiling", labelRu: "плиточные работы", keywords: ["плитк", "кафель", "tile"] },
  { operation: "concrete_pour", labelRu: "бетонирование", keywords: ["бетон", "залив", "concrete"] },
  { operation: "commissioning", labelRu: "пусконаладка", keywords: ["пнр", "налад", "commission"] },
  { operation: "design_survey", labelRu: "обследование / проектирование", keywords: ["проект", "обслед", "расчет", "расчёт", "survey", "design"] },
  { operation: "preparation", labelRu: "подготовка основания", keywords: ["подготов", "основан", "preparation"] },
];

export function operationLabelRu(operation: WorldConstructionOperation): string {
  return CONSTRUCTION_OPERATION_RULES.find((rule) => rule.operation === operation)?.labelRu ?? "операция не уточнена";
}
