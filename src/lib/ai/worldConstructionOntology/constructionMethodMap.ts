import type { WorldConstructionMethod } from "./worldConstructionTypes";

export type ConstructionMethodRule = {
  method: WorldConstructionMethod;
  keywords: readonly string[];
  labelRu: string;
};

export const CONSTRUCTION_METHOD_RULES: readonly ConstructionMethodRule[] = [
  { method: "roll_membrane", labelRu: "рулонная гидроизоляция", keywords: ["рулон", "наплав", "roll membrane"] },
  { method: "pvc_tpo_epdm_membrane", labelRu: "ПВХ/ТПО/ЭПДМ мембрана", keywords: ["пвх", "тпо", "эпдм", "мембран", "pvc", "tpo", "epdm"] },
  { method: "bitumen_mastic", labelRu: "мастичная гидроизоляция", keywords: ["мастик", "битум", "mastic", "bitumen"] },
  { method: "laminate_floating", labelRu: "плавающая укладка ламината", keywords: ["ламинат", "floating laminate"] },
  { method: "brick_mortar_masonry", labelRu: "кирпичная кладка на растворе", keywords: ["кирпич", "раствор", "brick", "mortar"] },
  { method: "gable_roof_frame", labelRu: "двускатная стропильная система", keywords: ["двускат", "стропил", "gable"] },
  { method: "drywall_metal_frame", labelRu: "ГКЛ по металлическому каркасу", keywords: ["гкл", "гипсокартон", "профиль", "drywall"] },
  { method: "asphalt_hot_mix", labelRu: "горячий асфальтобетон", keywords: ["асфальт", "asphalt"] },
  { method: "hydro_turbine_equipment_install", labelRu: "монтаж гидроагрегата", keywords: ["турбин", "гэс", "hydro", "turbine"] },
  { method: "rotary_well_drilling", labelRu: "бурение скважины", keywords: ["бурен", "скважин", "well"] },
  { method: "duct_ventilation", labelRu: "монтаж воздуховодов", keywords: ["вентиляц", "воздуховод", "duct"] },
  { method: "solar_mounting", labelRu: "монтаж солнечных панелей", keywords: ["солнеч", "solar"] },
  { method: "electrical_cable_install", labelRu: "кабельный электромонтаж", keywords: ["кабель", "электр", "щит", "cable"] },
];

export function methodLabelRu(method: WorldConstructionMethod): string {
  return CONSTRUCTION_METHOD_RULES.find((rule) => rule.method === method)?.labelRu ?? "профессиональная технология";
}
