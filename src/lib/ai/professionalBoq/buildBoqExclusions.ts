import type { WorldConstructionPrimitive } from "../worldConstructionOntology";

export function buildBoqExclusions(primitive: WorldConstructionPrimitive): string[] {
  const base = [
    "Работы и материалы вне указанного объема не включены.",
    "Скрытые дефекты, усиление конструкций и аварийные работы считаются отдельно.",
    "Финальные цены требуют проверки поставщика и подрядчика.",
  ];
  if (primitive.workKey === "micro_hydro_preparation") {
    return [
      "ЛЭП, трансформатор, сетевое согласование и лицензии не включены.",
      "Гидротехнические сооружения и капитальная реконструкция водовода не включены.",
      ...base,
    ];
  }
  if (primitive.workKey === "roof_waterproofing") {
    return [
      "Капитальный ремонт несущих конструкций кровли не включен.",
      "Утепление, разуклонка и замена воронок включаются только после уточнения.",
      ...base,
    ];
  }
  return [...primitive.exclusions, ...base].slice(0, 8);
}
